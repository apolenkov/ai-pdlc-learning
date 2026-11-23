import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { BLOCK_0, GUIDE_VIDEO_DIR, sha256 } from './guide-video.ts';
import { MEDIA_RELEASE, mediaUrl } from './media-release.ts';

const run = promisify(execFile);
const FILM = Buffer.from('synthetic release asset');

/** A local stand-in for GitHub: the release URL answers with a redirect, like the real download. */
const serve = async (t: test.TestContext, asset: Buffer): Promise<string> => {
  const server: Server = createServer((request, response) => {
    if (request.url === '/releases/download/media-v1/asset.mp4') {
      response.writeHead(302, { location: '/storage/asset.mp4' }).end();
    } else if (request.url === '/storage/asset.mp4') {
      response.writeHead(200, { 'content-length': asset.length }).end(asset);
    } else response.writeHead(404).end();
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => new Promise<void>((done) => server.close(() => done())));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return `http://127.0.0.1:${address.port}/releases/download/media-v1/asset.mp4`;
};

const fetchInto = async (t: test.TestContext, url: string) => {
  const root = await mkdtemp(join(tmpdir(), 'fetch-release-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, GUIDE_VIDEO_DIR), { recursive: true });
  await mkdir(dirname(join(root, BLOCK_0.manifest)), { recursive: true });
  const manifest = { file: 'block-0-720p.mp4', sha256: sha256(FILM), size: FILM.length, url };
  await writeFile(join(root, BLOCK_0.manifest), JSON.stringify(manifest));
  const { stdout, stderr } = await run(
    process.execPath,
    ['--experimental-strip-types', resolve('scripts/fetch-guide-video.ts')],
    { cwd: root },
  );
  return { root, stdout, stderr, target: join(root, GUIDE_VIDEO_DIR, 'block-0-720p.mp4') };
};

await test('asset names carry the content: <12 hex of sha256>-<file> in the media release', () => {
  assert.equal(
    mediaUrl('block-r2-720p.mp4', `0123456789ab${'f'.repeat(52)}`),
    `${MEDIA_RELEASE}/0123456789ab-block-r2-720p.mp4`,
  );
  assert.match(
    MEDIA_RELEASE,
    /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/releases\/download\/[\w.-]+$/u,
  );
});

await test('video:fetch follows the release redirect and checks sha256', async (t) => {
  const url = await serve(t, FILM);
  const { stdout, target } = await fetchInto(t, url);
  assert.match(stdout, /^fetch-guide-video: fetched \(guides\//mu);
  assert.deepEqual(await readFile(target), FILM);
});

await test('a release asset with other bytes is refused and nothing is written', async (t) => {
  const url = await serve(t, Buffer.from('other bytes, same name'));
  const { stdout, stderr, target } = await fetchInto(t, url);
  assert.equal(stdout, '');
  assert.match(stderr, /^fetch-guide-video: skipped, .*does not match the manifest/u);
  await assert.rejects(readFile(target), /ENOENT/u);
});

await test('a missing release asset is one stderr line, exit 0', async (t) => {
  const url = (await serve(t, FILM)).replace('asset.mp4', 'missing.mp4');
  const { stderr } = await fetchInto(t, url);
  assert.match(stderr, /^fetch-guide-video: skipped, .*HTTP 404/u);
  assert.equal(stderr.trim().split('\n').length, 1);
});
