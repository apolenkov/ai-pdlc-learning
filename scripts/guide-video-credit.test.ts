import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import {
  addGuideVideo,
  BLOCK_DARK,
  BLOCK_P4,
  BLOCK_R3,
  BLOCK_SDD,
  readVideoManifest,
} from './guide-video.ts';
import { placeFilm } from './guide-video-test-support.ts';

/** A guide page that hosts a film; the credit line is built only for films with a music and sound track. */
const pageFixture = async (page: string) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-credit-'));
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  await writeFile(
    join(out, page),
    '<html><head></head><body><main id="guide-content"></main></body></html>',
  );
  return { root, out };
};

await test('a voice-only film shows no «Музыка и звук» line, a film with a background keeps it', async (t) => {
  const { root, out } = await pageFixture('guides/p3-sdd.html');
  t.after(() => rm(root, { recursive: true, force: true }));
  await placeFilm(root, BLOCK_SDD, 'block-sdd-720p.mp4', Buffer.from('sdd film'), 'voice-only');
  await placeFilm(root, BLOCK_DARK, 'block-dark-factory-720p.mp4', Buffer.from('dark film'));
  assert.equal(await addGuideVideo(out, root, BLOCK_SDD), true);
  assert.equal(await addGuideVideo(out, root, BLOCK_DARK), true);
  const html = await readFile(join(out, 'guides/p3-sdd.html'), 'utf8');
  assert.deepEqual(
    [...html.matchAll(/<template id="(guide-video-credit[^"]*)">/gu)].map((match) => match[1]),
    ['guide-video-credit-dark'],
    'only the film with a background carries the attribution',
  );
  assert.equal(html.split('Музыка и звук').length - 1, 1);
  assert.equal(html.split('id="guide-video-chapters').length - 1, 2, 'both players are present');
});

await test('the manifest field audio accepts only "voice-only"', async (t) => {
  const { root } = await pageFixture('guides/p3-sdd.html');
  t.after(() => rm(root, { recursive: true, force: true }));
  await placeFilm(root, BLOCK_SDD, 'block-sdd-720p.mp4', Buffer.from('x'), 'music');
  await assert.rejects(readVideoManifest(root, BLOCK_SDD), /audio must be "voice-only"/u);
  await placeFilm(root, BLOCK_SDD, 'block-sdd-720p.mp4', Buffer.from('x'), 'voice-only');
  assert.equal((await readVideoManifest(root, BLOCK_SDD)).audio, 'voice-only');
  await placeFilm(root, BLOCK_SDD, 'block-sdd-720p.mp4', Buffer.from('x'));
  assert.equal((await readVideoManifest(root, BLOCK_SDD)).audio, undefined);
});

await test('the С3 and П4 films are marked voice-only in their tracked manifests', async () => {
  for (const spec of [BLOCK_R3, BLOCK_P4])
    assert.equal(
      (await readVideoManifest(resolve(import.meta.dirname, '..'), spec)).audio,
      'voice-only',
      spec.manifest,
    );
});
