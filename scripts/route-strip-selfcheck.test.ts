import assert from 'node:assert/strict';
import { test } from 'node:test';

import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import { buildRoute, routeLabel } from '../docs/pages/sdlc-development/route-strip/model.ts';
import { allMarked, renderFinale } from '../docs/pages/sdlc-development/route-strip/selfcheck.ts';

const steps = buildRoute(courseNames, {});
const main = steps.filter((step) => step.group !== 'prep' && !step.branchOf).map((step) => step.id);

await test('the route counts as fully marked only with every main step and at least one branch of step 6, without requiring preparation', () => {
  assert.equal(allMarked(steps, new Set(main)), false);
  assert.equal(allMarked(steps, new Set([...main, '4-new'])), true);
  assert.equal(allMarked(steps, new Set(['4-new', '4-legacy'])), false);
  assert.equal(allMarked(steps, new Set([...main, '4-legacy'])), true);
  assert.equal(allMarked(steps, new Set([...main.filter((id) => id !== '2'), '4-new'])), false);
});

await test('the finale lists every number, the film minutes and a link back to the map', () => {
  const html = renderFinale(steps, new Set(), 3192);
  assert.match(html, /<section class="card card--wide route-finale"/u);
  // Nothing marked yet: the card names the route, it does not claim it is passed (Opus, 15.10).
  assert.match(html, />Маршрут курса</u);
  assert.doesNotMatch(html, /Маршрут пройден/u);
  // Unmarked branches passed by position do not enter strip minutes.
  assert.match(html, /ветви без одобрения/u);
  assert.match(html, /7 шагов и подготовка/u);
  const labels = [...html.matchAll(/<li class="[^"]*" title="[^"]*">([^<]+)<\/li>/gu)].map(
    (match) => match[1],
  );
  assert.deepEqual(labels, [
    'Зачем',
    'Git',
    'SDD',
    'Мета‑репозиторий',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6а',
    '6б',
    '7',
  ]);
  assert.doesNotMatch(html, />П\d/u);
  assert.doesNotMatch(html, />Подготовка</u);
  assert.deepEqual(
    [...html.matchAll(/<li class="[^"]*" title="([^"]*)">/gu)].map((match) => match[1]),
    steps.map((step) => routeLabel(step)),
  );
  assert.match(html, /≈ 54 мин роликов/u);
  assert.match(html, /href="index\.html#course-map"/u);
  assert.doesNotMatch(html, /Все шаги отмечены/u);
});

await test('the finale escapes step titles and numbers', () => {
  const odd = [{ ...steps[0]!, title: 'A "B" <i>', number: '<b>' }];
  const html = renderFinale(odd, new Set(), 60);
  assert.match(html, /title="Шаг\u00a0&#60;b&#62;\u00a0· A &#34;B&#34; &#60;i&#62;"/u);
  assert.match(html, />&#60;b&#62;</u);
  assert.doesNotMatch(html, /<[ib]>/u);
});

await test('the finale says every step is marked only when it is', () => {
  const all = renderFinale(steps, new Set([...main, '4-legacy']), 3192);
  assert.match(all, /Все шаги отмечены/u);
  assert.match(all, />Маршрут пройден</u);
});

await test('the finale plays the success click only when asked, after step 7 is marked', () => {
  assert.doesNotMatch(renderFinale(steps, new Set(), 3192), /is-celebrating/u);
  assert.match(
    renderFinale(steps, new Set(['delivery']), 3192, true),
    /<section class="card card--wide route-finale is-celebrating"/u,
  );
});
