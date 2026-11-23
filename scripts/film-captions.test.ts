import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

const FILM_ROOT = 'video';
const PLAYER_TRACKS = 'docs/pages/sdlc-development/guides/assets/video';

/** Every committed web caption track: video/<block>/<block>.vtt and the one beside the player page (P2). */
const tracks = async (): Promise<string[]> => {
  const blocks = (await readdir(FILM_ROOT, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory() && entry.name.startsWith('block-'),
  );
  const found: string[] = [];
  for (const block of blocks) {
    for (const file of await readdir(join(FILM_ROOT, block.name)))
      if (file.endsWith('.vtt')) found.push(join(FILM_ROOT, block.name, file));
  }
  for (const file of await readdir(PLAYER_TRACKS))
    if (file.endsWith('.vtt')) found.push(join(PLAYER_TRACKS, file));
  return found;
};

await test('no caption line of any film ends with a short preposition', async () => {
  const all = await tracks();
  assert.ok(all.length >= 12, `expected the tracks of all twelve films, found ${all.length}`);
  for (const track of all) {
    const hanging = (await readFile(track, 'utf8'))
      .split('\n')
      .map((line, index) => ({ text: line.trimEnd(), number: index + 1 }))
      .filter(
        ({ text }) =>
          !text.includes('-->') && /[\s\u00a0](?:в|к|с|у|о|от|по|на|до|за|из)$/iu.test(text),
      );
    assert.deepEqual(
      hanging,
      [],
      `${track}: a preposition stays at the end of a line; move it to the next line`,
    );
  }
});
