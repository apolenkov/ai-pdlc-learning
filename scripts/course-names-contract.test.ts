import assert from 'node:assert/strict';
import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import test from 'node:test';

import { placeHtml, planLearningSite, redirectStub, retiredPages } from './build-learning-pages.ts';
import * as metaGuide from './build-metarepository-guide.ts';
import { root, execFileAsync, isRecord } from './course-names-contract-fixtures.ts';
import { resolveCourseNames } from './course-names.ts';
import { guideContent } from './guide-content.ts';
import { pageRedirects, retiredHome, retiredPageRedirects } from './pages-route-manifest.ts';
import { buildRoute, routeLabel } from '../docs/pages/sdlc-development/route-strip/model.ts';

const namesPath = 'docs/pages/sdlc-development/course-names.json';
const numbered = buildRoute(courseNames, {});
const guideNames: Record<string, { title: string; oldFile: string; file: string }> =
  courseNames.guides;

const routes = {
  '0': 'p1-zachem.html',
  '0a': 'p2-git.html',
  '1': 's1-git.html',
  '2': 's2-review.html',
  '3': 's3-openspec.html',
  '3-star': 's4-product.html',
  '4-new': 's4a-new.html',
  '4-team': 's4-team.html',
  '4-legacy': 's4b-legacy.html',
  sdd: 'p3-sdd.html',
  metarepo: 'p4-metarepository.html',
  delivery: 'd1-delivery.html',
} as const;

function links(html: string) {
  const anchors = html.matchAll(/<a\s+((?:[^"'>]|"[^"]*"|'[^']*')*)>([^]*?)<\/a>/giu);
  return Array.from(anchors, ([, attributes = '', label = '']) => {
    const attrs = new Map<string, string>();
    for (const [, name, double, single, bare] of attributes.matchAll(
      /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gu,
    )) {
      attrs.set(name!.toLowerCase(), double ?? single ?? bare ?? '');
    }
    return {
      href: attrs.get('href'),
      opensCard: attrs.get('class')?.split(/\s+/u).includes('route-open'),
      label: label.replaceAll('<wbr>', ''),
    };
  });
}

function assertIndexGuides(source: string) {
  const index = source.replace(/<template\b[^>]*>[^]*?<\/template>/giu, '');
  const map = index.match(/<!-- course-map:start -->([^]*?)<!-- course-map:end -->/u)?.[1];
  assert.ok(map, 'the course index has a map');
  const withoutComments = (html: string) => html.replace(/<!--[^]*?-->/gu, '');
  const mapLinks = [...withoutComments(map).matchAll(/<h4\b[^>]*>([^]*?)<\/h4>/giu)].flatMap(
    ([, heading]) => links(heading!),
  );
  const page = withoutComments(index);
  const base = 'https://course.invalid/guides/';
  const cardUrls = links(page)
    .filter((link) => link.opensCard && link.href)
    .map((link) => new URL(link.href!, base).href.split(/[?#]/u)[0]);
  const cards = [
    ...page.matchAll(
      /<(article|aside)\b[^>]*>[^]*?<\/\1>|<section id="implementation"[^>]*>[^]*?<\/section>/gu,
    ),
  ].map(([html]) => ({
    heading: html.match(/<h2\b[^>]*>([^<]*)<\/h2>/u)?.[1],
    headings: [...html.matchAll(/<h([23])\b[^>]*>([^<]*)<\/h\1>/gu)].map((match) => match[2]),
    routes: links(html)
      .filter((link) => link.opensCard)
      .map((link) => link.href),
  }));
  function assertMapHeading(route: string, title: string) {
    assert.deepEqual(
      mapLinks.filter((link) => link.href === route).map((link) => link.label),
      [title],
      `${route}: one map heading links to the stable route under the guide title`,
    );
  }
  const prep = courseNames.route.filter((entry) => entry.group === 'prep');
  for (const { id } of prep) {
    const guide = guideNames[id];
    assert.ok(guide, `${id}: prep guide is registered`);
    const { file, title } = guide;
    assertMapHeading(file, title);
    assert.ok(!cardUrls.includes(base + file), `${file}: no duplicate prep card`);
    assert.ok(
      !cards.some((card) => card.headings.includes(title)),
      `${file}: no separate prep heading`,
    );
  }
  for (const [id, route] of Object.entries(routes)) {
    const { file, title } = guideNames[id]!;
    assert.equal(file, route, `${id}: registry file matches the stable route`);
    if (prep.some((entry) => entry.id === id)) continue;
    assertMapHeading(route, title);
    const matches = cards.filter((card) => card.routes.includes(route) || card.heading === title);
    assert.ok(matches.length > 0, `${route}: detailed step card is missing`);
    for (const card of matches) {
      assert.equal(card.heading, title, `${route}: card heading`);
      assert.deepEqual(card.routes, [route], `${route}: card link`);
    }
  }
}

await test('the course index names each guide at its stable route and keeps preparation in the map', async () => {
  const index = resolveCourseNames(
    await readFile(resolve(root, 'docs/pages/sdlc-development/guides/index.html'), 'utf8'),
  );
  assertIndexGuides(index);
  const prep = courseNames.guides['0'];
  assert.throws(
    () => assertIndexGuides(index + `<article><h3>${prep.title}</h3></article>`),
    /separate prep heading/u,
  );
  assert.throws(
    () =>
      assertIndexGuides(
        index + `<aside><a class="route-open" href="./${prep.file}">Открыть</a></aside>`,
      ),
    /duplicate prep card/u,
  );
  for (const hidden of [
    index
      .replace('<!-- course-map:start -->', '<template><!-- course-map:start -->')
      .replace('<!-- course-map:end -->', '<!-- course-map:end --></template>'),
    index
      .replace('<!-- course-map:start -->', '<!-- course-map:start --><template>')
      .replace('<!-- course-map:end -->', '</template><!-- course-map:end -->'),
  ])
    assert.throws(() => assertIndexGuides(hidden), /has a map|one map heading/u);
});

await test('guide titles and redirects match their stable routes', async () => {
  const directory = resolve(root, 'docs/pages/sdlc-development');
  const markdown = await metaGuide.readMetarepositoryMarkdown(resolve(directory, 'guides'));
  const meta = metaGuide.renderMetarepositoryGuide(markdown);
  for (const [id, route] of Object.entries(routes)) {
    const guideName = guideNames[id];
    assert.ok(guideName, `${id}: guide name exists`);
    const title = guideName.title;
    const heading = routeLabel({ ...numbered.find((step) => step.id === id)!, title });
    const html =
      id === 'metarepo' ? meta : await readFile(resolve(directory, 'guides', route), 'utf8');
    assert.ok(html.includes(`data-stage="${id}"`), `${route}: stable data key`);
    assert.equal(html.match(/<h1[^>]*>([^]*?)<\/h1>/u)?.[1], heading, `${route}: H1`);
    assert.ok(html.includes(`<title>${heading} · `), `${route}: document title`);
    const old = guideName.oldFile;
    assert.deepEqual(
      pageRedirects.find((item) => item.outputPath === `guides/${old}`),
      { outputPath: `guides/${old}`, target: route },
      `${old}: previous address forwards to ${route}`,
    );
  }
  const stub = redirectStub('s1-git.html');
  assert.ok(
    stub.includes('content="0;url=s1-git.html"') &&
      stub.includes('location.replace("s1-git.html" + location.hash)') &&
      stub.includes('href="s1-git.html"'),
    'a stub forwards, keeps the #step anchor and has a link',
  );
  for (const outputPath of ['environment-scales.html', 'environment-contours.html'])
    assert.ok(
      retiredPageRedirects.some((item) => item.outputPath === outputPath),
      `${outputPath}: a removed-section stub`,
    );
  // The public build leads to the landing; CustomDev keeps its bookmarks on the PDLC map above the course.
  for (const [row, target, label] of [
    ['public', './', 'открыть карту PDLC'],
    ['customdev', '../', 'открыть карту PDLC'],
  ] as const) {
    assert.deepEqual(retiredHome[row], { target, label }, row);
    // What the build writes for this row, not a stub assembled here.
    const pages = new Map(retiredPages(row));
    assert.deepEqual(
      [...pages.keys()],
      ['environment-scales.html', 'environment-contours.html'],
      row,
    );
    const page = pages.get('environment-scales.html')!;
    assert.ok(
      page.includes(`location.replace("${target}" + location.hash)`) &&
        page.includes(`Этого раздела больше нет: <a href="${target}">${label}</a>`) &&
        !page.includes('Страница переехала'),
      `${row}: the stub says the section is gone, names its home and keeps the anchor`,
    );
  }
  for (const n of ['1', '2', '3'] as const) {
    assert.equal(
      pageRedirects.find((item) => item.outputPath === `guides/stage-${n}-ai.html`)?.target,
      routes[n],
      `stage-${n}-ai.html: redirect to the current page`,
    );
  }
  // The builder signs course links with the short menu names («Контекст продукта»), not full titles.
  assert.ok(
    meta.includes(`href="s4-product.html">${courseNames.guides['3-star'].short}</a>`),
    'p4 course links use the short names',
  );

  assert.ok(markdown.includes(`[${courseNames.guides['3-star'].title}](s4-product.html)`));
});

await test('the build plan selects the landing, its assets and the retired-page stubs for each row', async () => {
  // Through the build plan, not the helper: a builder that picked the other row would fail here.
  const saved = process.env.COURSE_NAV;
  try {
    for (const [row, target] of [
      ['public', './'],
      ['customdev', '../'],
    ] as const) {
      process.env.COURSE_NAV = row;
      const plan = await planLearningSite();
      const index = plan.find((entry) => entry.path === 'index.html');
      assert.ok(index && 'content' in index);
      if (row === 'customdev') assert.equal(index.content, redirectStub('guides/index.html'));
      else assert.match(index.content, /<ol class="route-track"/u);
      for (const asset of ['landing.css', 'landing.js'])
        assert.equal(
          plan.some((entry) => entry.path === asset),
          row === 'public',
          `${row}: ${asset}`,
        );
      for (const name of ['environment-scales.html', 'environment-contours.html']) {
        const entry = plan.find((item) => item.path === name);
        assert.ok(entry && 'content' in entry, `${row}: ${name} is written`);
        assert.ok(
          entry.content.includes(`location.replace("${target}" + location.hash)`),
          `${row}: ${name} leads to ${target}`,
        );
      }
    }
  } finally {
    if (saved === undefined) delete process.env.COURSE_NAV;
    else process.env.COURSE_NAV = saved;
  }
});

await test('course placeholders use unnumbered preparation and stable course and branch numbers', () => {
  assert.equal(
    resolveCourseNames('{{STEP:0a}} / {{SHORT_STEP:0a}} / [{{NUMBER:0a}}]'),
    'Подготовка\u00a0· Markdown, Git, GitLab / Подготовка\u00a0«Markdown, Git, GitLab» / []',
  );
  assert.equal(resolveCourseNames('{{STEP:1}}'), 'Шаг\u00a01\u00a0· Требования в Git');
  assert.equal(resolveCourseNames('{{SHORT_STEP:1}}'), '1\u00a0«Требования в Git»');
  assert.equal(resolveCourseNames('{{CARD_STEP:0a}}'), 'Подготовка «Markdown, Git, GitLab»');
  assert.equal(resolveCourseNames('{{CARD_STEP:1}}'), '1 «Требования в Git»');
  assert.equal(
    resolveCourseNames('{{NUMBER:4-new}} / {{NUMBER:4-legacy}} / {{NUMBER:delivery}}'),
    '6а / 6б / 7',
  );
});

await test('published catalog resolves the course greeting and numbered menu without placeholders or a duplicate route', async () => {
  const html = placeHtml(
    await readFile(resolve(root, 'docs/pages/sdlc-development/guides/index.html'), 'utf8'),
    '../',
  );
  assert.ok(
    html.includes(
      'Здравствуйте. Вы на курсе «Учебный маршрут анализа». Он о том, как описывать требования в Git через OpenSpec и согласовывать их командой. Три части: подготовка, практика, разработка. Начнём с того, зачем меняем процесс.',
    ),
  );
  assert.match(html, /<nav class="learning-path"[^]*?<strong>1\u00a0«Требования в Git»<\/strong>/u);
  assert.doesNotMatch(
    html,
    /\{\{(?:COURSE_TITLE|STEP|SHORT_STEP|CARD_STEP|NUMBER)|map-howto__route/u,
  );
  assert.match(html, /map-howto__legend/u);
  assert.match(
    html,
    /запрос в Jira, замысел 2 «лимит суммы из системы банка» и проверенный организатором комплект \(или ваш принятый результат шага 3\s+«Изменение в OpenSpec»\)/u,
  );
  assert.throws(() => resolveCourseNames('{{STEP:missing}}'), /Unknown course step/u);
});

await test('the course index and the SDD overview call route steps by numbers and the SDD guide by its title', async () => {
  const index = await readFile(
    resolve(root, 'docs/pages/sdlc-development/guides/index.html'),
    'utf8',
  );
  const overview = await readFile(
    resolve(root, 'docs/pages/sdlc-development/analytics-process-sdd.html'),
    'utf8',
  );
  for (const [name, text] of [
    ['index', index],
    ['SDD overview', overview],
  ] as const) {
    assert.doesNotMatch(
      text,
      /ступен(?:ь|и|ей|ям|ями|ях|ью|ю)\s*\d|вводн(?:ый|ого|ом) блок|нормальн\w+ intent|на принятие правок/iu,
      `${name}: course-route steps are R codes, the SDD guide is called by its title, a merge request is one term`,
    );
  }
});

await test('course names are valid and cover exactly the existing guide titles', async () => {
  const names: unknown = JSON.parse(await readFile(resolve(root, namesPath), 'utf8'));
  assert.ok(isRecord(names));
  assert.ok(Array.isArray(names.route));
  assert.ok(
    names.route.every(
      (entry: unknown): entry is { code: string; id: string; group: string } =>
        isRecord(entry) &&
        typeof entry.code === 'string' &&
        typeof entry.id === 'string' &&
        typeof entry.group === 'string',
    ),
  );
  assert.ok(isRecord(names.groups));
  assert.ok(isRecord(names.guides));
  assert.ok(typeof names.teamName === 'string');
  assert.deepEqual(Object.keys(names).sort(), [
    'branches',
    'courseTitle',
    'courses',
    'extras',
    'groups',
    'guides',
    'lifecycleName',
    'lifecycleStages',
    'route',
    'teamName',
  ]);
  assert.equal(
    names.route
      .map(
        (entry: { id: string; code: string; group: string }) =>
          `${entry.id}:${entry.code}:${entry.group}`,
      )
      .join(' '),
    '0:П1:prep 0a:П2:prep sdd:П3:prep metarepo:П4:prep 1:С1:practice 2:С2:practice 3:С3:practice 4-team:С4-команда:practice 3-star:С5:practice delivery:Д1:after i1:И1:practice i2:И2:practice i3:И3:practice i4:И4:practice',
    'the route is ten analysis positions plus four intent steps in order',
  );
  assert.deepEqual(Object.keys(names.groups), ['prep', 'practice', 'after']);
  assert.ok(names.teamName.trim());
  assert.deepEqual(
    Object.keys(names.guides).sort(),
    [...Object.keys(guideContent.stages), 'metarepo'].sort(),
  );
  for (const [id, stage] of Object.entries(guideContent.stages)) {
    const entry: unknown = names.guides[id];
    assert.ok(isRecord(entry));
    assert.ok(typeof entry.title === 'string' && typeof entry.short === 'string');
    assert.deepEqual(Object.keys(entry).sort(), [
      'audience',
      'file',
      'gain',
      'goal',
      'needs',
      'oldFile',
      'short',
      'title',
    ]);
    assert.equal(entry.title, stage.title, `${id}: registry owns the guide title`);
    assert.equal(typeof entry.short, 'string');
    assert.ok(entry.short.trim(), `${id}: rail label must not be empty`);
    assert.ok(entry.title.trim(), `${id}: title must not be empty`);
  }
});

await test('active source trees contain no retired team name except the external terminology reference', async () => {
  const { stdout } = await execFileAsync(
    'git',
    [
      'ls-files',
      '-z',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      'docs/pages',
      'scripts',
      'video/block-0a/film',
      'assets/protected-shells',
      'skills',
    ],
    { cwd: root },
  );
  const violations: string[] = [];
  const externalReference = `<a href="https://teamtopologies.com/key-concepts">${['Team Topologies:', 'Enabling', 'Team'].join(' ')}</a>`;
  for (const file of new Set(stdout.split('\0').filter(Boolean))) {
    if (/(?:^|\/)(?:archive|archives|openspec)(?:\/)|^docs\/reviews\//u.test(file)) continue;
    if (!/\.(?:html|[cm]?[jt]s|tsx|json|md|css|svg|txt|vtt|ya?ml|sh)$/u.test(extname(file)))
      continue;
    let content = await readFile(resolve(root, file), 'utf8');
    if (file === 'assets/protected-shells/enabling-team.html')
      content = content.replace(externalReference, '');
    for (const [index, line] of content.split('\n').entries()) {
      if (/\bEnabl(?:e|ing)[\s]+Team\b/u.test(line)) violations.push(`${file}:${index + 1}`);
    }
  }
  assert.deepEqual(violations, [], 'old team names must not return to active sources');
});
