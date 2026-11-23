import assert from 'node:assert/strict';
import { GUIDE_VIDEO_DIR, mediaUrl, sha256, type VideoSpec } from './guide-video.ts';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { cp, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
export const mp4 = Buffer.from('fake mp4 bytes');

/**
 * A 1080p master is either in the media release (its URL) or lost before the Mac was handed over:
 * then the pin (file, sha256, size) stays, the URL goes and `lost` says why.
 */
export const assertMasterPin = (master: object): void => {
  const field = (key: string): unknown =>
    Object.hasOwn(master, key) ? Reflect.get(master, key) : undefined;
  const [file, sha, url, lost] = ['file', 'sha256', 'url', 'lost'].map(field);
  assert.ok(typeof file === 'string' && typeof sha === 'string', 'master pin: file and sha256');
  if (url === undefined) assert.match(String(lost), /^утерян до сдачи Mac/u, file);
  else {
    assert.equal(url, mediaUrl(file, sha), file);
    assert.equal(lost, undefined, file);
  }
};

/** A throwaway repo root with the tracked video files and a built block-0a page. */
export const fixture = async (withVideo: boolean) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  await writeFile(
    join(root, GUIDE_VIDEO_DIR, 'video-manifest.json'),
    JSON.stringify({
      file: 'block-0a.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: 'https://media.example.invalid/block-0a.mp4',
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-0a.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/p2-git.html'), page);
  return { root, out, page };
};

const chapterButton = () =>
  Object.assign(new EventTarget(), {
    setAttribute: () => undefined,
    removeAttribute: () => undefined,
  });

const chapterData = (slot?: string, sectionId?: string) => ({
  dataset: {
    steps: '1',
    file: 'test.mp4',
    goal: 'Смотреть тестовый ролик',
    ...(slot ? { slot, id: sectionId ?? slot } : {}),
  },
  textContent: JSON.stringify([
    { n: 1, title: 'Тестовый шаг', step: 1, pageStep: 1, start: 0, speechStart: 1, end: 5 },
  ]),
});

const mountPlayer = (source: string, document: EventTarget, location: URL) => {
  class LinkChild {
    href: string;
    constructor(href: string) {
      this.href = new URL(href, location).href;
    }
    closest(selector: string) {
      return selector === 'a[href]'
        ? { href: this.href, target: '', hasAttribute: () => false }
        : null;
    }
  }
  const clickLink = (href: string) => {
    const event = Object.assign(new Event('click', { bubbles: true }), { button: 0 });
    Object.defineProperty(event, 'target', { value: new LinkChild(href) });
    document.dispatchEvent(event);
  };
  runInNewContext(
    source,
    {
      document,
      Node: { DOCUMENT_POSITION_FOLLOWING: 4 },
      location,
      Element: LinkChild,
      window: new EventTarget(),
      URL,
      matchMedia: () => ({ matches: false }),
    },
    { timeout: 1000 },
  );
  return clickLink;
};

const createVideoStub = () =>
  Object.assign(new EventTarget(), {
    currentTime: 0,
    src: '',
    paused: true,
    play() {
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
  });

/** `above` is the tag of the heading that precedes the slot in the page, e.g. `H2`. */
export const playerFixture = (
  source: string,
  slot?: string,
  hash = '',
  sectionId?: string,
  above?: string,
) => {
  const links: { position: string; html: string }[] = [];
  const controls: { innerHTML: string }[] = [];
  const scrolls: { block: string }[] = [];
  const watch = new EventTarget();
  const again = Object.assign(new EventTarget(), { hidden: true });
  const row = {
    className: '',
    innerHTML: '',
    querySelector: (selector: string) =>
      selector === '[data-watch]' ? watch : selector === '[data-again]' ? again : null,
  };
  const video = createVideoStub();
  const goalFold = Object.assign(new EventTarget(), { open: false });
  const disclosure = Object.assign(new EventTarget(), { open: false });
  const elements: Record<string, unknown> = {
    video,
    ...(!slot && { '.lesson-video__disclosure': disclosure }),
  };
  const section = {
    closest: (selector: string) => (!slot && selector === 'details.lesson-goal' ? goalFold : null),
    id: '',
    className: '',
    innerHTML: '',
    hidden: false,
    setAttribute: () => undefined,
    querySelector: (selector: string) => elements[selector],
    querySelectorAll: () => [chapterButton()],
    scrollIntoView: (options: { block: string }) => scrolls.push(options),
  };
  const sections: (typeof section)[] = [];
  const heading = { after: (node: typeof row) => controls.push(node) };
  const step = { id: 'test-step', querySelector: () => heading };
  const goalSections: (typeof section)[] = [];
  const extraSections: (typeof section)[] = [];
  const anchor = { closest: () => ({ before: (node: typeof section) => sections.push(node) }) };
  const data = chapterData(slot, sectionId);
  const location = new URL(hash, 'file:///course/guides/p2-git.html');
  const document = Object.assign(new EventTarget(), {
    baseURI: location.href,
    createElement: (tag: string) => {
      if (tag === 'section') return section;
      if (tag === 'div') return row;
      throw new Error(`Unexpected player element: ${tag}`);
    },
    getElementById: (id: string) =>
      id === slot
        ? { querySelector: () => ({ after: (node: typeof section) => extraSections.push(node) }) }
        : id === 'work-steps'
          ? anchor
          : null,
    querySelector: (selector: string) =>
      selector === '.lesson-goal'
        ? { append: (node: typeof section) => goalSections.push(node) }
        : selector === '.lesson-goal__links'
          ? {
              insertAdjacentHTML: (position: string, html: string) =>
                links.push({ position, html }),
            }
          : null,
    querySelectorAll: (selector: string) => {
      if (selector === 'script[id^="guide-video-chapters"]') return [data];
      if (selector === '#work-steps .step-list > li') return [step];
      if (selector === 'h1, h2, h3, h4, h5, h6')
        return above ? [{ tagName: above, compareDocumentPosition: () => 4 }] : [];
      throw new Error(`Unexpected player selector: ${selector}`);
    },
  });
  return {
    clickLink: mountPlayer(source, document, location),
    sections,
    goalSections,
    extraSections,
    controls,
    links,
    scrolls,
    video,
    watch,
    disclosure,
    goalFold,
  };
};

/** A throwaway root holding the tracked files of one film (manifest, captions, chapters) and its fake mp4. */
export const placeFilm = async (
  root: string,
  spec: VideoSpec,
  file: string,
  bytes: Buffer,
  audio?: string,
) => {
  for (const path of [spec.manifest, spec.vtt, spec.chapters])
    await mkdir(dirname(join(root, path)), { recursive: true });
  await mkdir(join(root, GUIDE_VIDEO_DIR), { recursive: true });
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4') && !path.endsWith('video-manifest.json'),
  });
  await writeFile(
    join(root, spec.manifest),
    JSON.stringify({
      file,
      sha256: sha256(bytes),
      size: bytes.length,
      url: 'https://media.example.invalid/x',
      ...(audio === undefined ? {} : { audio }),
    }),
  );
  await writeFile(join(root, spec.vtt), 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nТекст ролика.\n');
  await writeFile(join(root, spec.chapters), '[]');
  await writeFile(join(root, GUIDE_VIDEO_DIR, file), bytes);
};
