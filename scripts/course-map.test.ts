import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test, { type TestContext } from 'node:test';

import {
  type CourseNames,
  MAP_END,
  MAP_START,
  FILM_MANIFESTS,
  badge,
  codeOf,
  formatDuration,
  pageOf,
  readCourseNames,
  renderCourseMap,
  revealCourseMapFilm,
  spliceCourseMap,
} from './course-map.ts';

const guide = (key: string, file: string) => ({
  title: `T${key}`,
  short: `S${key}`,
  gain: `G${key}`,
  needs: `N${key}`,
  file,
  oldFile: `old-${file}`,
  goal: `goal${key}`,
  audience: `aud${key}`,
});

const names: CourseNames = {
  courseTitle: 'Учебный маршрут',
  route: [
    { id: '0', code: 'П1', group: 'prep', number: '' },
    { id: '1', code: 'С1', group: 'practice', number: '1' },
  ],
  branches: [{ id: '4-new', code: 'С1а', label: 'new', of: '1', number: '2а', branchOf: '2' }],
  extras: [
    {
      id: 'dark',
      code: 'П1+',
      after: '0',
      title: 'Extra <T>',
      short: 'ES',
      href: 'extra.html#dark',
      gain: 'EG',
      goal: 'goaldark',
      audience: 'auddark',
    },
  ],
  groups: { prep: 'Подготовка', practice: 'Практика & тесты' },
  guides: {
    '0': guide('0', 'g0.html'),
    '1': guide('1', 'g1.html'),
    '4-new': guide('4n', 'g4n.html'),
  },
};

const filmRoot = async (t: TestContext, films: Record<string, unknown>) => {
  const root = await mkdtemp(join(tmpdir(), 'course-map-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [path, body] of Object.entries(films)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), JSON.stringify(body));
  }
  return root;
};

const manifests = {
  'video/block-0/video-manifest.json': { duration: 187 },
  'video/block-r1/video-manifest.json': { duration: 65 },
  'video/block-r4new/video-manifest.json': { duration: 61.5 },
  'video/block-dark-factory/video-manifest.json': { duration: 3599.6 },
};

const MAP_HEAD =
  `${MAP_START}\n<section class="course-map" id="course-map" aria-labelledby="course-map-title"><h2 id="course-map-title">Карта курса</h2>` +
  '<p class="course-map__lead">Подготовка: 4 гайда и дополнение о фабрике. Шаги 1–7, ветви 6а/6б.</p>';

const step = (
  modifier: string,
  code: string,
  number: string,
  id: string,
  title: string,
  facts: string,
) =>
  `<li class="course-map__step${modifier}" id="map-${code}" data-route-id="${id}">${number ? `<span class="course-map__no">${number}</span>` : ''}<div class="course-map__body">${title}<ul class="course-map__facts">${facts}</ul></div></li>`;

const MAP_PREP =
  '<div class="course-map__group"><h3>Подготовка</h3><ol class="course-map__list" role="list">' +
  step(
    '',
    'П1',
    '',
    '0',
    '<h4><a href="g0.html">T0</a></h4>',
    '<li data-film="guides/g0.html" hidden><span>Ролик</span><a href="g0.html#lesson-video">3:07</a></li><li><span>Что получите</span>G0</li><li><b>Нужно</b> N0 · <b>Для кого</b> aud0</li>',
  ) +
  step(
    ' course-map__step--extra',
    'П1+',
    '',
    '0',
    '<p class="course-map__kind">Дополнение</p><h4><a href="extra.html#dark">Extra &lt;T&gt;</a></h4>',
    '<li data-film="guides/extra.html#dark" hidden><span>Ролик</span><a href="extra.html#lesson-video-dark">60:00</a></li><li><span>Что получите</span>EG</li><li><span>Продолжение гайда</span>Подготовка\u00a0· S0</li><li><b>Для кого</b> auddark</li>',
  ) +
  '</ol></div>';

const MAP_PRACTICE =
  '<div class="course-map__group"><h3>Практика &amp; тесты</h3><ol class="course-map__list" role="list">' +
  step(
    '',
    'С1',
    '1',
    '1',
    '<h4><a href="g1.html">T1</a></h4>',
    '<li data-film="guides/g1.html" hidden><span>Ролик</span><a href="g1.html#lesson-video">1:05</a></li><li><span>Что получите</span>G1</li><li><span>Перед этим</span>Подготовка\u00a0· S0</li><li><b>Нужно</b> N1 · <b>Для кого</b> aud1</li>',
  ) +
  '<li class="course-map__branches"><p class="course-map__branch-note">Ветви шага 2 после шага 1: выберите вход по ситуации: «новый продукт», «действующий продукт» или оба.</p><ol class="course-map__list course-map__list--branches" role="list">' +
  step(
    ' course-map__step--branch',
    'С1а',
    '2а',
    '4-new',
    '<h4><a href="g4n.html">T4n</a></h4>',
    '<li data-film="guides/g4n.html" hidden><span>Ролик</span><a href="g4n.html#lesson-video">1:02</a></li><li><span>Что получите</span>G4n</li><li><span>Перед этим</span>1\u00a0· S1</li><li><b>Нужно</b> N4n · <b>Для кого</b> aud4n</li>',
  ) +
  '</ol></li></ol></div>';

await test('every guide id points at its own film manifest', () => {
  assert.deepEqual(FILM_MANIFESTS, {
    '0': 'video/block-0/video-manifest.json',
    '0a': 'docs/pages/sdlc-development/guides/assets/video/video-manifest.json',
    sdd: 'video/block-sdd/video-manifest.json',
    '1': 'video/block-r1/video-manifest.json',
    '2': 'video/block-r2/video-manifest.json',
    '3': 'video/block-r3/video-manifest.json',
    '4-team': 'video/block-team/video-manifest.json',
    '3-star': 'video/block-r4/video-manifest.json',
    '4-new': 'video/block-r4new/video-manifest.json',
    '4-legacy': 'video/block-r4legacy/video-manifest.json',
    metarepo: 'video/block-p4/video-manifest.json',
    delivery: 'video/block-delivery/video-manifest.json',
    dark: 'video/block-dark-factory/video-manifest.json',
    i1: 'video/block-i1/video-manifest.json',
    i2: 'video/block-i2/video-manifest.json',
    i3: 'video/block-i3/video-manifest.json',
    i4: 'video/block-i4/video-manifest.json',
  });
});

await test('formatDuration rounds seconds to minutes:seconds with padded seconds', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(59.6), '1:00');
  assert.equal(formatDuration(61.4), '1:01');
  assert.equal(formatDuration(187), '3:07');
  assert.equal(formatDuration(3600), '60:00');
});

await test('codeOf resolves route steps and branches and rejects unknown ids; pageOf reads the guide file', () => {
  assert.equal(codeOf(names, '1'), 'С1');
  assert.equal(codeOf(names, '4-new'), 'С1а');
  assert.throws(
    () => codeOf(names, 'nope'),
    /course-names\.json: nope is neither a route step nor a branch/u,
  );
  assert.equal(pageOf(names, '4-new'), 'g4n.html');
});

await test('revealCourseMapFilm unhides only the film row of the named page', () => {
  const html = '<li data-film="a.html" hidden>A</li><li data-film="b.html" hidden>B</li>';
  assert.equal(
    revealCourseMapFilm(html, 'b.html', 'assets/video/b.mp4'),
    '<li data-film="a.html" hidden>A</li><li data-film="b.html" data-src="assets/video/b.mp4">B</li>',
  );
  assert.equal(revealCourseMapFilm(html, 'c.html', 'assets/video/c.mp4'), html);
});

await test('spliceCourseMap replaces the block between the markers and keeps the page around it', () => {
  const html = `<p>before</p>${MAP_START}old${MAP_END}<p>after</p>`;
  assert.equal(
    spliceCourseMap(html, `${MAP_START}new${MAP_END}`),
    `<p>before</p>${MAP_START}new${MAP_END}<p>after</p>`,
  );
  assert.throws(() => spliceCourseMap('<p>no markers</p>', 'x'), /place .* where the map belongs/u);
  assert.throws(() => spliceCourseMap(`${MAP_START} only start`, 'x'), /where the map belongs/u);
  assert.throws(() => spliceCourseMap(`${MAP_END}${MAP_START}`, 'x'), /where the map belongs/u);
});

await test('renderCourseMap builds groups, extras, branches and hidden film rows from the names alone', async (t) => {
  const root = await filmRoot(t, manifests);
  const map = await renderCourseMap(names, root);
  assert.doesNotMatch(map, />[0-9]+\+</u);
  assert.equal(map, `${MAP_HEAD}${MAP_PREP}${MAP_PRACTICE}</section>\n${MAP_END}`);
});

await test('renderCourseMap shows no film row for an optional extra whose manifest is absent', async (t) => {
  const root = await filmRoot(t, {
    'video/block-0/video-manifest.json': { duration: 187 },
    'video/block-r1/video-manifest.json': { duration: 65 },
    'video/block-r4new/video-manifest.json': { duration: 61 },
  });
  const map = await renderCourseMap(names, root);
  assert.ok(!map.includes('lesson-video-dark'));
  assert.ok(map.includes('id="map-П1+"'));
  assert.equal((map.match(/<li data-film=/gu) ?? []).length, 3);
});

await test('renderCourseMap fails on a missing required manifest and tolerates a manifest without duration', async (t) => {
  const empty = await filmRoot(t, {});
  await assert.rejects(renderCourseMap(names, empty), { code: 'ENOENT' });
  const noDuration = await filmRoot(t, {
    ...manifests,
    'video/block-r1/video-manifest.json': { duration: 'long' },
  });
  const map = await renderCourseMap(names, noDuration);
  assert.ok(!map.includes('g1.html#lesson-video'));
  assert.ok(map.includes('g0.html#lesson-video">3:07'));
});

await test('guide 0a takes the film length from the last chapter end when its manifest has no duration', async (t) => {
  const only0a: CourseNames = {
    ...names,
    route: [{ id: '0a', code: 'П0', group: 'prep', number: '' }],
    branches: [],
    extras: [],
    guides: { '0a': guide('0a', 'g0a.html') },
  };
  const base = 'docs/pages/sdlc-development/guides/assets/video';
  const root = await filmRoot(t, {
    [`${base}/video-manifest.json`]: {},
    [`${base}/block-0a.chapters.json`]: [{ end: 10 }, { end: 125 }],
  });
  assert.ok((await renderCourseMap(only0a, root)).includes('g0a.html#lesson-video">2:05'));
  const emptyChapters = await filmRoot(t, {
    [`${base}/video-manifest.json`]: {},
    [`${base}/block-0a.chapters.json`]: [],
  });
  assert.ok(!(await renderCourseMap(only0a, emptyChapters)).includes('lesson-video'));
  // A withdrawn film has neither a map row nor route minutes, even with a duration and chapters.
  const withdrawn = await filmRoot(t, {
    [`${base}/video-manifest.json`]: { duration: 301.8, withdrawn: 'не публикуется' },
    [`${base}/block-0a.chapters.json`]: [{ end: 10 }, { end: 125 }],
  });
  assert.ok(!(await renderCourseMap(only0a, withdrawn)).includes('lesson-video'));
  const badChapter = await filmRoot(t, {
    [`${base}/video-manifest.json`]: {},
    [`${base}/block-0a.chapters.json`]: [{ end: 'x' }],
  });
  await assert.rejects(renderCourseMap(only0a, badChapter), /Film chapter end/u);
  const notArray = await filmRoot(t, {
    [`${base}/video-manifest.json`]: {},
    [`${base}/block-0a.chapters.json`]: {},
  });
  await assert.rejects(renderCourseMap(only0a, notArray), /chapters must be an array/u);
});

await test('readCourseNames returns the typed names and rejects a malformed file', async (t) => {
  const path = 'docs/pages/sdlc-development/course-names.json';
  const good = await filmRoot(t, { [path]: names });
  assert.deepEqual(await readCourseNames(good), names);
  const brokenRoute = await filmRoot(t, {
    [path]: { ...names, route: [{ id: '0', group: 'prep' }] },
  });
  await assert.rejects(readCourseNames(brokenRoute), assert.AssertionError);
  const brokenGuide = await filmRoot(t, {
    [path]: { ...names, guides: { '0': { title: 'only' } } },
  });
  await assert.rejects(readCourseNames(brokenGuide), assert.AssertionError);
  for (const field of ['courseTitle', 'route', 'branches', 'extras', 'groups', 'guides']) {
    const missing = await filmRoot(t, {
      [path]: Object.fromEntries(Object.entries(names).filter(([key]) => key !== field)),
    });
    await assert.rejects(readCourseNames(missing), assert.AssertionError, field);
  }
});

await test('a step badge shows its number including branch suffix', () => {
  for (const number of ['', '1', '6а', '7'])
    assert.equal(badge(number), `<span class="course-map__no">${number}</span>`);
});

await test('prep steps show no empty marker circle', async (test) => {
  const map = await renderCourseMap(names, await filmRoot(test, { ...manifests }));
  assert.doesNotMatch(
    map,
    /course-map__no"><\/span>/u,
    'a prep step without a course number must not render an empty badge',
  );
});

await test('map titles break after a nonbreaking hyphen, never inside the word', async (t) => {
  const root = await filmRoot(t, manifests);
  const source = structuredClone(names);
  source.guides['0']!.title = 'Мета\u2011репозиторий продукта';
  for (const course of ['analysis', 'intent'] as const) {
    const map = await renderCourseMap(source, root, course);
    assert.match(map, /<h4><a[^>]+>Мета\u2011<wbr>репозиторий продукта<\/a><\/h4>/u);
    assert.doesNotMatch(map, /<h4>[^]*?Мета\u2011репозиторий/u);
  }
  assert.equal(source.guides['0']!.title, 'Мета\u2011репозиторий продукта');
});
