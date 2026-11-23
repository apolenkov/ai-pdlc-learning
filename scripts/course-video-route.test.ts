import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };

const root = resolve(import.meta.dirname, '..');
type Names = { route?: { id: string }[]; guides: Record<string, { title: string }> };
const names: Names = courseNames;

const route = names.route?.map(({ id }) => id) ?? assert.fail('course-names.json: нет route');

/** Film folder → guide id; entries off the film chain name their neighbours.
 * The preparation 4 film (metarepo) is a side stop: the chain still runs SDD → step 1, the film names both as its neighbours. */
const films = [
  { dir: 'block-0', id: '0' },
  { dir: 'block-0a', id: '0a' },
  { dir: 'block-sdd', id: 'sdd', next: '1' },
  { dir: 'block-p4', id: 'metarepo', prev: 'sdd', next: '1' },
  { dir: 'block-r1', id: '1', prev: 'sdd' },
  { dir: 'block-r2', id: '2' },
  { dir: 'block-r3', id: '3' },
  // The ending names the branches 6a/6b after step 5 (course map), not a single next guide.
  { dir: 'block-r4', id: '3-star', prev: '4-team', next: null },
  { dir: 'block-team', id: '4-team', prev: '3', next: '3-star' },
  { dir: 'block-r4new', id: '4-new', prev: '3-star', next: 'delivery' },
  { dir: 'block-r4legacy', id: '4-legacy', prev: '3-star', next: 'delivery' },
  { dir: 'block-delivery', id: 'delivery', prev: '3-star', next: null },
  { dir: 'block-dark-factory', id: 'dark', prev: 'sdd', next: '1' },
] as const;

/** Films not yet re-shot for the new route. The list may only shrink: a film that already passes must be removed. */
const PENDING_REBUILD: readonly string[] = [];

// Titles carry non-breaking spaces from the typography pass; a film shows the same words with plain ones.
const flat = (text: string) => text.replaceAll('\u00a0', ' ');
const titleOf = (id: string) =>
  flat(names.guides[id]?.title ?? assert.fail(`course-names.json: нет гайда ${id}`));
const neighbour = (film: (typeof films)[number], side: 'prev' | 'next'): string | null => {
  if (side === 'prev' && 'prev' in film) return film.prev;
  if (side === 'next' && 'next' in film) return film.next;
  return route[route.indexOf(film.id) + (side === 'next' ? 1 : -1)] ?? null;
};

const scene = async (dir: string, name: string) =>
  flat(
    await readFile(resolve(root, 'video', dir, 'film/compositions', `scene-${name}.html`), 'utf8'),
  );
const lastSceneName = async (dir: string) => {
  const scenes: unknown = JSON.parse(
    await readFile(resolve(root, 'video', dir, 'film/scenes.json'), 'utf8'),
  );
  assert.ok(Array.isArray(scenes));
  assert.ok(
    scenes.every(
      (value: unknown): value is { n?: number | string; kind?: string } =>
        value !== null &&
        typeof value === 'object' &&
        (!('n' in value) || typeof value.n === 'number' || typeof value.n === 'string') &&
        (!('kind' in value) || typeof value.kind === 'string'),
    ),
  );
  const last = scenes.filter(({ kind }) => kind !== 'title').at(-1);
  return String(last?.n).padStart(2, '0');
};

/** Violations of the film-chain rule (skills/course-video/SKILL.md): «Перед этим» on the intro, «Дальше» on the last scene, names as in course-names.json. */
const violations = async (film: (typeof films)[number]): Promise<string[]> => {
  const found: string[] = [];
  const prev = neighbour(film, 'prev');
  const next = neighbour(film, 'next');
  const intro = await scene(film.dir, '00');
  if (prev === null) {
    if (intro.includes('Перед этим')) found.push('первый ролик: «Перед этим» не нужно');
  } else {
    if (!intro.includes('Перед этим')) found.push('нет плашки «Перед этим» на вступлении');
    if (!intro.includes(titleOf(prev))) found.push(`на вступлении нет названия «${titleOf(prev)}»`);
  }
  const outro = await scene(film.dir, await lastSceneName(film.dir));
  if (next === null) return found;
  if (!outro.includes('Дальше')) found.push('нет «Дальше» в последней сцене');
  if (!outro.includes(titleOf(next)))
    found.push(`в последней сцене нет названия «${titleOf(next)}»`);
  for (const id of Object.keys(names.guides)) {
    const title = titleOf(id);
    if (id !== next && id !== film.id && outro.includes(title))
      found.push(`в последней сцене лишнее название «${title}»`);
  }
  return found;
};

for (const film of films) {
  await test(`${film.dir}: «Перед этим» и «Дальше» совпадают с цепочкой роликов`, async () => {
    const found = await violations(film);
    if (PENDING_REBUILD.includes(film.dir)) {
      assert.notDeepEqual(
        found,
        [],
        `${film.dir} уже соответствует маршруту: уберите его из PENDING_REBUILD`,
      );
    } else assert.deepEqual(found, []);
  });
}

await test('PENDING_REBUILD называет только существующие ролики', () => {
  assert.deepEqual(
    PENDING_REBUILD.filter((dir) => !films.some((film) => film.dir === dir)),
    [],
  );
});
