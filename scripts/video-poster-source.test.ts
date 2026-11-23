import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

/**
 * Lesson films: their poster is the player frame under the control bar, so the course keeps the
 * brand caption off it. The caption flag lives in the poster source, not only in the shot command,
 * otherwise the next `build-poster.mjs` run brings the caption back.
 */
const LESSON_FILMS = [
  'block-0',
  'block-dark-factory',
  'block-delivery',
  'block-map',
  'block-p4',
  'block-r1',
  'block-r2',
  'block-r3',
  'block-r4',
  'block-r4legacy',
  'block-r4new',
  'block-sdd',
  'block-team',
] as const;

/** Landing posters keep the caption, so they are not in the lesson list. */
const LANDING_FILMS = ['landing-overview'] as const;

type PosterConfig = { kicker?: unknown; title?: unknown; brand?: unknown };

const isPosterConfig = (value: unknown): value is PosterConfig =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const posterConfig = (film: string): PosterConfig => {
  const parsed: unknown = JSON.parse(
    readFileSync(resolve(ROOT, `video/${film}/film/poster.json`), 'utf8'),
  );
  assert.ok(
    isPosterConfig(parsed),
    `${film}/film/poster.json: poster config must be a JSON object`,
  );
  return parsed;
};

const filmsWithPosterConfig = (): string[] =>
  readdirSync(resolve(ROOT, 'video'), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(resolve(ROOT, `video/${entry.name}/film/poster.json`)),
    )
    .map((entry) => entry.name)
    .sort();

for (const film of LESSON_FILMS) {
  await test(`lesson poster ${film}: the source config drops the brand caption`, () => {
    const config = posterConfig(film);
    assert.equal(
      Object.hasOwn(config, 'brand'),
      true,
      `${film}/film/poster.json: set an explicit brand flag, a missing flag means the caption is on`,
    );
    assert.equal(
      config.brand,
      false,
      `${film}/film/poster.json: brand must stay false, otherwise the next poster build adds the caption back`,
    );
  });
}

await test('landing poster source keeps the brand caption', () => {
  const config = posterConfig('landing-overview');
  assert.notEqual(
    config.brand,
    false,
    'landing posters keep the brand caption, do not move them into the lesson list',
  );
});

await test('every poster source is classified as a lesson or a landing one', () => {
  assert.deepEqual(
    filmsWithPosterConfig(),
    [...LESSON_FILMS, ...LANDING_FILMS].sort(),
    'a new video with poster.json must be added to LESSON_FILMS or to LANDING_FILMS',
  );
});
