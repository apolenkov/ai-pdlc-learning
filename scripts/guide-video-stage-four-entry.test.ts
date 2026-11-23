import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import {
  addGuideVideo,
  GUIDE_VIDEO_DIR,
  mediaUrl,
  sha256,
  BLOCK_R4NEW,
  BLOCK_TEAM,
} from './guide-video.ts';
import { mp4, assertMasterPin } from './guide-video-test-support.ts';

/** The С4-new film: tracked manifest, captions, chapters and poster under video/block-r4new/, mp4 under the shared video dir. */
const r4newFixture = async (withVideo: boolean) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-r4new-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  await mkdir(join(root, 'video/block-r4new'), { recursive: true });
  for (const file of ['block-r4new.vtt', 'block-r4new.chapters.json', 'block-r4new-poster.jpg']) {
    await cp(resolve('video/block-r4new', file), join(root, 'video/block-r4new', file));
  }
  await writeFile(
    join(root, BLOCK_R4NEW.manifest),
    JSON.stringify({
      file: 'block-r4new-720p.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: mediaUrl('block-r4new-720p.mp4', sha256(mp4)),
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-r4new-720p.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/s4a-new.html'), page);
  return { root, out, page };
};

await test('С4-new film: without the mp4 its page is untouched', async (t) => {
  const { root, out, page } = await r4newFixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R4NEW), false);
  assert.equal(await readFile(join(out, 'guides/s4a-new.html'), 'utf8'), page);
});

await test('С4-new film: the player gets its file, captions, poster and part mode', async (t) => {
  const { root, out } = await r4newFixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_R4NEW), true);
  const html = await readFile(join(out, 'guides/s4a-new.html'), 'utf8');
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-r4new-720p\.mp4" data-vtt="block-r4new\.vtt" data-aria="[^"]+" data-steps="0" data-poster="block-r4new-poster\.jpg">\[\{"n":0,/u,
  );
  for (const name of [
    'block-r4new-720p.mp4',
    'block-r4new.vtt',
    'block-r4new-poster.jpg',
    'guide-video.css',
    'guide-video.js',
  ]) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
});

await test('С4-new film manifest matches its release assets, subtitles, chapters and poster', async () => {
  const dir = resolve(import.meta.dirname, '../video/block-r4new');
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
    await readFile(resolve(dir, 'block-r4new.chapters.json'), 'utf8'),
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
    [0, 1, 2, 3, 4, 5, 6],
  );
  assert.ok((await readFile(resolve(dir, 'block-r4new.vtt'), 'utf8')).startsWith('WEBVTT\n'));
  assert.equal(
    (await readFile(resolve(dir, 'block-r4new-poster.jpg'))).subarray(0, 2).toString('hex'),
    'ffd8',
  );
});

/** The Team film: tracked manifest, captions, chapters and poster under video/block-team/, mp4 under the shared video dir. */
const teamFixture = async (withVideo: boolean) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-team-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  await mkdir(join(root, 'video/block-team'), { recursive: true });
  for (const file of ['block-team.vtt', 'block-team.chapters.json', 'block-team-poster.jpg']) {
    await cp(resolve('video/block-team', file), join(root, 'video/block-team', file));
  }
  await writeFile(
    join(root, BLOCK_TEAM.manifest),
    JSON.stringify({
      file: 'block-team-720p.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: mediaUrl('block-team-720p.mp4', sha256(mp4)),
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-team-720p.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/s4-team.html'), page);
  return { root, out, page };
};

await test('Team film: without the mp4 its page is untouched', async (t) => {
  const { root, out, page } = await teamFixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_TEAM), false);
  assert.equal(await readFile(join(out, 'guides/s4-team.html'), 'utf8'), page);
});

await test('Team film: the player gets its file, captions, poster and part mode', async (t) => {
  const { root, out } = await teamFixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_TEAM), true);
  const html = await readFile(join(out, 'guides/s4-team.html'), 'utf8');
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-team-720p\.mp4" data-vtt="block-team\.vtt" data-aria="[^"]+" data-steps="0" data-poster="block-team-poster\.jpg">\[\{"n":0,/u,
  );
  for (const name of [
    'block-team-720p.mp4',
    'block-team.vtt',
    'block-team-poster.jpg',
    'guide-video.css',
    'guide-video.js',
  ]) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
});

await test('Team film manifest matches its release assets, subtitles, chapters and poster', async () => {
  const dir = resolve(import.meta.dirname, '../video/block-team');
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
    await readFile(resolve(dir, 'block-team.chapters.json'), 'utf8'),
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
  assert.ok((await readFile(resolve(dir, 'block-team.vtt'), 'utf8')).startsWith('WEBVTT\n'));
  assert.equal(
    (await readFile(resolve(dir, 'block-team-poster.jpg'))).subarray(0, 2).toString('hex'),
    'ffd8',
  );
});
