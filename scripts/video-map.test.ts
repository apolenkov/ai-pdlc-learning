import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { stops, GOALS } from '../video/_shared/tools/build-map.mjs';

import names from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import route from '../docs/pages/sdlc-development/guides/route-steps.json' with { type: 'json' };

await test('генератор карты учитывает длительность заставки; без заставки карта видна сразу', () => {
  const root = resolve(import.meta.dirname, '..');
  for (const duration of [null, 2.6, 3.4]) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'map-poster-')));
    try {
      mkdirSync(join(dir, 'tools'));
      mkdirSync(join(dir, 'compositions'));
      copyFileSync(
        join(root, 'video/_shared/tools/build-map.mjs'),
        join(dir, 'tools/build-map.mjs'),
      );
      writeFileSync(join(dir, 'scenes.json'), JSON.stringify([{ n: '0m', duration: 9.6 }]));
      if (duration !== null)
        writeFileSync(
          join(dir, 'compositions/scene-poster.html'),
          `<div data-duration="${duration}"></div>`,
        );
      const run = spawnSync(process.execPath, [join(dir, 'tools/build-map.mjs'), '3-star'], {
        encoding: 'utf8',
        env: {
          ...process.env,
          COURSE_NAMES: join(root, 'docs/pages/sdlc-development/course-names.json'),
          COURSE_ROUTE: join(root, 'docs/pages/sdlc-development/guides/route-steps.json'),
        },
      });
      assert.equal(run.status, 0, run.stderr);
      const html = readFileSync(join(dir, 'compositions/scene-0m.html'), 'utf8');
      const time = /tl\.set\(\[title, st\], \{ autoAlpha: 1 \}, ([\d.]+)\)/u.exec(html);
      assert.ok(time, 'нет времени появления карты');
      assert.equal(Number(time[1]), duration ?? 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

await test('карта маршрута роликов строится из route-steps.json: порядок, номера, ответвления и «что получите» для каждого гайда', () => {
  // The film map covers the filmed analysis course; intent films land later with their own map.
  // RENUMBER-MAP: preparation is unnumbered; branches form step 6, delivery is step 7.
  const analysis = {
    ...names,
    route: names.route.filter((r: { course?: string }) => r.course !== 'intent'),
  };
  const analysisRoute = route.filter(
    (entry) =>
      !(
        typeof entry === 'object' &&
        entry !== null &&
        'course' in entry &&
        entry.course === 'intent'
      ),
  );
  const numbers = ['', '', '', '', '1', '2', '3', '4', '5', '6а', '6б', '7'];
  const numberedRoute = analysisRoute.map((entry, i) => ({
    ...entry,
    number: numbers[i]!,
    branchOf:
      typeof entry === 'object' && entry !== null && 'branchOf' in entry && entry.branchOf
        ? '6'
        : null,
  }));
  const { steps, branches, extras } = stops(analysis, numberedRoute);
  assert.deepEqual(
    steps.map((s: { id: string }) => s.id),
    analysis.route.map((r: { id: string }) => r.id),
  );
  assert.deepEqual(
    steps.map((s: { num: string }) => s.num),
    ['', '', '', '', '1', '2', '3', '4', '5', '7'],
  );
  assert.deepEqual(
    branches.map((b: { id: string }) => b.id),
    names.branches.map((b: { id: string }) => b.id),
  );
  assert.deepEqual(
    branches.map((b) => [b.num, b.parent]),
    [
      ['6а', '3-star'],
      ['6б', '3-star'],
    ],
  );
  assert.equal(extras[0]?.parent, 'sdd');
  assert.ok([...steps, ...branches, ...extras].every((s) => !/[ПСД]\d/u.test(s.code)));
  for (const guide of [...steps, ...branches, ...extras])
    assert.ok(GOALS[guide.id], `нет фразы «что получите» для ${guide.id}`);
});
