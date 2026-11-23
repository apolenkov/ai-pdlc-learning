import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (name: string): Promise<string> =>
  readFile(new URL(`../docs/pages/sdlc-development/${name}`, import.meta.url), 'utf8');
const [deck, reference, guide, metarepository, cue, mapRhythm] = await Promise.all([
  read('analytics-process-sdd.html'),
  read('help-reference.css'),
  read('guides/guide.css'),
  read('guides/metarepository.css'),
  read('guides/learning-enhancements/07-model-cue-and-learning-path.css'),
  read('guides/learning-enhancements/08-course-map-and-rhythm.css'),
]);
const rule = (source: string, selector: string): string =>
  source.match(new RegExp(`^\\s*${selector.replace(/[.*]/gu, '\\$&')} \\{([^}]*)\\}`, 'mu'))?.[1] ??
  '';

/** A declaration that lets a word lose letters at the line end. */
const BREAKS_WORD = /(?:overflow-wrap|word-break)\s*:\s*(?:anywhere|break-word|break-all)\b/u;
/** A heading rule: the selector names h1 or h2 as a whole level, not a class such as `.h1-legacy`. */
const HEADING_SELECTOR = /(?:^|[\s,>+~(])h[12](?=[\s,.:>+~)]|$)/u;
/** A container whose `overflow-wrap: anywhere` every heading inside it inherits unless its own rule says `normal`:
 * the LAST compound of a selector is html, body, main or .meta-content (classes and pseudo-classes allowed on it). */
const CONTAINER_LAST = /^(?:(?:html|body|main)(?:[.:#[][^\s]*)?|\.meta-content(?:[:[][^\s]*)?)$/u;
const isContainer = (selector: string): boolean =>
  selector.split(',').some((part) =>
    CONTAINER_LAST.test(
      part
        .trim()
        .split(/[\s>+~]+/u)
        .pop() ?? '',
    ),
  );
const KEEPS_WORD = /overflow-wrap\s*:\s*normal\b/u;
const pagesRoot = new URL('../docs/pages/sdlc-development/', import.meta.url);

async function pageStyles(): Promise<{ file: string; css: string }[]> {
  const files: { file: string; css: string }[] = [];
  const walk = async (dir: URL): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
      if (entry.isDirectory()) {
        await walk(url);
        continue;
      }
      const file = decodeURIComponent(url.pathname);
      if (entry.name.endsWith('.css')) files.push({ file, css: await readFile(url, 'utf8') });
      if (entry.name.endsWith('.html')) {
        const html = await readFile(url, 'utf8');
        for (const [, css = ''] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/giu)) {
          files.push({ file, css });
        }
      }
    }
  };
  await walk(pagesRoot);
  return files;
}

await test('long words in deck cards wrap inside the card instead of crossing its border', () => {
  for (const selector of ['.file-tile code', '.level-actions span', '.local-flow .card-copy'])
    assert.match(rule(deck, selector), /overflow-wrap: anywhere/u, selector);
  assert.match(
    deck,
    /@media \(max-width: 1023px\) \{[^@]*?\.local-flow \.stage \{ padding-inline: var\(--space-2\); \}/u,
    'the seven-stage strip gives its cards room on a tablet',
  );
});

await test('the roles page stacks its team cards on a phone and keeps its heading words whole', () => {
  assert.match(rule(reference, '.reference-team-grid > div'), /overflow-wrap: anywhere/u);
  const h1 = rule(reference, '.reference-intro h1');
  assert.match(h1, /overflow-wrap: normal/u, 'the page heading never splits a word');
  assert.match(h1, /hyphens: manual/u);
  const phone = reference.match(/@media \(max-width: 719px\) \{([\s\S]*?)\n\}/u)?.[1] ?? '';
  assert.match(
    phone,
    /\.reference-panel \.reference-team-grid \{ grid-template-columns: minmax\(0, 1fr\)/u,
    'the base grid is declared after the phone block, so the phone rule needs the higher specificity',
  );
  assert.match(
    phone,
    /\.reference-intro h1 \{ font-size: clamp\(2rem, 8\.8vw, 2\.5rem\); \}/u,
    'the phone size keeps the longest word of the roles heading on one line',
  );
});

await test('the stylesheet for the retired scales page is absent from the source tree', async () => {
  await assert.rejects(
    access(new URL('../docs/pages/sdlc-development/environment.css', import.meta.url)),
    { code: 'ENOENT' },
    'environment.css went with the section; its scale levels no longer exist',
  );
});

await test('course and guide headings keep a word whole, cards and cells may wrap it', () => {
  const guidePhone = guide.match(/@media \(max-width: 760px\) \{([\s\S]*?)\n\}/u)?.[1] ?? '';
  assert.match(
    guidePhone,
    /\.hero h1 \{[^}]*overflow-wrap: normal/u,
    'the guide heading on a phone',
  );
  assert.match(guidePhone, /\.hero h1 \{[^}]*hyphens: manual/u, 'the guide heading on a phone');
  for (const [source, selector] of [
    [guide, '.route-card h2'],
    [guide, '.route-outcome h2'],
    [metarepository, '.meta-content h1, .meta-content h2'],
  ] as const) {
    const body = rule(source, selector);
    assert.match(body, /overflow-wrap: normal/u, selector);
    assert.match(body, /hyphens: manual/u, selector);
  }
  assert.match(rule(guide, '.route-card p'), /overflow-wrap: anywhere/u, 'card copy still wraps');
});

await test('no h1/h2 rule in page styles makes a heading break a word', async () => {
  const offenders: string[] = [];
  for (const { file, css } of await pageStyles()) {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//gu, '');
    for (const [, selector = '', body = ''] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
      if (!HEADING_SELECTOR.test(selector)) continue;
      if (BREAKS_WORD.test(body)) offenders.push(`${file}: ${selector.trim()}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'headings keep words whole; anywhere/break-word stays for cards and cells',
  );
});

await test('a container that lets words break gives h1 and h2 their own overflow-wrap: normal (confluence-page, meta-content)', async () => {
  const offenders: string[] = [];
  for (const { file, css } of await pageStyles()) {
    const rules = [...css.replace(/\/\*[\s\S]*?\*\//gu, '').matchAll(/([^{}]+)\{([^{}]*)\}/gu)];
    const breaksInContainer = rules.some(
      ([, selector = '', body = '']) => isContainer(selector) && BREAKS_WORD.test(body),
    );
    if (!breaksInContainer) continue;
    for (const level of ['h1', 'h2']) {
      const kept = rules.some(
        ([, selector = '', body = '']) =>
          new RegExp(`(?:^|[\\s,>+~(])${level}(?=[\\s,.:>+~)]|$)`, 'u').test(selector) &&
          KEEPS_WORD.test(body),
      );
      if (!kept) offenders.push(`${file}: ${level} inherits a word-breaking container`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'a heading inside a breaking container needs its own overflow-wrap: normal rule',
  );
});

await test('route card links keep whole words and the chip row keeps a gap to the result line', () => {
  assert.match(
    rule(guide, '.route-open'),
    /overflow-wrap: normal/u,
    'the card link label wraps at spaces, not inside a word',
  );
  assert.match(
    guide,
    /\.route-open > span:first-child \{ min-width: 0; \}/u,
    'the label column may shrink so the arrow stays inside the card',
  );
  assert.match(
    guide,
    /\.route-open > span:last-child \{ flex: none; white-space: nowrap; \}/u,
    'the arrow never wraps away from the label',
  );
  const narrow =
    guide.match(/@media \(min-width: 761px\) and \(max-width: 900px\) \{([\s\S]*?)\n\}/u)?.[1] ??
    '';
  assert.match(
    narrow,
    /\.route-intro \.route-open \{ font-size: \.76rem; \}/u,
    'the longest label word fits three-column preparation cards',
  );
  assert.match(
    cue,
    /@media\(min-width:761px\) and \(max-width:900px\)\{\.route-intro \.route-card h3\{font-size:1\.05rem\}\}/u,
    'the preparation card heading keeps «Мета‑репозиторий» inside the narrow card',
  );
  assert.match(
    mapRhythm,
    /\.course-map__step>\.course-map__body:only-child\{grid-column:1\/-1\}/u,
    'a map card without a marker spans both grid columns',
  );
  const guidePhone = guide.match(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/u)?.[1] ?? '';
  assert.match(
    guidePhone,
    /\.route-tools \+ p \{[^}]*margin-top:/u,
    'the wrapped chip row keeps a gap to the «Результат:» line',
  );
  assert.match(
    metarepository,
    /@media \(max-width: 480px\) \{\s*\/\*[\s\S]*?\*\/\s*\.meta-content h1 \{ font-size: clamp\(1\.25rem, 6\.6vw, 1\.6rem\); \}/u,
    'the metarepository h1 keeps «Мета‑репозиторий» whole next to the page tools down to 320 px',
  );
});

await test('metarepository: the short repository name stays intact without changing its spelling', async () => {
  assert.match(metarepository, /\.meta-content \.meta-token \{ white-space: nowrap; \}/u);
  assert.match(
    await read('guides/metarepository.md'),
    /<h3 class="meta-token">meta-repo<\/h3>/u,
    'the diagram heading carries the nowrap token as well as the prose insertions',
  );
  for (const file of ['guides/metarepository.md', 'guides/metarepository/01-steps.md']) {
    const markdown = await read(file);
    assert.match(markdown, /<code class="meta-token">meta-repo<\/code>/u);
    assert.doesNotMatch(markdown, /`meta-repo`/u);
  }
});

await test('course map heading links override arbitrary word wrapping', () => {
  const heading = mapRhythm.match(/\.course-map__body h4 a\{([^}]+)\}/u)?.[1] ?? '';
  assert.match(heading, /overflow-wrap:\s*normal/u);
  assert.doesNotMatch(heading, BREAKS_WORD);
});
