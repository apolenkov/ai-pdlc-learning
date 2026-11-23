import { readChapters } from '../docs/pages/sdlc-development/guides/assets/video/chapters.ts';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { addGuideVideo, BLOCK_MAP, INTENT_OVERVIEW } from './guide-video.ts';
import { placeFilm } from './guide-video-test-support.ts';
import { readLearningEnhancementsCss } from './learning-enhancements-css.ts';

await test('video chapter parsing rejects malformed, invalid and empty usable data before mounting a player', () => {
  const chapter = { n: 1, title: 'Шаг', step: 1, start: 0, speechStart: 0, end: 5 };
  const valid = JSON.stringify([chapter]);
  assert.deepEqual(readChapters(valid), [chapter], 'valid chapters preserve order and values');
  for (const source of [
    '{',
    '{}',
    '[]',
    JSON.stringify([{ ...chapter, end: 'invalid' }]),
    valid.replace('"end":5', '"end":1e999'),
    JSON.stringify([{ ...chapter, title: 'Конечная заставка' }]),
  ]) {
    assert.equal(
      readChapters(source),
      null,
      `${source}: malformed or unusable data must fail closed`,
    );
  }
});

await test('the map film plays in the #howto-film slot of the course map, without a manifest the map stays as it was', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-map-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const map =
    '<html><head></head><body><div class="map-howto__film" id="howto-film"></div></body></html>';
  await writeFile(join(out, 'guides/index.html'), map);
  assert.equal(await addGuideVideo(out, root, BLOCK_MAP), false);
  assert.equal(await readFile(join(out, 'guides/index.html'), 'utf8'), map);
  await placeFilm(root, BLOCK_MAP, 'block-map-720p.mp4', Buffer.from('map film'));
  assert.equal(await addGuideVideo(out, root, BLOCK_MAP), true);
  const html = await readFile(join(out, 'guides/index.html'), 'utf8');
  assert.match(html, /id="guide-video-chapters-map"[^>]*data-slot="howto-film"/u);
  assert.match(html, /<script src="assets\/video\/guide-video\.js"><\/script><\/body>/u);
});

await test('the intent overview film has its slot inside the «Как пользоваться картой» block, which stays hidden until the slot is filled (TASK-563)', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-intent-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = await readFile(resolve('docs/pages/sdlc-development/guides/intent.html'), 'utf8');
  const block = page.match(
    /<section class="map-howto map-howto--film-gated"[^]*?<\/section>/u,
  )?.[0];
  assert.ok(block, 'the how-to block is on the intent page');
  assert.match(block, /<div class="map-howto__film" id="intent-overview-film"><\/div>/u);
  const css = await readLearningEnhancementsCss();
  assert.match(
    css,
    /\.map-howto--film-gated:has\(\.map-howto__film:empty\)\s*\{\s*display:\s*none/u,
  );
  await writeFile(join(out, 'guides/intent.html'), page);
  assert.equal(await addGuideVideo(out, root, INTENT_OVERVIEW), false, 'no mp4, no player');
  await placeFilm(root, INTENT_OVERVIEW, 'intent-overview-720p.mp4', Buffer.from('intent film'));
  assert.equal(await addGuideVideo(out, root, INTENT_OVERVIEW), true);
  const html = await readFile(join(out, 'guides/intent.html'), 'utf8');
  assert.match(html, /id="guide-video-chapters-overview"[^>]*data-slot="intent-overview-film"/u);
});
