import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import {
  mediaUrl,
  addGuideVideo,
  BLOCK_R1,
  BLOCK_R2,
  BLOCK_SDD,
  GUIDE_VIDEO_DIR,
  sha256,
} from './guide-video.ts';
import { mp4, assertMasterPin } from './guide-video-test-support.ts';

/** The SDD and OpenSpec film: tracked manifest, captions, chapters and poster under video/block-sdd/, mp4 under the shared video dir. */
const sddFixture = async (withVideo: boolean, withPoster = true) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-sdd-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  await mkdir(join(root, 'video/block-sdd'), { recursive: true });
  for (const file of [
    'block-sdd.vtt',
    'block-sdd.chapters.json',
    ...(withPoster ? ['block-sdd-poster.jpg'] : []),
  ]) {
    await cp(resolve('video/block-sdd', file), join(root, 'video/block-sdd', file));
  }
  await writeFile(
    join(root, BLOCK_SDD.manifest),
    JSON.stringify({
      file: 'block-sdd-720p.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: mediaUrl('block-sdd-720p.mp4', sha256(mp4)),
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-sdd-720p.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/p3-sdd.html'), page);
  return { root, out, page };
};

await test('SDD film: without the mp4 its page is untouched', async (t) => {
  const { root, out, page } = await sddFixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_SDD), false);
  assert.equal(await readFile(join(out, 'guides/p3-sdd.html'), 'utf8'), page);
});

await test('SDD film: the player gets its file, captions, poster and part mode', async (t) => {
  const { root, out } = await sddFixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_SDD), true);
  const html = await readFile(join(out, 'guides/p3-sdd.html'), 'utf8');
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-sdd-720p\.mp4" data-vtt="block-sdd\.vtt" data-aria="[^"]+" data-steps="0" data-poster="block-sdd-poster\.jpg">\[\{"n":0,/u,
  );
  for (const name of [
    'block-sdd-720p.mp4',
    'block-sdd.vtt',
    'block-sdd-poster.jpg',
    'guide-video.css',
    'guide-video.js',
  ]) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
});

await test('a film without a poster file gets no poster attribute and no copy', async (t) => {
  const { root, out } = await sddFixture(true, false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_SDD), true);
  assert.doesNotMatch(await readFile(join(out, 'guides/p3-sdd.html'), 'utf8'), /data-poster/u);
  assert.deepEqual(
    (await readdir(join(out, 'guides/assets/video'))).filter((name) => name.endsWith('.jpg')),
    [],
  );
});

await test('the player never autoplays and keeps the whole 16:9 frame', async (t) => {
  const { root, out } = await sddFixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_SDD), true);
  const player = await readFile(join(out, 'guides/assets/video/guide-video.js'), 'utf8');
  assert.doesNotMatch(player, /autoplay/u);
  assert.match(player, /<video controls preload="metadata" playsinline/u);
  const css = await readFile(join(out, 'guides/assets/video/guide-video.css'), 'utf8');
  assert.match(css, /\.lesson-video video \{[^}]*width: 100%; aspect-ratio: 16 \/ 9;/u);
  assert.doesNotMatch(css, /object-fit: cover/u);
});

await test('SDD film manifest matches its release assets, subtitles, chapters and poster', async () => {
  const dir = resolve(import.meta.dirname, '../video/block-sdd');
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
    await readFile(resolve(dir, 'block-sdd.chapters.json'), 'utf8'),
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
    [0, 1, 2, 3, 4, 5],
  );
  assert.ok((await readFile(resolve(dir, 'block-sdd.vtt'), 'utf8')).startsWith('WEBVTT\n'));
  assert.equal(
    (await readFile(resolve(dir, 'block-sdd-poster.jpg'))).subarray(0, 2).toString('hex'),
    'ffd8',
  );
});

/** The С1 film: tracked manifest, captions, chapters and poster under video/block-r1/, mp4 under the shared video dir. */
const r1Fixture = async (withVideo: boolean, withPoster = true) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-r1-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  await mkdir(join(root, 'video/block-r1'), { recursive: true });
  for (const file of [
    'block-r1.vtt',
    'block-r1.chapters.json',
    ...(withPoster ? ['block-r1-poster.jpg'] : []),
  ]) {
    await cp(resolve('video/block-r1', file), join(root, 'video/block-r1', file));
  }
  await writeFile(
    join(root, BLOCK_R1.manifest),
    JSON.stringify({
      file: 'block-r1-720p.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: mediaUrl('block-r1-720p.mp4', sha256(mp4)),
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-r1-720p.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/s1-git.html'), page);
  return { root, out, page };
};

await test('С1 film: without the mp4 its page is untouched', async (t) => {
  const { root, out, page } = await r1Fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R1), false);
  assert.equal(await readFile(join(out, 'guides/s1-git.html'), 'utf8'), page);
});

await test('С1 film: the player gets its file, captions, poster and part mode', async (t) => {
  const { root, out } = await r1Fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R1), true);
  const html = await readFile(join(out, 'guides/s1-git.html'), 'utf8');
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-r1-720p\.mp4" data-vtt="block-r1\.vtt" data-aria="[^"]+" data-steps="0" data-poster="block-r1-poster\.jpg">\[\{"n":0,/u,
  );
  for (const name of [
    'block-r1-720p.mp4',
    'block-r1.vtt',
    'block-r1-poster.jpg',
    'guide-video.css',
    'guide-video.js',
  ]) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
});

await test('С1 film manifest matches its release assets, subtitles, chapters and poster', async () => {
  const dir = resolve(import.meta.dirname, '../video/block-r1');
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
    await readFile(resolve(dir, 'block-r1.chapters.json'), 'utf8'),
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
    [0, 1, 2, 3, 4, 5, 6, 7],
  );
  assert.ok((await readFile(resolve(dir, 'block-r1.vtt'), 'utf8')).startsWith('WEBVTT\n'));
  assert.equal(
    (await readFile(resolve(dir, 'block-r1-poster.jpg'))).subarray(0, 2).toString('hex'),
    'ffd8',
  );
});

/** The С2 film: tracked manifest, captions, chapters and poster under video/block-r2/, mp4 under the shared video dir. */
const r2Fixture = async (withVideo: boolean) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-r2-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  await mkdir(join(root, 'video/block-r2'), { recursive: true });
  for (const file of ['block-r2.vtt', 'block-r2.chapters.json', 'block-r2-poster.jpg']) {
    await cp(resolve('video/block-r2', file), join(root, 'video/block-r2', file));
  }
  await writeFile(
    join(root, BLOCK_R2.manifest),
    JSON.stringify({
      file: 'block-r2-720p.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: mediaUrl('block-r2-720p.mp4', sha256(mp4)),
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-r2-720p.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/s2-review.html'), page);
  return { root, out, page };
};

await test('С2 film: without the mp4 its page is untouched', async (t) => {
  const { root, out, page } = await r2Fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R2), false);
  assert.equal(await readFile(join(out, 'guides/s2-review.html'), 'utf8'), page);
});

await test('С2 film: the player gets its file, captions, poster and part mode', async (t) => {
  const { root, out } = await r2Fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R2), true);
  const html = await readFile(join(out, 'guides/s2-review.html'), 'utf8');
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-r2-720p\.mp4" data-vtt="block-r2\.vtt" data-aria="[^"]+" data-steps="0" data-poster="block-r2-poster\.jpg">\[\{"n":0,/u,
  );
  for (const name of [
    'block-r2-720p.mp4',
    'block-r2.vtt',
    'block-r2-poster.jpg',
    'guide-video.css',
    'guide-video.js',
  ]) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
});

await test('С2 film manifest matches its release assets, subtitles, chapters and poster', async () => {
  const dir = resolve(import.meta.dirname, '../video/block-r2');
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
    await readFile(resolve(dir, 'block-r2.chapters.json'), 'utf8'),
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
    [0, 1, 2, 3, 4, 5, 6, 7],
  );
  assert.ok((await readFile(resolve(dir, 'block-r2.vtt'), 'utf8')).startsWith('WEBVTT\n'));
  assert.equal(
    (await readFile(resolve(dir, 'block-r2-poster.jpg'))).subarray(0, 2).toString('hex'),
    'ffd8',
  );
});
