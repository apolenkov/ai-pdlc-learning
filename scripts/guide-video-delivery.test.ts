import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import {
  addGuideVideo,
  BLOCK_DELIVERY,
  GUIDE_VIDEO_DIR,
  mediaUrl,
  sha256,
  BLOCK_R3,
} from './guide-video.ts';
import { guideContent } from './guide-content.ts';
import { mp4, assertMasterPin } from './guide-video-test-support.ts';

/** The Delivery film: tracked manifest, captions, chapters and poster under video/block-delivery/, mp4 under the shared video dir. */
const deliveryFixture = async (withVideo: boolean) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-delivery-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  await mkdir(join(root, 'video/block-delivery'), { recursive: true });
  for (const file of [
    'block-delivery.vtt',
    'block-delivery.chapters.json',
    'block-delivery-poster.jpg',
  ]) {
    await cp(resolve('video/block-delivery', file), join(root, 'video/block-delivery', file));
  }
  await writeFile(
    join(root, BLOCK_DELIVERY.manifest),
    JSON.stringify({
      file: 'block-delivery-720p.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: mediaUrl('block-delivery-720p.mp4', sha256(mp4)),
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-delivery-720p.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/d1-delivery.html'), page);
  return { root, out, page };
};

await test('Delivery film: without the mp4 its page is untouched', async (t) => {
  const { root, out, page } = await deliveryFixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_DELIVERY), false);
  assert.equal(await readFile(join(out, 'guides/d1-delivery.html'), 'utf8'), page);
});

await test('Delivery film: the player gets its file, captions, poster and part mode', async (t) => {
  const { root, out } = await deliveryFixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_DELIVERY), true);
  const html = await readFile(join(out, 'guides/d1-delivery.html'), 'utf8');
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-delivery-720p\.mp4" data-vtt="block-delivery\.vtt" data-aria="[^"]+" data-steps="0" data-poster="block-delivery-poster\.jpg">\[\{"n":0,/u,
  );
  for (const name of [
    'block-delivery-720p.mp4',
    'block-delivery.vtt',
    'block-delivery-poster.jpg',
    'guide-video.css',
    'guide-video.js',
  ]) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
});

await test('Delivery film manifest matches its release assets, subtitles, chapters and poster', async () => {
  const dir = resolve(import.meta.dirname, '../video/block-delivery');
  const manifest: unknown = JSON.parse(await readFile(resolve(dir, 'video-manifest.json'), 'utf8'));
  assert.ok(manifest !== null && typeof manifest === 'object');
  assert.ok('file' in manifest && typeof manifest.file === 'string');
  assert.ok('sha256' in manifest && typeof manifest.sha256 === 'string');
  assert.ok('size' in manifest && typeof manifest.size === 'number');
  assert.ok('url' in manifest && typeof manifest.url === 'string');
  assert.ok('version' in manifest && typeof manifest.version === 'string');
  assert.ok('duration' in manifest && typeof manifest.duration === 'number');
  assert.ok(
    'master' in manifest &&
      manifest.master !== null &&
      typeof manifest.master === 'object' &&
      'file' in manifest.master &&
      typeof manifest.master.file === 'string' &&
      'sha256' in manifest.master &&
      typeof manifest.master.sha256 === 'string' &&
      'size' in manifest.master &&
      typeof manifest.master.size === 'number',
  );
  assert.match(manifest.sha256, /^[0-9a-f]{64}$/u);
  assert.match(manifest.master.sha256, /^[0-9a-f]{64}$/u);
  assert.ok(manifest.sha256.startsWith(manifest.version));
  assert.equal(manifest.url, mediaUrl(manifest.file, manifest.sha256));
  assertMasterPin(manifest.master);
  const chapters: unknown = JSON.parse(
    await readFile(resolve(dir, 'block-delivery.chapters.json'), 'utf8'),
  );
  assert.ok(Array.isArray(chapters));
  assert.ok(
    chapters.every(
      (chapter: unknown): chapter is { n: number; end: number } =>
        chapter !== null &&
        typeof chapter === 'object' &&
        'n' in chapter &&
        typeof chapter.n === 'number' &&
        'end' in chapter &&
        typeof chapter.end === 'number',
    ),
  );
  assert.deepEqual(
    chapters.map((chapter) => chapter.n),
    [0, 1, 2, 3, 4, 5, 6, 7],
  );
  assert.ok((await readFile(resolve(dir, 'block-delivery.vtt'), 'utf8')).startsWith('WEBVTT\n'));
  assert.equal(
    (await readFile(resolve(dir, 'block-delivery-poster.jpg'))).subarray(0, 2).toString('hex'),
    'ffd8',
  );
});

/** The С3 film: tracked manifest, captions, chapters and poster under video/block-r3/, mp4 under the shared video dir. */
const r3Fixture = async (withVideo: boolean) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-r3-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  await mkdir(join(root, 'video/block-r3'), { recursive: true });
  for (const file of ['block-r3.vtt', 'block-r3.chapters.json', 'block-r3-poster.jpg']) {
    await cp(resolve('video/block-r3', file), join(root, 'video/block-r3', file));
  }
  await writeFile(
    join(root, BLOCK_R3.manifest),
    JSON.stringify({
      file: 'block-r3-720p.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: mediaUrl('block-r3-720p.mp4', sha256(mp4)),
      audio: 'voice-only',
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-r3-720p.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/s3-openspec.html'), page);
  return { root, out, page };
};

await test('С3 film: without the mp4 its page is untouched', async (t) => {
  const { root, out, page } = await r3Fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R3), false);
  assert.equal(await readFile(join(out, 'guides/s3-openspec.html'), 'utf8'), page);
});

await test('С3 film: the player gets its file, captions, poster and part mode', async (t) => {
  const { root, out } = await r3Fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R3), true);
  const html = await readFile(join(out, 'guides/s3-openspec.html'), 'utf8');
  assert.doesNotMatch(html, /guide-video-credit|Музыка и звук|freesound/u, 'voice-only film');
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-r3-720p\.mp4" data-vtt="block-r3\.vtt" data-aria="[^"]+" data-steps="0" data-poster="block-r3-poster\.jpg">\[\{"n":0,/u,
  );
  for (const name of [
    'block-r3-720p.mp4',
    'block-r3.vtt',
    'block-r3-poster.jpg',
    'guide-video.css',
    'guide-video.js',
  ]) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
});

await test('С3 film manifest matches its release assets, subtitles, chapters and poster', async () => {
  const dir = resolve(import.meta.dirname, '../video/block-r3');
  const manifest: unknown = JSON.parse(await readFile(resolve(dir, 'video-manifest.json'), 'utf8'));
  assert.ok(manifest !== null && typeof manifest === 'object');
  assert.ok('file' in manifest && typeof manifest.file === 'string');
  assert.ok('sha256' in manifest && typeof manifest.sha256 === 'string');
  assert.ok('size' in manifest && typeof manifest.size === 'number');
  assert.ok('url' in manifest && typeof manifest.url === 'string');
  assert.ok('version' in manifest && typeof manifest.version === 'string');
  assert.ok('duration' in manifest && typeof manifest.duration === 'number');
  assert.ok(
    'master' in manifest &&
      manifest.master !== null &&
      typeof manifest.master === 'object' &&
      'file' in manifest.master &&
      typeof manifest.master.file === 'string' &&
      'sha256' in manifest.master &&
      typeof manifest.master.sha256 === 'string' &&
      'size' in manifest.master &&
      typeof manifest.master.size === 'number',
  );
  assert.equal('audio' in manifest && manifest.audio, 'voice-only');
  assert.match(manifest.sha256, /^[0-9a-f]{64}$/u);
  assert.match(manifest.master.sha256, /^[0-9a-f]{64}$/u);
  assert.ok(manifest.sha256.startsWith(manifest.version));
  assert.equal(manifest.url, mediaUrl(manifest.file, manifest.sha256));
  assertMasterPin(manifest.master);
  const chapters: unknown = JSON.parse(
    await readFile(resolve(dir, 'block-r3.chapters.json'), 'utf8'),
  );
  assert.ok(Array.isArray(chapters));
  assert.ok(
    chapters.every(
      (
        chapter: unknown,
      ): chapter is {
        n: number;
        end: number;
      } =>
        chapter !== null &&
        typeof chapter === 'object' &&
        'n' in chapter &&
        typeof chapter.n === 'number' &&
        'end' in chapter &&
        typeof chapter.end === 'number',
    ),
  );
  assert.deepEqual(
    chapters.map((chapter) => chapter.n),
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.ok((await readFile(resolve(dir, 'block-r3.vtt'), 'utf8')).startsWith('WEBVTT\n'));
  assert.equal(
    (await readFile(resolve(dir, 'block-r3-poster.jpg'))).subarray(0, 2).toString('hex'),
    'ffd8',
  );
});

await test('chapters point to page steps explicitly: only a stepped film carries pageStep, and "Просим проверить: запрос на слияние (MR)" opens "Откройте запрос на слияние"', async () => {
  const { GUIDE_VIDEOS, BLOCK_0A } = await import('./guide-video.ts');
  for (const spec of [BLOCK_0A, ...GUIDE_VIDEOS]) {
    if (
      spec.extra &&
      !(await stat(resolve(spec.chapters)).then(
        () => true,
        () => false,
      ))
    )
      continue; // the extra film's files arrive with the film
    const chapters: unknown = JSON.parse(await readFile(resolve(spec.chapters), 'utf8'));
    assert.ok(Array.isArray(chapters));
    assert.ok(
      chapters.every(
        (
          chapter: unknown,
        ): chapter is {
          n: number;
          title: string;
          pageStep?: number | null;
        } =>
          chapter !== null &&
          typeof chapter === 'object' &&
          'n' in chapter &&
          typeof chapter.n === 'number' &&
          'title' in chapter &&
          typeof chapter.title === 'string' &&
          (!('pageStep' in chapter) ||
            typeof chapter.pageStep === 'number' ||
            chapter.pageStep === null),
      ),
    );
    const pageSteps = chapters
      .map((chapter) => chapter.pageStep)
      .filter((step): step is number => Boolean(step));
    if (!spec.steps) {
      assert.deepEqual(
        pageSteps,
        [],
        `${spec.page}: a film of free-standing parts has no step buttons`,
      );
      continue;
    }
    const steps = guideContent.stages['0a'].steps;
    assert.equal(new Set(pageSteps).size, pageSteps.length, 'one page step per chapter');
    for (const step of pageSteps)
      assert.ok(step >= 1 && step <= steps.length, `page step ${step} exists`);
    const review = chapters.find(
      (chapter) => chapter.title === 'Просим проверить: запрос на слияние (MR)',
    )!;
    assert.match(steps[review.pageStep! - 1]!.title, /Откройте Merge Request/u);
    const pull = chapters.find((chapter) => chapter.title === 'Получаем принятую версию')!;
    assert.match(steps[pull.pageStep! - 1]!.title, /Получите принятую версию/u);
    assert.equal(
      chapters
        .filter((chapter) => chapter.pageStep == null)
        .map((chapter) => chapter.title)
        .join('|'),
      'Вступление|Итог',
    );
    assert.equal(spec, BLOCK_0A);
  }
});
