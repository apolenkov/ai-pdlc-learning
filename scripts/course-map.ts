import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { escapeHtml } from './site-navigation-contract.ts';

import {
  buildRoute,
  inCourse,
  routeLabel,
  type CourseId,
} from '../docs/pages/sdlc-development/route-strip/model.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = 'docs/pages/sdlc-development/course-names.json';
const INDEX = 'docs/pages/sdlc-development/guides/index.html';
export const MAP_START = '<!-- course-map:start -->';
export const MAP_END = '<!-- course-map:end -->';

type Guide = {
  title: string;
  short: string;
  gain: string;
  needs: string;
  file: string;
  oldFile: string;
  goal: string;
  audience: string;
};
type RouteEntry = {
  id: string;
  code: string;
  number: string;
  group: string;
  course?: string;
};
type Branch = {
  id: string;
  code: string;
  number: string;
  branchOf: string;
  label: string;
  of: string;
};
type Extra = {
  id: string;
  code: string;
  after: string;
  title: string;
  short: string;
  href: string;
  gain: string;
  goal: string;
  audience: string;
};
export type CourseNames = {
  courseTitle: string;
  courses?: Record<string, { title: string; page: string }>;
  route: RouteEntry[];
  branches: Branch[];
  extras: Extra[];
  groups: Record<string, string>;
  guides: Record<string, Guide>;
};

/** Guide id → manifest of its film, relative to the repository root. */
export const FILM_MANIFESTS: Record<string, string> = {
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
  /** Extra of SDD preparation: its manifest appears with the film, so the map shows no film row until then. */
  dark: 'video/block-dark-factory/video-manifest.json',
  /** Intent course steps: the manifest appears with the film, so the map shows no row until the upload and fetch land. */
  i1: 'video/block-i1/video-manifest.json',
  i2: 'video/block-i2/video-manifest.json',
  i3: 'video/block-i3/video-manifest.json',
  i4: 'video/block-i4/video-manifest.json',
};

/** Legacy code retained only for stable map anchors. */
export const codeOf = (names: CourseNames, id: string): string => {
  const code =
    names.route.find((entry) => entry.id === id)?.code ??
    names.branches.find((entry) => entry.id === id)?.code;
  if (!code) throw new Error(`course-names.json: ${id} is neither a route step nor a branch`);
  return code;
};

/** Page file of a guide, as written in course-names.json. */
export const pageOf = (names: CourseNames, id: string): string => names.guides[id]!.file;

export const formatDuration = (seconds: number): string => {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

const filmDuration = async (id: string, root: string, optional = false): Promise<number | null> => {
  // No manifest yet (intent films land later): the map shows no film row, like the optional extra.
  const path = FILM_MANIFESTS[id];
  if (!path) return null;
  const text = await readFile(resolve(root, path), 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (optional && error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (text === undefined) return null;
  const manifest: unknown = JSON.parse(text);
  // A withdrawn film is not published: no film row on the map and no minutes in the route strip.
  if (manifest && typeof manifest === 'object' && 'withdrawn' in manifest) return null;
  if (
    manifest &&
    typeof manifest === 'object' &&
    'duration' in manifest &&
    typeof manifest.duration === 'number'
  )
    return manifest.duration;
  if (id !== '0a') return null;
  const chapters: unknown = JSON.parse(
    await readFile(
      resolve(root, 'docs/pages/sdlc-development/guides/assets/video/block-0a.chapters.json'),
      'utf8',
    ),
  );
  assert.ok(Array.isArray(chapters), 'Film chapters must be an array');
  const values: unknown[] = chapters;
  const last = values.at(-1);
  if (last === undefined) return null;
  assert.ok(
    last && typeof last === 'object' && 'end' in last && typeof last.end === 'number',
    'Film chapter end',
  );
  return last.end;
};

type MapItem = {
  code: string;
  number: string;
  routeId: string;
  title: string;
  href: string;
  gain: string;
  /** An extra continues its guide: it names that guide instead of «Перед этим» and has no «Нужно» line. */
  needs: string | null;
  audience: string;
  previous: string | null;
  duration: number | null;
  film?: string;
  extraId?: string;
  modifier?: string | undefined;
};

export const badge = (number: string): string =>
  `<span class="course-map__no">${escapeHtml(number)}</span>`;

const stepItem = (item: MapItem): string => {
  assert.ok(item.audience.trim(), `Course map: empty audience for ${item.code}`);
  const before = item.previous
    ? `<li><span>${item.needs === null ? 'Продолжение гайда' : 'Перед этим'}</span>${escapeHtml(item.previous)}</li>`
    : '';
  const needs = item.needs === null ? '' : `<b>Нужно</b> ${escapeHtml(item.needs)} · `;
  const key = item.extraId ? `guides/${item.film}#${item.extraId}` : `guides/${item.film}`;
  const film =
    item.duration === null || !item.film
      ? ''
      : `<li data-film="${key}" hidden><span>Ролик</span><a href="${item.film}#lesson-video${item.extraId ? `-${item.extraId}` : ''}">${formatDuration(item.duration)}</a></li>`;
  const marker = item.number ? badge(item.number) : '';
  // An extra is an addition to its guide, not a fifth preparation part (hubs-03): it says so above its title.
  const kind = item.modifier === 'extra' ? '<p class="course-map__kind">Дополнение</p>' : '';
  return `<li class="course-map__step${item.modifier ? ` course-map__step--${item.modifier}` : ''}" id="map-${escapeHtml(item.code)}" data-route-id="${escapeHtml(item.routeId)}">${marker}<div class="course-map__body">${kind}<h4><a href="${item.href}">${escapeHtml(item.title).replaceAll('\u2011', '\u2011<wbr>')}</a></h4><ul class="course-map__facts">${film}<li><span>Что получите</span>${escapeHtml(item.gain)}</li>${before}<li>${needs}<b>Для кого</b> ${escapeHtml(item.audience)}</li></ul></div></li>`;
};

/** The map names a film only where the player is embedded: addGuideVideo reveals the line of its page with the mp4 for the hover preview, so a build without the mp4 keeps it hidden. */
export const revealCourseMapFilm = (html: string, page: string, src: string): string =>
  html.replace(`<li data-film="${page}" hidden>`, `<li data-film="${page}" data-src="${src}">`);

/** The «Карта курса» block: built only from `route`, `branches` and `extras`, so numbers and names cannot drift from the page plates. */
export const renderCourseMap = async (
  names: CourseNames,
  root: string = ROOT,
  courseId: CourseId = 'analysis',
): Promise<string> => {
  const entries = names.route.filter((entry) => inCourse(entry, courseId));
  const route = buildRoute(names, {}, courseId);
  const stepOf = (id: string) => route.find((step) => step.id === id)!;
  const before = (id: string): string | null => {
    if (id === 'i1')
      return 'подготовка «Markdown, Git и GitLab»; SDD и мета‑репозиторий — по желанию';
    const index = entries.findIndex((entry) => entry.id === id);
    const branch = names.branches.find((entry) => entry.id === id);
    const prevId = branch?.of ?? entries[index - 1]?.id;
    return prevId ? routeLabel(stepOf(prevId), true) : null;
  };
  const guideItem = async (id: string, modifier?: string): Promise<string> =>
    stepItem({
      code: codeOf(names, id),
      number: stepOf(id).number,
      routeId: id,
      title: names.guides[id]!.title,
      href: pageOf(names, id),
      gain: names.guides[id]!.gain,
      needs: names.guides[id]!.needs,
      audience: names.guides[id]!.audience,
      previous: before(id),
      duration: await filmDuration(id, root),
      film: pageOf(names, id),
      modifier,
    });
  const groups = [...new Set(entries.map((entry) => entry.group))];
  const blocks: string[] = [];
  for (const group of groups) {
    const items: string[] = [];
    for (const entry of entries.filter((item) => item.group === group)) {
      items.push(await guideItem(entry.id));
      for (const extra of names.extras.filter((item) => item.after === entry.id)) {
        items.push(
          stepItem({
            code: extra.code,
            number: '',
            routeId: entry.id,
            title: extra.title,
            href: extra.href,
            gain: extra.gain,
            needs: null,
            audience: extra.audience,
            previous: routeLabel(stepOf(entry.id), true),
            duration: await filmDuration(extra.id, root, true),
            film: extra.href.split('#')[0]!,
            extraId: extra.id,
            modifier: 'extra',
          }),
        );
      }
      const branches = names.branches.filter((item) => item.of === entry.id);
      if (branches.length) {
        const nested: string[] = [];
        for (const branch of branches) nested.push(await guideItem(branch.id, 'branch'));
        items.push(
          `<li class="course-map__branches"><p class="course-map__branch-note">Ветви шага ${stepOf(branches[0]!.id).branchOf} после шага ${stepOf(entry.id).number}: выберите вход по ситуации: «новый продукт», «действующий продукт» или оба.</p><ol class="course-map__list course-map__list--branches" role="list">${nested.join('')}</ol></li>`,
        );
      }
    }
    blocks.push(
      `<div class="course-map__group"><h3>${escapeHtml(names.groups[group]!)}</h3><ol class="course-map__list" role="list">${items.join('')}</ol></div>`,
    );
  }
  const lead =
    courseId === 'intent'
      ? 'После «Markdown, Git и GitLab» можно перейти к шагу 1. За четыре шага вы опишете проблему, эффект и границы, составите план и передадите его на проверку и одобрение.'
      : 'Подготовка: 4 гайда и дополнение о фабрике. Шаги 1–7, ветви 6а/6б.';
  return `${MAP_START}\n<section class="course-map" id="course-map" aria-labelledby="course-map-title"><h2 id="course-map-title">Карта курса</h2><p class="course-map__lead">${lead}</p>${blocks.join('')}</section>\n${MAP_END}`;
};

const hasStringFields = (value: unknown, fields: readonly string[]): boolean =>
  !!value &&
  typeof value === 'object' &&
  fields.every((field) => field in value && typeof Reflect.get(value, field) === 'string');

export const readCourseNames = async (root: string = ROOT): Promise<CourseNames> => {
  const names: unknown = JSON.parse(await readFile(resolve(root, NAMES), 'utf8'));
  assert.ok(names && typeof names === 'object', 'Course names must be an object');
  assert.ok(
    'courseTitle' in names && typeof names.courseTitle === 'string' && names.courseTitle.trim(),
    'Course title',
  );
  assert.ok('route' in names && Array.isArray(names.route), 'Course route');
  assert.ok('branches' in names && Array.isArray(names.branches), 'Course branches');
  assert.ok('extras' in names && Array.isArray(names.extras), 'Course extras');
  assert.ok('groups' in names && names.groups && typeof names.groups === 'object', 'Course groups');
  assert.ok('guides' in names && names.guides && typeof names.guides === 'object', 'Course guides');
  const route: unknown[] = names.route;
  const branches: unknown[] = names.branches;
  const extras: unknown[] = names.extras;
  const groups: [string, unknown][] = Object.entries(names.groups);
  const guides: [string, unknown][] = Object.entries(names.guides);
  assert.ok(
    route.every((entry): entry is RouteEntry =>
      hasStringFields(entry, ['id', 'code', 'number', 'group']),
    ),
  );
  assert.ok(
    branches.every((entry): entry is Branch =>
      hasStringFields(entry, ['id', 'code', 'number', 'branchOf', 'label', 'of']),
    ),
  );
  assert.ok(
    extras.every((entry): entry is Extra =>
      hasStringFields(entry, [
        'id',
        'code',
        'after',
        'title',
        'short',
        'href',
        'gain',
        'goal',
        'audience',
      ]),
    ),
  );
  assert.ok(groups.every((entry): entry is [string, string] => typeof entry[1] === 'string'));
  assert.ok(
    guides.every((entry): entry is [string, Guide] =>
      hasStringFields(entry[1], [
        'title',
        'short',
        'gain',
        'needs',
        'file',
        'oldFile',
        'goal',
        'audience',
      ]),
    ),
  );
  if ('courses' in names) {
    const courses: unknown = names.courses;
    assert.ok(courses && typeof courses === 'object', 'Course pages must be an object');
    assert.ok(
      Object.values(courses).every((entry: unknown) => hasStringFields(entry, ['title', 'page'])),
      'Course pages need title and page',
    );
  }
  return {
    ...names,
    courseTitle: names.courseTitle,
    route,
    branches,
    extras,
    groups: Object.fromEntries(groups),
    guides: Object.fromEntries(guides),
  };
};

/** `node scripts/course-map.ts --write` writes the block into guides/index.html and the intent map part; the tests fail when either differs from the generated block. */
export const spliceCourseMap = (html: string, map: string, source: string = INDEX): string => {
  const start = html.indexOf(MAP_START);
  const end = html.indexOf(MAP_END);
  if (start < 0 || end < start)
    throw new Error(`${source}: place ${MAP_START} and ${MAP_END} where the map belongs`);
  return `${html.slice(0, start)}${map}${html.slice(end + MAP_END.length)}`;
};

export const ROUTE_STEPS = 'docs/pages/sdlc-development/guides/route-steps.json';
/** Steps of the sticky route strip with film seconds (null = no manifest duration); the page bundle reads only this file. */
/** Intent films exist as manifests but are not published (Registry upload and the owner's word are pending): until this is true, the route strip shows no intent minutes. Flip it together with the release, then run `course-map.ts --write`. */
export const INTENT_FILMS_RELEASED = true;

export const renderRouteSteps = async (
  names: CourseNames,
  root: string = ROOT,
  intentFilmsReleased: boolean = INTENT_FILMS_RELEASED,
): Promise<string> => {
  const ids = [...names.route.map((step) => step.id), ...names.branches.map((branch) => branch.id)];
  const unreleased = new Set(
    intentFilmsReleased
      ? []
      : names.route.filter((step) => step.course === 'intent').map((step) => step.id),
  );
  const seconds = Object.fromEntries(
    await Promise.all(
      ids.map(
        async (id) => [id, unreleased.has(id) ? null : await filmDuration(id, root)] as const,
      ),
    ),
  );
  const steps = buildRoute(names, seconds);
  for (const step of buildRoute(names, seconds, 'intent'))
    if (!steps.some((entry) => entry.id === step.id)) steps.push(step);
  return `${JSON.stringify(steps, null, 2)}\n`;
};

export const INTENT_INDEX = 'docs/pages/sdlc-development/guides/intent.html';
/**
 * The intent course map lives in its own generated part (TASK-718): the hand-written page has only
 * empty `course-map:start/end` markers, so it stays below the agent-size-guard limit; the build
 * splices this part in. Written by `course-map.ts --write`, never edited by hand.
 */
export const INTENT_MAP_PART = 'docs/pages/sdlc-development/guides/intent/course-map.html';

/** The generated intent map part. */
export const readIntentMapPart = async (root: string = ROOT): Promise<string> =>
  readFile(resolve(root, INTENT_MAP_PART), 'utf8');

/** The intent page as the build publishes it: the hand-written page with its generated map spliced in. */
export const readIntentPageSource = async (root: string = ROOT): Promise<string> =>
  spliceCourseMap(
    await readFile(resolve(root, INTENT_INDEX), 'utf8'),
    await readIntentMapPart(root),
    INTENT_INDEX,
  );

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--write')) {
  const path = resolve(ROOT, INDEX);
  const names = await readCourseNames();
  await writeFile(
    path,
    spliceCourseMap(await readFile(path, 'utf8'), await renderCourseMap(names)),
  );
  const intentPage = await readFile(resolve(ROOT, INTENT_INDEX), 'utf8');
  if (!intentPage.includes(MAP_START) || !intentPage.includes(MAP_END))
    throw new Error(`${INTENT_INDEX}: place ${MAP_START} and ${MAP_END} where the map belongs`);
  await writeFile(resolve(ROOT, INTENT_MAP_PART), await renderCourseMap(names, ROOT, 'intent'));
  await writeFile(resolve(ROOT, ROUTE_STEPS), await renderRouteSteps(names));
}
