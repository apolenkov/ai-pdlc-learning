import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { addGuideVideo, BLOCK_0, GUIDE_VIDEO_DIR, mediaUrl, sha256 } from './guide-video.ts';
import { mp4, assertMasterPin } from './guide-video-test-support.ts';

function assertBlock0Manifest(manifest: unknown): asserts manifest is {
  file: string;
  sha256: string;
  size: number;
  url: string;
  version: string;
  duration: number;
  master: { file: string; sha256: string; size: number };
} {
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
}

/** Same shape for the introductory film: tracked manifest, captions and chapters under video/block-0/, mp4 under the shared video dir. */
const block0Fixture = async (withVideo: boolean) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-0-'));
  await cp(resolve(GUIDE_VIDEO_DIR), join(root, GUIDE_VIDEO_DIR), {
    recursive: true,
    filter: (path) => !path.endsWith('.mp4'),
  });
  for (const file of ['block-0.vtt', 'block-0.chapters.json']) {
    await mkdir(join(root, 'video/block-0'), { recursive: true });
    await cp(resolve('video/block-0', file), join(root, 'video/block-0', file));
  }
  await writeFile(
    join(root, BLOCK_0.manifest),
    JSON.stringify({
      file: 'block-0-720p.mp4',
      sha256: sha256(mp4),
      size: mp4.length,
      url: mediaUrl('block-0-720p.mp4', sha256(mp4)),
    }),
  );
  if (withVideo) await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-0-720p.mp4'), mp4);
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/p1-zachem.html'), page);
  return { root, out, page };
};

await test('block-0 film: without the mp4 its page is untouched', async (t) => {
  const { root, out, page } = await block0Fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_0), false);
  assert.equal(await readFile(join(out, 'guides/p1-zachem.html'), 'utf8'), page);
});

await test('block-0 film: the player gets its own file, captions and part mode, nine chapters', async (t) => {
  const { root, out } = await block0Fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root, BLOCK_0), true);
  const html = await readFile(join(out, 'guides/p1-zachem.html'), 'utf8');
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-0-720p\.mp4" data-vtt="block-0\.vtt" data-aria="[^"]+" data-steps="0">\[\{"n":0,/u,
  );
  const chapters: unknown = JSON.parse(
    /id="guide-video-chapters"[^>]*>([^<]+)<\/script>/u.exec(html)![1]!,
  );
  assert.ok(Array.isArray(chapters));
  assert.ok(
    chapters.every(
      (chapter: unknown): chapter is { n: number } =>
        chapter !== null &&
        typeof chapter === 'object' &&
        'n' in chapter &&
        typeof chapter.n === 'number',
    ),
  );
  assert.deepEqual(
    chapters.map((chapter) => chapter.n),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  for (const name of ['block-0-720p.mp4', 'block-0.vtt', 'guide-video.css', 'guide-video.js']) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
  assert.match(await readFile(join(out, 'guides/assets/video/block-0.vtt'), 'utf8'), /^WEBVTT/u);
});

await test('block-0 film: a file that differs from its manifest fails the build', async (t) => {
  const { root, out } = await block0Fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-0-720p.mp4'), 'tampered');
  await assert.rejects(
    () => addGuideVideo(out, root, BLOCK_0),
    /does not match video-manifest\.json/u,
  );
});

await test('block-0 film manifest matches its release assets, subtitles and chapters', async () => {
  const dir = resolve(import.meta.dirname, '../video/block-0');
  const manifest: unknown = JSON.parse(await readFile(resolve(dir, 'video-manifest.json'), 'utf8'));
  assertBlock0Manifest(manifest);
  assert.match(manifest.sha256, /^[0-9a-f]{64}$/u);
  assert.match(manifest.master.sha256, /^[0-9a-f]{64}$/u);
  assert.ok(manifest.sha256.startsWith(manifest.version));
  assert.equal(manifest.url, mediaUrl(manifest.file, manifest.sha256));
  assertMasterPin(manifest.master);
  for (const entry of [manifest, manifest.master]) assert.ok(entry.size > 0);
  const chapters: unknown = JSON.parse(
    await readFile(resolve(dir, 'block-0.chapters.json'), 'utf8'),
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
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(
    chapters.at(-1)?.end,
    386.2,
    'the last part ends before the closing scene (406.9 s film)',
  );
  const vtt = await readFile(resolve(dir, 'block-0.vtt'), 'utf8');
  assert.ok(vtt.startsWith('WEBVTT\n'));
  assert.equal(vtt.match(/ --> /gu)?.length, 111);
  const media = (await readFile(resolve(dir, 'MEDIA.sha256'), 'utf8')).trim().split('\n');
  for (const line of media)
    assert.match(line, /^[0-9a-f]{64} {2}\.\/film\/assets\/(?:rec\/[^/]+\.mp4|vo\/[^/]+\.mp3)$/u);
});
