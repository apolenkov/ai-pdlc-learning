import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  buildRoute,
  routeLabel,
  routeState,
} from '../docs/pages/sdlc-development/route-strip/model.ts';
import { renderStrip, STEPS_INTENT } from '../docs/pages/sdlc-development/route-strip/strip.ts';
import {
  codeOf,
  FILM_MANIFESTS,
  formatDuration,
  INTENT_INDEX,
  INTENT_MAP_PART,
  pageOf,
  readCourseNames,
  readIntentMapPart,
  readIntentPageSource,
  renderCourseMap,
  renderRouteSteps,
  ROUTE_STEPS,
} from './course-map.ts';
import { guideContent } from './guide-content.ts';
import { pageOutputPaths } from './pages-route-manifest.ts';
import { overview } from '../docs/pages/sdlc-development/guides/content/stage-i-overview.ts';

const root = resolve(import.meta.dirname, '..');
const readSource = (path: string): Promise<string> => readFile(resolve(root, path), 'utf8');
const i4Sources = [
  'docs/pages/sdlc-development/guides/content/stage-i4.ts',
  'docs/pages/sdlc-development/guides/content/stage-i4-acceptance.ts',
];
const readI4 = async () => (await Promise.all(i4Sources.map(readSource))).join('\n');
const NBSP = '\u00a0';
const plain = (text: string): string => text.replaceAll(NBSP, ' ');

function courseGoalLevel() {
  const level = overview.levels.find(({ name }) => name.startsWith('Уровень 3 · '));
  assert.ok(level, 'the overview defines level 3, the intent course goal');
  return level;
}

await test('intent course is registered under the name «Намерение и план»', async () => {
  const names = await readCourseNames();
  assert.ok(names.courses);
  assert.ok(names.courses.intent);
  assert.equal(names.courses.intent.title, `Намерение и${NBSP}план`);
  assert.equal(names.courses.intent.page, 'intent.html');
  assert.deepEqual(names.courses, {
    analysis: { title: names.courseTitle, page: 'index.html' },
    intent: { title: `Намерение и${NBSP}план`, page: 'intent.html' },
  });
  assert.equal(overview.title, `Намерение и${NBSP}план`);
});

await test('intent strip labels use «Намерение и план · Шаг N · название» without «из N»', async () => {
  const names = await readCourseNames();
  const route = buildRoute(names, {}, 'intent');
  assert.deepEqual(
    route.map((step) => step.id),
    ['0', '0a', 'sdd', 'metarepo', 'i1', 'i2', 'i3', 'i4'],
  );
  for (const step of route.filter((entry) => entry.id.startsWith('i'))) {
    const label = routeLabel(step);
    assert.ok(
      label.startsWith(`Намерение и${NBSP}план${NBSP}· Шаг${NBSP}${step.number}${NBSP}· `),
      `course step format: ${label}`,
    );
    assert.ok(!/из[ \u00a0]\d/u.test(label), `no «из N» in ${label}`);
  }
});

await test('intent course has no visible codes, «план работ», «три отметки», «должен/обязан»', async () => {
  const names = await readCourseNames();
  const route = buildRoute(names, {}, 'intent');
  const labels = route.map((step) => routeLabel(step)).join('\n');
  assert.ok(!/[НСП]1/u.test(labels), 'no Н1/С1/П1 codes in intent strip');
  const sources = await Promise.all(
    [
      'docs/pages/sdlc-development/guides/content/stage-i1.ts',
      'docs/pages/sdlc-development/guides/content/stage-i2.ts',
      'docs/pages/sdlc-development/guides/content/stage-i3.ts',
      ...i4Sources,
      'docs/pages/sdlc-development/guides/content/stage-i-overview.ts',
    ].map(readSource),
  );
  const text = plain(sources.join('\n')).toLowerCase();
  for (const banned of ['план работ', 'три отметки', 'должен', 'обязан']) {
    assert.ok(!text.includes(banned), `banned phrase in intent texts: ${banned}`);
  }
});

await test('intent guides are staged, chained i1→i2→i3→i4→analysis, and listed for output', () => {
  for (const id of ['i1', 'i2', 'i3', 'i4'] as const) {
    assert.ok(guideContent.stages[id], `stage ${id} is registered`);
  }
  assert.equal(guideContent.stages.i1.next, 'i2');
  assert.equal(guideContent.stages.i2.next, 'i3');
  assert.equal(guideContent.stages.i3.next, 'i4');
  assert.equal(guideContent.stages.i4.next, '1');
  for (const page of [
    'guides/intent.html',
    'guides/i1-effect.html',
    'guides/i2-bounds.html',
    'guides/i3-plan.html',
    'guides/i4-accept.html',
  ] as const) {
    assert.ok((pageOutputPaths as readonly string[]).includes(page), `${page} is published`);
  }
});

await test('analysis consumers are unchanged: default route and labels stay stable; metarepo uses a non-breaking hyphen', async () => {
  const names = await readCourseNames();
  const route = buildRoute(names, {});
  assert.deepEqual(
    route.map((step) => step.id),
    [
      '0',
      '0a',
      'sdd',
      'metarepo',
      '1',
      '2',
      '3',
      '4-team',
      '3-star',
      '4-new',
      '4-legacy',
      'delivery',
    ],
  );
  const labels = Object.fromEntries(route.map((step) => [step.id, routeLabel(step, true)]));
  const join = (...parts: string[]): string => parts.join(NBSP);
  const expected: Record<string, string> = {
    '0': join('Подготовка', '· Зачем меняем процесс'),
    '0a': join('Подготовка', '· Markdown, Git, GitLab'),
    sdd: join('Подготовка', '· SDD и OpenSpec'),
    metarepo: join('Подготовка', '· Мета‑репозиторий'),
    '1': join('1', '· Требования в Git'),
    '2': join('2', '· Проверяем и согласуем'),
    '3': join('3', '· Изменение в OpenSpec'),
    '4-team': join('4', '· Команда продукта'),
    '3-star': join('5', '· Контекст продукта'),
    '4-new': join('6а', '· Начинаем требования для нового продукта'),
    '4-legacy': join('6б', '· Описываем действующий продукт'),
    delivery: join('7', '· Практикум разработки'),
  };
  assert.deepEqual(labels, expected);
});

await test('intent course page carries the strip hook and the overview copy', async () => {
  const html = await readIntentPageSource(root);
  assert.match(html, /data-course="intent"/u);
  assert.match(html, /data-stage="intent"/u);
  assert.match(html, /<!-- course-map:start -->/u);
  for (const line of [
    overview.stageLabel,
    ...overview.roles.map((role) => role.term),
    ...overview.steps.map((step) => step.name),
  ]) {
    assert.ok(html.includes(line), `intent.html carries overview line: ${line}`);
  }
  const goal = courseGoalLevel().name.replace(/^Уровень (\d+) · (.+)$/u, 'уровня $1 «$2»');
  assert.ok(
    plain(html).includes(
      `Курс доводит команду до ${goal}. Признаки всех уровней на <a href="../intent-maturity-map.html">карте зрелости намерения</a>.`,
    ),
    'the goal level from the overview and its link to the maturity map stay together',
  );
  assert.ok(
    !html.includes('Уровень 1 · Записано'),
    'the page does not repeat the level list from the maturity map',
  );
});

await test('the intent course scale takes its level names from the maturity map and stops at level 3', async () => {
  const map = await readSource('docs/pages/sdlc-development/intent-maturity-map.html');
  const mapLevels = [...map.matchAll(/<h3>([^<]+)<\/h3>/gu)].map((match) => match[1]!.trim());
  const names = overview.levels.map((level) => level.name.replace(/^Уровень \d+ · /u, ''));
  assert.deepEqual(names, ['Записано', 'Проверяемо', 'В репозитории с одобрением']);
  for (const name of names)
    assert.ok(mapLevels.includes(name), `maturity map has the level «${name}»`);
  assert.match(
    courseGoalLevel().sign,
    /Пройти курс.+достичь этого уровня/u,
    'the course states that it brings the learner to level 3',
  );
  const i4 = await readI4();
  assert.match(i4, /достичь уровня 3 «В/u, 'the last lesson names level 3 as the course goal');
});

await test('the intent course verifies structure with the real linter and keeps the manual meaning check (TASK-685)', async () => {
  const i4 = plain(await readI4());
  assert.ok(i4.includes('intent:lint'), 'step 4 names the real intent:lint command');
  assert.ok(i4.includes('--mode stage1'), 'the command runs in the stage-1 mode');
  assert.doesNotMatch(i4, /--mode analysis/u, 'the stage-1 course does not use the analysis mode');
  assert.match(
    i4,
    /<pre><code>npm run intent:lint -- [^<]*--mode stage1<\/code><\/pre>/u,
    'the command is one copyable terminal line',
  );
  assert.ok(
    i4.includes('intent lint passed (режим stage1)'),
    'the expected linter output is named',
  );
  assert.ok(
    i4.includes('standards/sdlc-analysis-standard'),
    'the working directory of the standard is named',
  );
  assert.match(i4, /чек-лист[а-яё]* смысла/u, 'the manual meaning checklist stays a separate item');
  assert.doesNotMatch(
    i4,
    /ручн[а-яё]* чек-лист[а-яё]* структуры/iu,
    'the manual structure checklist does not return in place of the linter',
  );
  const linked = [
    'docs/pages/sdlc-development/guides/content/stage-i2.ts',
    'docs/pages/sdlc-development/guides/intent.html',
    'docs/pages/sdlc-development/guides/examples/intent-plan/intent-template.md',
    'docs/pages/sdlc-development/guides/examples/intent-plan/weak-complete-intent.md',
  ];
  for (const file of linked) {
    const text = plain(await readSource(file));
    assert.match(
      text,
      /линтер[^]{0,600}i4-accept\.html/iu,
      `${file}: names the linter and links to the step 4 command`,
    );
    assert.doesNotMatch(
      text,
      /ручн[а-яё]* чек-лист[а-яё]* структуры/iu,
      `${file}: does not promise a manual structure checklist`,
    );
  }
});

await test('the intent course page carries the generated intent map', async () => {
  const page = await readSource(INTENT_INDEX);
  assert.ok(
    !page.includes('<section class="course-map"'),
    'the generated map is a separate part, so the page stays below the size limit (TASK-718)',
  );
  const slot = page.match(/<!-- course-map:start -->([^]*?)<!-- course-map:end -->/u);
  assert.ok(slot, 'the hand-written page keeps the map slot between the markers');
  assert.match(
    slot[1]!,
    /^\s*<!--[^]*?-->\s*$/u,
    'only the generated-part note sits between the markers: the build replaces everything between them, so authored text there would disappear (scripts/build-learning-pages.ts)',
  );
  const names = await readCourseNames(root);
  const generated = await renderCourseMap(names, root, 'intent');
  assert.equal(
    await readIntentMapPart(root),
    generated,
    `run: node --experimental-strip-types scripts/course-map.ts --write (${INTENT_MAP_PART})`,
  );
  const intent = await readIntentPageSource(root);
  assert.equal(
    page.split('<!-- course-map:start -->').length - 1,
    1,
    'the hand-written page keeps exactly one map slot',
  );
  const steps = [
    ...intent.matchAll(/id="map-([^"]+)"[^]*?<a href="([^"]+)">([\s\S]*?)<\/a>/gu),
  ].map(([, code, href, title = '']) => [code, href, title.replaceAll('<wbr>', '')]);
  const expected = names.route
    .filter((entry) => entry.group === 'prep' || entry.course === 'intent')
    .map((entry) => entry.id);
  assert.deepEqual(
    steps.map(([code]) => code).sort(),
    [...expected.map((id) => codeOf(names, id)), ...names.extras.map((extra) => extra.code)].sort(),
  );
  for (const id of expected) {
    assert.deepEqual(
      steps.find(([code]) => code === codeOf(names, id)),
      [codeOf(names, id), pageOf(names, id), names.guides[id]!.title],
    );
  }
  // Every intent step now has a film: the map names its page, the player anchor and the manifest duration.
  const intentSteps = names.route.filter((entry) => entry.course === 'intent');
  for (const entry of intentSteps) {
    const page = pageOf(names, entry.id);
    const parsed: unknown = JSON.parse(
      await readFile(resolve(root, FILM_MANIFESTS[entry.id]!), 'utf8'),
    );
    assert.ok(parsed !== null && typeof parsed === 'object' && 'duration' in parsed);
    const { duration } = parsed;
    assert.ok(typeof duration === 'number', `manifest of ${entry.id} has a numeric duration`);
    assert.ok(
      intent.includes(
        `<li data-film="guides/${page}" hidden><span>Ролик</span><a href="${page}#lesson-video">${formatDuration(duration)}</a></li>`,
      ),
      `the map names the film of ${entry.id}`,
    );
  }
  assert.doesNotMatch(
    intent,
    /data-film="guides\/i\d[^"]*" data-src=/u,
    'a film row opens only when the player is embedded, not from the manifest alone',
  );
});

await test('intent pages return to the course route like every course page (TASK-563/1)', async () => {
  const intentFiles = [
    'docs/pages/sdlc-development/guides/intent.html',
    'docs/pages/sdlc-development/guides/i1-effect.html',
    'docs/pages/sdlc-development/guides/i2-bounds.html',
    'docs/pages/sdlc-development/guides/i3-plan.html',
    'docs/pages/sdlc-development/guides/i4-accept.html',
  ];
  for (const file of intentFiles) {
    const html = await readSource(file);
    assert.match(html, /data-catalog-return/u, `${file} keeps the catalog return`);
    assert.ok(html.includes('К маршруту курса'), `${file} returns to the course route`);
    assert.ok(!html.includes('· Анализ'), `${file} does not point at analysis`);
  }
});

await test('intent strip shows no route minutes until the course has its own films (TASK-563/2)', async () => {
  const names = await readCourseNames();
  // Preparation films exist, intent films do not yet: the misleading prep-only sum must stay hidden.
  const durations = { '0': 404.3, '0a': 300.5, sdd: 233.5 };
  const steps = buildRoute(names, durations, 'intent');
  assert.ok(steps.some((step) => step.course === 'intent' && step.seconds == null));
  const onMap = renderStrip(steps, routeState(steps, null, new Set()), null);
  assert.doesNotMatch(onMap, /роликов/u, 'no route minutes without intent films (map)');
  assert.doesNotMatch(onMap, /весь маршрут/u, 'no whole-route line without intent films (map)');
  const onStep = renderStrip(steps, routeState(steps, 'i1', new Set()), 'i1');
  assert.doesNotMatch(onStep, /роликов/u, 'no route minutes without intent films (step)');
  // Once the first intent film lands (manifest duration, as in analysis), the minutes return.
  const withFilm = buildRoute(names, { ...durations, i1: 180 }, 'intent');
  const withFilmHtml = renderStrip(withFilm, routeState(withFilm, null, new Set()), null);
  assert.match(withFilmHtml, /роликов/u, 'minutes return with an intent film');
  // Analysis keeps its minutes (byte-identical behaviour).
  const analysis = buildRoute(names, durations);
  assert.match(renderStrip(analysis, routeState(analysis, null, new Set()), null), /весь маршрут/u);
});

await test('intent course has no OS-specific note (TASK-563/3)', async () => {
  const intent = await readIntentPageSource(root);
  assert.doesNotMatch(intent, /platform-note/u, 'no platform note on the intent course page');
  assert.doesNotMatch(
    intent,
    /Инструкции для Windows, Linux и macOS/u,
    'no OS remainder from the analysis course',
  );
  for (const file of [
    'docs/pages/sdlc-development/guides/i1-effect.html',
    'docs/pages/sdlc-development/guides/i2-bounds.html',
    'docs/pages/sdlc-development/guides/i3-plan.html',
    'docs/pages/sdlc-development/guides/i4-accept.html',
  ]) {
    const html = await readSource(file);
    assert.doesNotMatch(html, /Инструкции для Windows, Linux и macOS/u, file);
  }
});

await test('intent route minutes follow the release switch and are shown once the films are released (TASK-563/9)', async () => {
  type RouteJson = { course?: string; seconds: number | null }[];
  const parse = (json: string): RouteJson => {
    const value: unknown = JSON.parse(json);
    assert.ok(Array.isArray(value));
    const steps: unknown[] = value;
    return steps.map((step) => {
      assert.ok(step && typeof step === 'object' && 'seconds' in step);
      const { seconds } = step;
      assert.ok(seconds === null || typeof seconds === 'number');
      const course = 'course' in step && typeof step.course === 'string' ? step.course : undefined;
      return course === undefined ? { seconds } : { course, seconds };
    });
  };
  const names = await readCourseNames();
  const minutesOf = (json: string): (number | null)[] =>
    parse(json)
      .filter((step) => step.course === 'intent')
      .map((step) => step.seconds);
  // The films are published (Registry readback 5/5): the generated and the committed route carry the manifest durations.
  const released = await renderRouteSteps(names);
  assert.ok(minutesOf(released).every((seconds) => (seconds ?? 0) > 0));
  assert.equal(
    await readSource(ROUTE_STEPS),
    released,
    'run: node --experimental-strip-types scripts/course-map.ts --write',
  );
  // What the browser strip renders from the committed route: the minutes of the films are on the intent map and the steps.
  for (const id of [null, 'i1', 'i4']) {
    const html = renderStrip(STEPS_INTENT, routeState(STEPS_INTENT, id, new Set()), id);
    assert.match(html, /роликов|весь маршрут|пройдено ≈/u, `minutes on ${id ?? 'the intent map'}`);
  }
  // The gate is a switch, not dead code: with the films unreleased the intent minutes disappear again.
  const hidden = await renderRouteSteps(names, root, false);
  assert.deepEqual(minutesOf(hidden), [null, null, null, null]);
  // Analysis keeps its minutes.
  assert.ok(parse(released).some((step) => !step.course && (step.seconds ?? 0) > 0));
});
