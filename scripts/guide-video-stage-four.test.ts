import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import {
  addGuideVideo,
  BLOCK_R4,
  GUIDE_VIDEO_DIR,
  mediaUrl,
  sha256,
  BLOCK_R4LEGACY,
} from './guide-video.ts';
import { mp4, assertMasterPin } from './guide-video-test-support.ts';

/** The С4 film: tracked manifest, captions, chapters and poster under video/block-r4/, mp4 under the shared video dir. */
const r4Fixture = async (withVideo: boolean) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-r4-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  await mkdir(join(root, 'video/block-r4'), { recursive: true });
  for (const file of ['block-r4.vtt', 'block-r4.chapters.json', 'block-r4-poster.jpg']) {
    await cp(resolve('video/block-r4', file), join(root, 'video/block-r4', file));
  }
  await writeFile(
    join(root, BLOCK_R4.manifest),
    JSON.stringify({
      file: 'block-r4-720p.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: mediaUrl('block-r4-720p.mp4', sha256(mp4)),
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-r4-720p.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/s4-product.html'), page);
  return { root, out, page };
};

await test('С4 film: without the mp4 its page is untouched', async (t) => {
  const { root, out, page } = await r4Fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R4), false);
  assert.equal(await readFile(join(out, 'guides/s4-product.html'), 'utf8'), page);
});

await test('С4 film: the player gets its file, captions, poster and part mode', async (t) => {
  const { root, out } = await r4Fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R4), true);
  const html = await readFile(join(out, 'guides/s4-product.html'), 'utf8');
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-r4-720p\.mp4" data-vtt="block-r4\.vtt" data-aria="[^"]+" data-steps="0" data-poster="block-r4-poster\.jpg">\[\{"n":0,/u,
  );
  for (const name of [
    'block-r4-720p.mp4',
    'block-r4.vtt',
    'block-r4-poster.jpg',
    'guide-video.css',
    'guide-video.js',
  ]) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
});

await test('С4 film manifest matches its release assets, subtitles, chapters and poster', async () => {
  const dir = resolve(import.meta.dirname, '../video/block-r4');
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
    await readFile(resolve(dir, 'block-r4.chapters.json'), 'utf8'),
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
  assert.ok((await readFile(resolve(dir, 'block-r4.vtt'), 'utf8')).startsWith('WEBVTT\n'));
  assert.equal(
    (await readFile(resolve(dir, 'block-r4-poster.jpg'))).subarray(0, 2).toString('hex'),
    'ffd8',
  );
});

await test('block-r4 captions tell the branch ending after step 5', async () => {
  const vtt = await readFile(
    resolve(import.meta.dirname, '../video/block-r4/block-r4.vtt'),
    'utf8',
  );
  const cues = vtt.split('\n\n').filter((block) => block.includes(' --> '));
  const lastScene = cues.slice(-3).join('\n');
  assert.match(lastScene, /После шага 5/u);
  assert.match(lastScene, /6а/u);
  assert.match(lastScene, /6б/u);
  assert.doesNotMatch(lastScene, /Практика разработки/u);
});

/** The С4 legacy film: tracked manifest, captions, chapters and poster under video/block-r4legacy/, mp4 under the shared video dir. */
const r4legacyFixture = async (withVideo: boolean) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-r4legacy-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  await mkdir(join(root, 'video/block-r4legacy'), { recursive: true });
  for (const file of [
    'block-r4legacy.vtt',
    'block-r4legacy.chapters.json',
    'block-r4legacy-poster.jpg',
  ]) {
    await cp(resolve('video/block-r4legacy', file), join(root, 'video/block-r4legacy', file));
  }
  await writeFile(
    join(root, BLOCK_R4LEGACY.manifest),
    JSON.stringify({
      file: 'block-r4legacy-720p.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: mediaUrl('block-r4legacy-720p.mp4', sha256(mp4)),
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-r4legacy-720p.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/s4b-legacy.html'), page);
  return { root, out, page };
};

await test('С4 legacy film: without the mp4 its page is untouched', async (t) => {
  const { root, out, page } = await r4legacyFixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R4LEGACY), false);
  assert.equal(await readFile(join(out, 'guides/s4b-legacy.html'), 'utf8'), page);
});

await test('С4 legacy film: the player gets its file, captions, poster and part mode', async (t) => {
  const { root, out } = await r4legacyFixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R4LEGACY), true);
  const html = await readFile(join(out, 'guides/s4b-legacy.html'), 'utf8');
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-r4legacy-720p\.mp4" data-vtt="block-r4legacy\.vtt" data-aria="[^"]+" data-steps="0" data-poster="block-r4legacy-poster\.jpg">\[\{"n":0,/u,
  );
  for (const name of [
    'block-r4legacy-720p.mp4',
    'block-r4legacy.vtt',
    'block-r4legacy-poster.jpg',
    'guide-video.css',
    'guide-video.js',
  ]) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
});

await test('С4 legacy film manifest matches its release assets, subtitles, chapters and poster', async () => {
  const dir = resolve(import.meta.dirname, '../video/block-r4legacy');
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
    await readFile(resolve(dir, 'block-r4legacy.chapters.json'), 'utf8'),
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
  assert.ok((await readFile(resolve(dir, 'block-r4legacy.vtt'), 'utf8')).startsWith('WEBVTT\n'));
  assert.equal(
    (await readFile(resolve(dir, 'block-r4legacy-poster.jpg'))).subarray(0, 2).toString('hex'),
    'ffd8',
  );
});
