import assert from 'node:assert/strict';
import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

import {
  codeOf,
  FILM_MANIFESTS,
  pageOf,
  readCourseNames,
  renderCourseMap,
  spliceCourseMap,
  ROUTE_STEPS,
  renderRouteSteps,
} from './course-map.ts';
import { root, execFileAsync, isRecord } from './course-names-contract-fixtures.ts';
import { guideContent } from './guide-content.ts';
import { renderGuide, type GuideFooter } from './learner-guide-test-support.ts';
import {
  buildRoute,
  routeLabel,
  routeState,
} from '../docs/pages/sdlc-development/route-strip/model.ts';
import { renderStrip, STEPS } from '../docs/pages/sdlc-development/route-strip/strip.ts';

const numbered = buildRoute(courseNames, {});
const intentNumbered = buildRoute(courseNames, {}, 'intent');
const labelOf = (id: string, short = true) =>
  routeLabel(
    (id.startsWith('i') ? intentNumbered : numbered).find((step) => step.id === id)!,
    short,
  );
const intentPrev: Record<string, string | null> = { i1: 'metarepo', i2: 'i1', i3: 'i2', i4: 'i3' };
const NUMBERLESS_PART_TITLES = new Set(['block-sdd', 'block-0']); // title cards without «Часть N»

await test('video title generation keeps part numbers without totals and reproduces committed overlays', async (t) => {
  await mkdir(resolve(root, '.cache'), { recursive: true });
  const fixture = await mkdtemp(resolve(root, '.cache/course-names-'));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  for (const block of (await readdir(resolve(root, 'video'))).filter(
    (name) => name.startsWith('block-') && name !== 'block-map',
  )) {
    await t.test(block, async () => {
      const film = `video/${block}/film`;
      const scenesRaw = await readFile(resolve(root, film, 'scenes.json'), 'utf8').catch(
        (): null => null,
      );
      if (!scenesRaw) return;
      const scenes: unknown = JSON.parse(scenesRaw);
      assert.ok(Array.isArray(scenes) && scenes.every(isRecord));
      const titles = scenes.filter((scene) => scene.kind === 'title');
      if (titles.length === 0) return;
      for (const file of [`${film}/scenes.json`, `${film}/tools/build-titles.mjs`]) {
        await mkdir(dirname(resolve(fixture, file)), { recursive: true });
        await copyFile(resolve(root, file), resolve(fixture, file));
      }
      await execFileAsync(process.execPath, [resolve(fixture, film, 'tools/build-titles.mjs')], {
        cwd: root,
      });
      const sceneFiles = (await readdir(resolve(fixture, film, 'compositions'))).filter((file) =>
        file.endsWith('.html'),
      );
      assert.equal(sceneFiles.length, titles.length, 'each part needs a title overlay');
      for (const scene of titles) {
        assert.ok(typeof scene.id === 'string' && typeof scene.step === 'number');
        const file = `compositions/scene-${scene.id}.html`;
        const html = await readFile(resolve(fixture, film, file), 'utf8');
        const text = [...html.matchAll(/text: ("(?:\\.|[^"\\])*")/gu)].map((match) => {
          const value: unknown = JSON.parse(match[1]!);
          assert.ok(typeof value === 'string');
          return value;
        });
        const numberless = NUMBERLESS_PART_TITLES.has(block);
        // Part number without a dangling separator; numberless films show the title only.
        if (!numberless) assert.equal(text[0], `Часть ${scene.step}`, `${block}/${scene.id}: part`);
        const title: unknown = scenes.find((item) => item.n === scene.of)?.title;
        assert.ok(typeof title === 'string');
        assert.ok(
          text
            .slice(numberless ? 0 : 1)
            .join(' ')
            .startsWith(title),
          `${block}/${scene.id}: preserve the part title`,
        );
        if (numberless) assert.ok(!text.some((l) => /^Часть\s/u.test(l)), `${block}/${scene.id}`);
        assert.doesNotMatch(html, / из [0-9]/u, `${block}/${scene.id}: no obsolete totals`);
        assert.equal(
          html,
          await readFile(resolve(root, film, file), 'utf8'),
          `${block}/${file}: regenerate committed compositions`,
        );
      }
    });
  }
});

await test('the course map on the guides index is generated from route and matches the page plates and links', async () => {
  const index = await readFile(
    resolve(root, 'docs/pages/sdlc-development/guides/index.html'),
    'utf8',
  );
  const names = await readCourseNames(root);
  assert.equal(
    index,
    spliceCourseMap(index, await renderCourseMap(names, root)),
    'run: node --experimental-strip-types scripts/course-map.ts --write',
  );
  assert.equal(
    await readFile(resolve(root, ROUTE_STEPS), 'utf8'),
    await renderRouteSteps(names, root),
    'route-steps.json: run node --experimental-strip-types scripts/course-map.ts --write',
  );
  const steps = [...index.matchAll(/id="map-([^"]+)"[^]*?<a href="([^"]+)">([\s\S]*?)<\/a>/gu)].map(
    ([, code, href, title = '']) => [code, href, title.replaceAll('<wbr>', '')],
  );
  const expected = [
    ...names.route.filter((entry) => entry.course !== 'intent').map((entry) => entry.id),
    ...names.branches.map((entry) => entry.id),
  ];
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
  assert.deepEqual(
    names.route.filter((entry) => entry.course !== 'intent').map((entry) => entry.code),
    ['П1', 'П2', 'П3', 'П4', 'С1', 'С2', 'С3', 'С4-команда', 'С5', 'Д1'],
  );
  assert.deepEqual(
    names.route.filter((entry) => entry.course === 'intent').map((entry) => entry.code),
    ['И1', 'И2', 'И3', 'И4'],
  );
  assert.deepEqual(
    names.branches.map((branch) => branch.code),
    ['С4а', 'С4б'],
  );
  assert.match(index, /id="course-map"[^]*С4а/u);
  assert.match(index, /course-map__no">6а<\/span>/u, 'branch badge belongs to step six');
  assert.match(
    index,
    /id="map-П4"[^]*?<li data-film="guides\/p4-metarepository\.html" hidden><span>Ролик<\/span><a href="p4-metarepository\.html#lesson-video">3:45<\/a><\/li>/u,
    'the map shows the film line of the product metarepository page: its manifest is known',
  );
  assert.equal(
    (index.match(/<li data-film="guides\/[^"]+" hidden>/gu) ?? []).length,
    12,
    'every film line (eleven pages and the preparation extra; the П2 film is withdrawn) starts hidden: the build shows it only with the embedded player',
  );
});

await test('the page footer names the code of the next page like the one of the previous page', async () => {
  const names = await readCourseNames();
  for (const [id, stage] of Object.entries(guideContent.stages)) {
    const footer: GuideFooter = { nextHref: '', nextText: '', extraLinks: [] };
    await renderGuide(id, undefined, undefined, footer);
    if (stage.next) {
      assert.ok(
        codeOf(names, stage.next),
        `${id}: next page ${stage.next} has a code in course-names.json`,
      );
      if (!names.branches.some((branch) => branch.of === id)) {
        const following = stage.next.startsWith('i') ? intentNumbered : numbered;
        assert.equal(
          footer.nextText,
          `${routeLabel({ ...following.find((step) => step.id === stage.next)!, title: names.guides[stage.next]!.title }, true)} →`,
          'next link: code · title',
        );
      }
    }
    const current = names.route.findIndex((entry) => entry.id === id);
    const previous =
      names.branches.find((entry) => entry.id === id)?.of ??
      (id in intentPrev ? intentPrev[id] : names.route[current - 1]?.id);
    if (previous) {
      const label = `← ${labelOf(previous)}`;
      assert.ok(
        footer.extraLinks.some((link) =>
          link.includes(`id="prev-stage" rel="prev" href="${pageOf(names, previous)}">${label}`),
        ),
        'previous link: code · title',
      );
    }
  }
});

await test('the stage with branches offers every branch forward, in the strip and in the footer', async () => {
  const names = await readCourseNames();
  const footer: GuideFooter = { nextHref: '', nextText: '', extraLinks: [] };
  await renderGuide('3-star', undefined, undefined, footer);
  const strip = renderStrip(STEPS, routeState(STEPS, '3-star', new Set()), '3-star');
  assert.deepEqual(
    names.branches.map((branch) => [branch.code, branch.label]),
    [
      ['С4а', 'новый продукт'],
      ['С4б', 'действующий продукт'],
    ],
  );
  for (const branch of names.branches) {
    const href = pageOf(names, branch.id);
    const label = `${labelOf(branch.id)} →`;
    assert.ok(
      strip.includes(`class="course-route__dot" href="${href}"`),
      'the strip links every branch',
    );
    assert.ok(
      (footer.nextHref === href && footer.nextText === label) ||
        footer.extraLinks.some((link) => link.includes(`<a href="${href}">${label}</a>`)),
      'the footer links every branch',
    );
  }
  assert.match(
    strip,
    /course-route__edge--next" href="s4a-new\.html"/u,
    'the forward arrow enters the fork at its first branch',
  );
});

await test('the preparation extra shows a film row on the map only when its manifest exists, and the row links to the extra player', async () => {
  const names = await readCourseNames();
  const temp = await mkdtemp(resolve(tmpdir(), 'course-map-dark-'));
  try {
    for (const path of Object.values(FILM_MANIFESTS).filter(
      (path) => !path.includes('dark-factory'),
    )) {
      await mkdir(dirname(resolve(temp, path)), { recursive: true });
      await copyFile(resolve(root, path), resolve(temp, path));
    }
    assert.doesNotMatch(
      await renderCourseMap(names, temp),
      /data-film="guides\/p3-sdd\.html#dark"/u,
      'no manifest, no row',
    );
    await mkdir(resolve(temp, 'video/block-dark-factory'), { recursive: true });
    await writeFile(
      resolve(temp, FILM_MANIFESTS.dark!),
      JSON.stringify({
        file: 'x.mp4',
        sha256: '0'.repeat(64),
        size: 1,
        url: 'https://x',
        duration: 187.4,
      }),
    );
    const map = await renderCourseMap(names, temp);
    assert.match(
      map,
      /<li class="course-map__step course-map__step--extra" id="map-П3\+"[^>]*>[\s\S]*?<li data-film="guides\/p3-sdd\.html#dark" hidden><span>Ролик<\/span><a href="p3-sdd\.html#lesson-video-dark">3:07<\/a><\/li>/u,
    );
    assert.equal(
      [...map.matchAll(/data-film="guides\/p3-sdd\.html"/gu)].length,
      1,
      'the SDD preparation film row stays',
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
