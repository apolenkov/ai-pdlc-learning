import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { findChrome } from './find-chrome.ts';

const ROOT = resolve('.');

const read = (file: string): Promise<string> => readFile(resolve(ROOT, file), 'utf8');

/** Visible card of one role on the generated roles page, from its heading to the article end. */
const roleCard = (html: string, name: string): string => {
  const start = html.indexOf(`<h4>${name}</h4>`);
  assert.ok(start > 0, `${name} card is rendered`);
  return html.slice(start, html.indexOf('</article>', start));
};

await test('generated roles page carries the aligned role contract', async () => {
  const roles = await read('docs/pages/sdlc-development/roles.html');
  assert.doesNotMatch(roles, /Владелец процесса/u);
  assert.doesNotMatch(roles, /Эксплуатация \/ поддержка/u);

  assert.match(roles, /<h2 id="roles-table-title">13 ролей в двух контурах<\/h2>/u);
  assert.match(roles, /href="#role-group-process"><span>Процесс<\/span><small>7 ролей/u);
  assert.match(roles, /href="#role-group-environment"><span>Среда<\/span><small>6 ролей/u);
  const productOwner = roleCard(roles, 'Владелец продукта');
  for (const claim of [
    /бизнес-намерение/iu,
    /приоритет/iu,
    /ценность/iu,
    /границы/iu,
    /целевой рабочий процесс/iu,
    /критерии успеха/iu,
    /решение о смене или масштабировании/iu,
    /приёмк/iu,
  ]) {
    assert.match(productOwner, claim, `the product owner card keeps ${String(claim)}`);
  }

  const support = roleCard(roles, 'Поддержка пользователей');
  for (const claim of [
    /приём/iu,
    /классификация/iu,
    /эскалация/iu,
    /обратная связь/iu,
    /инцидент/iu,
  ]) {
    assert.match(support, claim, `the user-support card keeps ${String(claim)}`);
  }
  assert.match(support, /Бизнес-решения не принимает/u, 'support makes no business decisions');

  const devops = roleCard(roles, 'DevOps-команда');
  for (const claim of [
    /доступность/iu,
    /наблюдаемость/iu,
    /инциденты/iu,
    /квоты/iu,
    /восстановление/iu,
    /откат/iu,
  ]) {
    assert.match(devops, claim, `the DevOps card keeps ${String(claim)}`);
  }
  assert.match(
    devops,
    /Пользовательскую поддержку не ведёт/u,
    'technical operation stays separate from support',
  );

  const platformOwner = roleCard(roles, 'Владелец ИИ-платформы');
  assert.match(platformOwner, /каталог/iu);
  assert.match(platformOwner, /шаблоны сред/iu);
  assert.doesNotMatch(platformOwner, /работоспособность|доступность|мониторинг|инцидент|откат/iu);

  const visibleRolesCopy = roles.replace(/<[^>]+>/gu, ' ');
  assert.doesNotMatch(
    visibleRolesCopy,
    /(?:evidence|workflow|harness|approval|sandbox|менеджер проекта|PR-черновик)/iu,
    'no legacy source artefacts reach the reader-facing role copy',
  );
});

await test('glossary exposes a grouped index and source links', async () => {
  const glossary = await read('docs/pages/sdlc-development/glossary.html');
  assert.match(glossary, /class="reference-section reference-section--glossary"/u);
  assert.doesNotMatch(glossary, /reference-table-hint/gu);
  assert.match(glossary, /class="reference-group-index"/u);
  assert.equal((glossary.match(/<section id="glossary-group-[^"]+"/gu) ?? []).length, 5);
  assert.doesNotMatch(glossary, /reference-group-spacer/u);
  assert.match(glossary, /class="reference-links"/u);
  assert.match(glossary, /target="_blank" rel="noopener noreferrer"/u);
});

await test('rendered reference pages use plain section headings, matching link colors and unboxed rules', async () => {
  const browser = await puppeteer.launch({
    executablePath: await findChrome(),
    headless: true,
    args: process.env.CI === 'true' ? ['--no-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    const pages = resolve(ROOT, 'docs/pages/sdlc-development');
    const colors = async (selector: string) => {
      const color = () => page.$eval(selector, (link) => getComputedStyle(link).color);
      const normal = await color();
      await page.hover(selector);
      const hover = await color();
      await page.mouse.move(0, 0);
      return { normal, hover };
    };
    const assertPlainHeaders = async (selector: string, count: number) => {
      const headers = await page.$$eval(selector, (elements) =>
        elements.map((element) => {
          const { backgroundColor, backgroundImage, borderLeftWidth } = getComputedStyle(element);
          return { backgroundColor, backgroundImage, borderLeftWidth };
        }),
      );
      assert.equal(headers.length, count, selector);
      for (const header of headers) {
        assert.deepEqual(
          header,
          {
            backgroundColor: 'rgba(0, 0, 0, 0)',
            backgroundImage: 'none',
            borderLeftWidth: '0px',
          },
          selector,
        );
      }
    };

    for (const width of [1440, 1024, 390]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(pathToFileURL(resolve(pages, 'glossary.html')).href);
      await assertPlainHeaders('.reference-glossary-group > header', 5);
      const sourceColors = await colors('.reference-links a');
      assert.notEqual(
        sourceColors.normal,
        sourceColors.hover,
        'source links change color on hover',
      );

      await page.goto(pathToFileURL(resolve(pages, 'roles.html')).href);
      await assertPlainHeaders('.reference-panel > header', 4);
      await assertPlainHeaders('.reference-role-group > header', 2);
      assert.deepEqual(
        await colors('#roles-c4 > header a[href="https://c4model.com"]'),
        sourceColors,
      );

      for (const panel of ['[aria-labelledby="roles-rule-title"]', '#roles-c4']) {
        const borders = await page.$$eval(`${panel} > .reference-rule-list > li`, (items) =>
          items.map((item) => getComputedStyle(item).borderWidth),
        );
        assert.deepEqual(borders, ['0px', '0px', '0px'], `${width}px: ${panel}`);
      }
    }
  } finally {
    await browser.close();
  }
});

await test('roles expose two responsibility contours and preserve every field', async () => {
  const roles = await read('docs/pages/sdlc-development/roles.html');
  assert.match(roles, /class="reference-role-index"/u);
  assert.equal((roles.match(/<section id="role-group-[^"]+"/gu) ?? []).length, 2);
  assert.equal(
    (roles.match(/<article class="reference-role-row reference-role-card">/gu) ?? []).length,
    13,
  );
  assert.equal((roles.match(/<dt>Где участвует<\/dt>/gu) ?? []).length, 13);
  assert.equal((roles.match(/<dt>Профиль среды<\/dt>/gu) ?? []).length, 13);
  assert.equal((roles.match(/<dt>Разрешённые действия<\/dt>/gu) ?? []).length, 13);
  assert.equal((roles.match(/<dt>Что подтверждает<\/dt>/gu) ?? []).length, 13);
  assert.equal((roles.match(/<dt>Чем фиксируется результат<\/dt>/gu) ?? []).length, 13);
  assert.equal(
    (roles.match(/<table /gu) ?? []).length,
    1,
    'only the C4 responsibility table uses a table',
  );
  assert.match(roles, /id="roles-c4"/u);
});

await test('roles split architecture by C4 levels and keep the ADR rule', async () => {
  const roles = await read('docs/pages/sdlc-development/roles.html');
  const start = roles.indexOf('<section id="roles-c4"');
  assert.ok(start > 0, 'the C4 section is on the roles page');
  const c4 = roles.slice(start, roles.indexOf('</section>', start));
  assert.match(c4, /<h2 id="roles-c4-title">Архитектура по уровням C4<\/h2>/u);
  const headers = [...c4.matchAll(/<th scope="col">([^<]+)<\/th>/gu)].map(([, text]) => text);
  assert.deepEqual(headers, ['Уровень', 'Кто пишет', 'Где', 'Кто утверждает']);
  const rows = [
    ...c4.matchAll(
      /<th scope="row">([^<]+)<\/th><td data-label="[^"]+">([^<]+)<\/td><td data-label="[^"]+">(?:<code>)?([^<]+)(?:<\/code>)?<\/td><td data-label="[^"]+">([^<]+)<\/td>/gu,
    ),
  ].map(([, level, writer, place, approver]) => [level, writer, place, approver]);
  assert.deepEqual(rows, [
    ['1. Контекст', 'Архитектор', 'ADR', 'Архитектор (ADR)'],
    ['2. Контейнеры', 'Архитектор', 'ADR', 'Архитектор (ADR)'],
    ['3. Компоненты', 'Архитектор', 'design.md', 'Владелец продукта'],
    ['4. Код', 'Архитектор', 'design.md', 'Владелец продукта'],
  ]);
  assert.ok(c4.includes('<li>Аналитик и техлид проверяют <code>design.md</code>.</li>'));
  assert.match(
    c4,
    /<li>Для уровней 3 и\u00a04 агент готовит черновик по\u00a0репозиторию\.<\/li>/u,
  );
  assert.match(
    c4,
    /<li>ADR может предложить любой в\u00a0команде после совета с\u00a0архитектором; подписывает архитектор\.<\/li>/u,
  );
});

await test('roles carry the role ≠ person rule, the product team and the empty role map', async () => {
  const roles = await read('docs/pages/sdlc-development/roles.html');
  assert.match(roles, /<h2 id="roles-rule-title">Роль ≠ человек<\/h2>/u);
  assert.match(roles, /<strong>Автор ≠ утверждающий\.<\/strong>/u);
  assert.match(roles, /<strong>Исключение — этап 1\.<\/strong>/u);
  assert.match(roles, /<h2 id="roles-team-title">Команда продукта и общие роли<\/h2>/u);
  assert.match(roles, /<h2 id="roles-map-title">Карта ролей продукта<\/h2>/u);
  // Each role holder is a placeholder.
  assert.equal(
    (
      roles.match(
        /<dt>Владелец продукта<\/dt><dd><span class="reference-role-map__slot">кто держит<\/span><\/dd>/gu,
      ) ?? []
    ).length,
    1,
  );
  assert.equal((roles.match(/class="reference-role-map__slot"/gu) ?? []).length, 11);
  // Operations and user support are two independent slots, not the former combined row.
  assert.match(
    roles,
    /<dt>DevOps-команда<\/dt><dd><span class="reference-role-map__slot">кто держит<\/span><\/dd>/u,
  );
  assert.match(
    roles,
    /<dt>Поддержка пользователей<\/dt><dd><span class="reference-role-map__slot">кто держит<\/span><\/dd>/u,
  );
  assert.doesNotMatch(roles, /Эксплуатация и поддержка/u);
  assert.match(roles, /<dl class="reference-role-map">/u);
});

await test('reference pages use the shared fixed navigation and no duplicate context row', async () => {
  const [roles, glossary] = await Promise.all([
    read('docs/pages/sdlc-development/roles.html'),
    read('docs/pages/sdlc-development/glossary.html'),
  ]);
  for (const html of [roles, glossary]) {
    assert.match(html, / · AI PDLC Learning<\/title>/u);
    assert.match(
      html,
      /<meta name="description" content="[^"]+для материалов курса AI PDLC Learning\.">/u,
    );
    assert.equal((html.match(/data-global-nav/gu) ?? []).length, 1);
    assert.doesNotMatch(html, /data-context-nav|site-contextbar/u);
    assert.match(html, /href="__CUSTOMDEV_ROOT__#sdlc"/u);
  }
});

await test('reference pages use the desktop canvas without horizontal-scroll affordances', async () => {
  const [roles, glossary, styles] = await Promise.all([
    read('docs/pages/sdlc-development/roles.html'),
    read('docs/pages/sdlc-development/glossary.html'),
    read('docs/pages/sdlc-development/help-reference.css'),
  ]);
  assert.doesNotMatch(roles, /reference-table-hint/gu);
  assert.match(roles, /Роли и зоны ответственности/u);
  assert.match(glossary, /Термины и определения/u);
  assert.match(
    styles,
    /\.reference-shell \{ width: min\(var\(--site-shell-max, 1408px\)[^}]*margin: 0 auto;/u,
  );
  assert.match(
    styles,
    /\.reference-role-grid \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/u,
  );
  assert.match(
    styles,
    /\.reference-role-card \{[^}]*border: 1px solid var\(--reference-line\);[^}]*background: var\(--customdev-white\);/u,
  );
  assert.match(
    styles,
    /\.reference-glossary-list \{ display: grid; gap: 28px; width: min\(100%, 1000px\);/u,
  );
  assert.match(styles, /\.reference-glossary-row dd \{ max-width: 72ch; \}/u);
  const index = glossary.match(/<nav class="reference-group-index"[^>]*>(.*?)<\/nav>/u)?.[1] ?? '';
  assert.equal(index.match(/<small>\d+ термин(?:а|ов)?<\/small><\/a>/gu)?.length, 5);
  assert.doesNotMatch(index + styles, /reference-bar|--share|reference-group-index a::before/u);
  assert.match(
    styles,
    /\.reference-role-card:last-child:nth-child\(odd\) \{ grid-column: 1 \/ -1; \}/u,
  );
  assert.match(styles, /\.reference-role-card dt \{[^}]*font-size: 13px; font-weight: 600; \}/u);
  assert.match(styles, /\.reference-role-card dl \{[^}]*gap: 16px 24px;/u);
  assert.doesNotMatch(
    styles,
    /\.reference-role-card (?:dl[^{}]*|dt\s*)\{[^}]*(?:border(?:-[a-z]+)?: [1-9]|box-shadow:|text-transform: uppercase)/u,
  );
  assert.match(styles, /\* \{ box-sizing: border-box; \}/u);
  assert.match(
    styles,
    /\.reference-glossary-group \{[^}]*border: 1px solid var\(--reference-line\);[^}]*background: var\(--customdev-white\);/u,
  );
  assert.match(
    styles,
    /\.reference-glossary-row \{ display: grid; grid-template-columns: 280px minmax\(0, 1fr\);/u,
  );
  assert.match(
    styles,
    /body\.reference-page \{[^}]*background: var\(--customdev-page-bg, #f6f3eb\);/u,
  );
  assert.match(
    styles,
    /\.reference-section \{ border: 0; border-radius: 0; background: transparent; box-shadow: none; \}/u,
  );
  assert.doesNotMatch(styles, /tbody tr:nth-child\(even\)/u);
  assert.match(styles, /--reference-paper: var\(--customdev-page-bg\);/u);
  const narrowBlocks = [
    ...styles.matchAll(/@media\s*\(max-width:\s*([^)]*)\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/gu),
  ];
  assert.equal(narrowBlocks.length, 1, 'exactly one max-width block');
  assert.equal(narrowBlocks[0]![1], '719px');
  assert.match(
    narrowBlocks[0]![2]!,
    /\.reference-role-grid \{ grid-template-columns: minmax\(0, 1fr\)/u,
  );
  assert.match(
    narrowBlocks[0]![2]!,
    /\.reference-glossary-row \{ grid-template-columns: minmax\(0, 1fr\)/u,
  );
  assert.doesNotMatch(
    styles,
    /overflow(?:-x)?\s*:\s*(?:auto|scroll)/u,
    'no horizontal-scroll affordances',
  );
});

await test('reference pages land on hash anchors immediately, keeping the reduced-motion guard', async () => {
  const styles = await read('docs/pages/sdlc-development/help-reference.css');
  assert.doesNotMatch(
    styles,
    /scroll-behavior:\s*smooth/iu,
    'smooth scrolling delays direct anchor landing; hash navigation must be immediate',
  );
  assert.match(
    styles,
    /prefers-reduced-motion:\s*reduce[^}]*scroll-behavior:\s*auto/iu,
    'the explicit reduced-motion rule stays in place',
  );
  for (const page of ['roles.html', 'glossary.html']) {
    assert.match(
      await read(`docs/pages/sdlc-development/${page}`),
      /help-reference\.css/u,
      `${page} must keep using the corrected reference stylesheet`,
    );
  }
});

await test('the intent map links to the analysis levels in the course', async () => {
  const map = await read('docs/pages/sdlc-development/intent-maturity-map.html');
  assert.equal(map.match(/href="guides\/index\.html#maturity-levels"/gu)?.length, 2);
  assert.doesNotMatch(map, /href="(?:\.\/)?analysis-maturity-map\.html(?:[#?][^"]*)?"/u);
});
