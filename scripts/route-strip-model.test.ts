import assert from 'node:assert/strict';
import { test } from 'node:test';

import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import {
  GROUP_WORDS,
  buildRoute,
  minutes,
  routeState,
  routeLabel,
  routeTotal,
} from '../docs/pages/sdlc-development/route-strip/model.ts';

const ids = [
  ...courseNames.route.map((step) => step.id),
  ...courseNames.branches.map((branch) => branch.id),
];
// 60 s per film except step 3 (no manifest yet): sums stay easy to read.
const durations = Object.fromEntries(
  ids.map((id) => [id, ['3', 'metarepo'].includes(id) ? null : 60]),
);
const steps = buildRoute(courseNames, durations);
const states = (current: string | null, done: string[] = []) =>
  routeState(steps, current, new Set(done)).states;

await test('the route keeps preparation unnumbered and follows steps 1–7 with both branches of step 6', () => {
  assert.deepEqual(
    steps.map((step) => step.code),
    ['П1', 'П2', 'П3', 'П4', 'С1', 'С2', 'С3', 'С4-команда', 'С5', 'С4а', 'С4б', 'Д1'],
  );
  assert.deepEqual(
    steps.filter((step) => step.branchOf).map((step) => [step.code, step.branchOf]),
    [
      ['С4а', '6'],
      ['С4б', '6'],
    ],
  );
  assert.equal(steps[0]!.href, 'p1-zachem.html');
  assert.equal(steps[0]!.title, 'Зачем меняем процесс');
  assert.deepEqual(GROUP_WORDS, { prep: 'Подготовка', practice: 'Практика', after: 'Разработка' });
  assert.deepEqual(
    steps.map((step) => step.number),
    ['', '', '', '', '1', '2', '3', '4', '5', '6а', '6б', '7'],
  );
  assert.equal(routeTotal(steps), 7);
  assert.equal(routeTotal(steps.filter((step) => !step.number)), 0);
  assert.equal(routeLabel(steps[1]!), 'Подготовка\u00a0· Markdown, Git, GitLab');
  assert.equal(routeLabel(steps[1]!, true), 'Подготовка\u00a0· Markdown, Git, GitLab');
  assert.equal(routeLabel(steps[4]!), 'Шаг\u00a01\u00a0· Требования в Git');
  assert.equal(routeLabel(steps[4]!, true), '1\u00a0· Требования в Git');
});

await test('everything before the current step is passed, the rest is ahead', () => {
  const s = states('2');
  assert.deepEqual(
    steps.map((step) => s[step.id]),
    [
      'passed',
      'passed',
      'passed',
      'passed',
      'passed',
      'current',
      'ahead',
      'ahead',
      'ahead',
      'ahead',
      'ahead',
      'ahead',
    ],
  );
  assert.equal(routeState(steps, '2', new Set()).group, 'practice');
});

await test('on a branch page step 5 is passed, the branch is current and the other branch stays ahead and counts as left', () => {
  const state = routeState(steps, '4-new', new Set());
  assert.equal(state.states['3-star'], 'passed');
  assert.equal(state.states['4-new'], 'current');
  assert.equal(state.states['4-legacy'], 'ahead');
  // left: 6а (current) + 6б + 7
  assert.equal(state.leftSeconds, 180);
});

await test('a step with its self-check marked is passed even ahead of the current one', () => {
  const s = states('2', ['3', 'delivery']);
  assert.equal(s['3'], 'passed');
  assert.equal(s['delivery'], 'passed');
  assert.equal(s['2'], 'current');
});

await test('on the map nothing is current; a film without a manifest never enters the sums', () => {
  const state = routeState(steps, null, new Set());
  assert.ok(Object.values(state.states).every((value) => value === 'ahead'));
  assert.equal(state.group, null);
  assert.equal(state.passedSeconds, 0);
  assert.equal(state.leftSeconds, 600);
  const at2 = routeState(steps, '2', new Set());
  // All three preparation films and step 1 are passed by position.
  assert.equal(at2.passedSeconds, 240);
  assert.equal(at2.leftSeconds, 360);
});

await test('minutes round up to a whole minute', () => {
  assert.equal(minutes(61), '≈ 2 мин');
  assert.equal(minutes(60), '≈ 1 мин');
  assert.equal(minutes(0), '≈ 0 мин');
});

await test('on step 7 both branches look passed, but only a branch with its self-check marked counts as passed minutes', () => {
  const bare = routeState(steps, 'delivery', new Set());
  assert.equal(bare.states['4-new'], 'passed');
  assert.equal(bare.states['4-legacy'], 'passed');
  // Preparation and steps 1–5 except step 3 (no manifest) = 7 × 60; unmarked branches count nowhere.
  assert.equal(bare.passedSeconds, 420);
  assert.equal(bare.leftSeconds, 60);
  assert.equal(routeState(steps, 'delivery', new Set(['4-legacy'])).passedSeconds, 480);
});

await test('all preparation parts are regular unnumbered entries whose minutes follow position', () => {
  const preparation = steps.filter((step) => step.group === 'prep');
  assert.equal(preparation.length, 4);
  assert.ok(preparation.every((step) => step.number === '' && !('note' in step)));
  const passed = routeState(steps, 'sdd', new Set());
  assert.equal(passed.states['0a'], 'passed');
  assert.equal(passed.passedSeconds, 120);
  assert.equal(routeState(steps, 'sdd', new Set(['0a'])).passedSeconds, 120);
});

await test('registry numbers remain stable when only part of the route is displayed', () => {
  const reordered = buildRoute(
    {
      ...courseNames,
      route: [
        ...['3-star', '0', 'delivery'].map((id) =>
          courseNames.route.find((step) => step.id === id)!,
        ),
      ],
    },
    {},
  );
  assert.deepEqual(
    reordered.map(({ id, number }) => [id, number]),
    [
      ['3-star', '5'],
      ['4-new', '6а'],
      ['4-legacy', '6б'],
      ['0', ''],
      ['delivery', '7'],
    ],
  );
  assert.equal(routeTotal(reordered), 7);
});
