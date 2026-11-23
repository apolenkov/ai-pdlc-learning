import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import test, { type TestContext } from 'node:test';
import puppeteer, { type Page } from 'puppeteer-core';
import { addGuideVideos, GUIDE_VIDEO_DIR, GUIDE_VIDEOS, readVideoManifest } from './guide-video.ts';
import { findChrome } from './find-chrome.ts';
import { serve as serveLearning } from './preview-pages.ts';
import { buildLearningSite } from './build-learning-pages.ts';
const serve = (
  request: Parameters<typeof serveLearning>[1],
  response: Parameters<typeof serveLearning>[2],
  root: string,
) => serveLearning(root, request, response);

const navigationProblems = (): string[] => {
  const errors: string[] = [];
  if (document.documentElement.scrollWidth > innerWidth + 1)
    errors.push('page horizontal overflow');
  const nav = document.querySelector<HTMLElement>('[data-global-nav]')!;
  if (nav.scrollWidth > nav.clientWidth + 1) errors.push('navigation horizontal overflow');
  for (const counter of nav.querySelectorAll<HTMLElement>('.counter'))
    if (!counter.checkVisibility()) errors.push('counter is hidden');
  const controls = [...nav.querySelectorAll<HTMLElement>('a, button, .counter')]
    .filter((el) => el.checkVisibility())
    .map((el) => {
      const rect = el.getBoundingClientRect();
      const box = {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
      // Scroll strips clip offscreen controls; compare their painted portions.
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        const clip = parent.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/u.test(style.overflowX) || style.contain.includes('paint')) {
          box.left = Math.max(box.left, clip.left);
          box.right = Math.min(box.right, clip.right);
        }
        if (/(auto|scroll|hidden|clip)/u.test(style.overflowY) || style.contain.includes('paint')) {
          box.top = Math.max(box.top, clip.top);
          box.bottom = Math.min(box.bottom, clip.bottom);
        }
      }
      if (
        el.matches('.counter') &&
        (box.left > rect.left + 1 ||
          box.right < rect.right - 1 ||
          box.top > rect.top + 1 ||
          box.bottom < rect.bottom - 1 ||
          el.scrollWidth > el.clientWidth + 1)
      )
        errors.push(`counter is clipped: ${el.textContent?.trim()}`);
      return { label: el.textContent?.trim(), box };
    })
    .filter(({ box }) => box.right > box.left && box.bottom > box.top);
  for (const [i, a] of controls.entries()) {
    if (a.box.left < -1 || a.box.right > innerWidth + 1)
      errors.push(`outside viewport: ${a.label}`);
    for (const b of controls.slice(i + 1))
      if (
        Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left) > 1 &&
        Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top) > 1
      )
        errors.push(`overlap: ${a.label} / ${b.label}`);
  }
  return errors;
};

const trackResourceFailures = (page: Page): string[] => {
  const failures: string[] = [];
  page.on('response', (response) => {
    if (['stylesheet', 'script'].includes(response.request().resourceType()) && !response.ok())
      failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => {
    if (['stylesheet', 'script'].includes(request.resourceType())) failures.push(request.url());
  });
  return failures;
};

// Named steps keep the check from passing when either kind of listing disappears.
const pairedSteps: Record<string, number[]> = {
  'guides/s1-git.html': [5],
  'guides/s2-review.html': [2, 7],
  'guides/s3-openspec.html': [6, 7, 8, 9],
  'guides/d1-delivery.html': [2],
  'guides/s4-product.html': [10],
  'guides/s4-team.html': [4],
  'guides/s4a-new.html': [5],
  'guides/s4b-legacy.html': [6],
  'guides/i4-accept.html': [3],
};

const assertListingEdges = async (page: Page, file: string, width: number): Promise<void> => {
  for (const number of pairedSteps[file] ?? []) {
    const step = `#step-${String(number).padStart(2, '0')} .step-instructions`;
    const bounds = await page.$eval(step, (instructions) => {
      const edges = (el: Element) => {
        const { left, right } = el.getBoundingClientRect();
        return { left, right };
      };
      return {
        commands: [...instructions.querySelectorAll('.terminal-copy > pre')].map(edges),
        examples: [
          ...instructions.querySelectorAll(':scope > .step-example:not(.terminal-copy) > pre'),
        ].map(edges),
      };
    });
    const first = bounds.commands[0];
    const example = bounds.examples[0];
    const label = `B12: ${file} ${step} at ${width}px`;
    assert.ok(first && example, `${label}: commands and example must exist`);
    if (file === 'guides/i4-accept.html' && number === 3) {
      // Item 11 pushes the branch (one listing); item 12 opens the MR in GitLab and has no Git command.
      const item = (n: number) => `${step} > .step-actions > li:nth-child(${n})`;
      const listing = await page.$eval(`${item(11)} > .terminal-copy > pre`, (el) => {
        const { left, right } = el.getBoundingClientRect();
        return { left, right };
      });
      assert.ok(
        Math.abs(listing.left - example.left) < 1 && Math.abs(listing.right - example.right) < 1,
        `${label}, item 11: ${JSON.stringify({ listing, example })}`,
      );
      const mrAction = await page.$eval(item(12), (el) => ({
        text: el.textContent,
        hasListing: Boolean(el.querySelector('.terminal-copy, pre')),
      }));
      assert.match(mrAction.text, /GitLab:.*?New\s+merge\s+request/isu, `${label}, item 12`);
      assert.equal(mrAction.hasListing, false, `${label}, item 12: unexpected command listing`);
    }
    for (const box of [...bounds.commands, ...bounds.examples]) {
      assert.ok(
        box.right > box.left &&
          Math.abs(box.left - first.left) < 1 &&
          Math.abs(box.right - first.right) < 1,
        `${label}: ${JSON.stringify(bounds)}`,
      );
    }
  }
  if (file === 'guides/p2-git.html') {
    // Found by title: the Git guide was renumbered to 14 sections, the example must not depend on it.
    const soloStep = await page.$$eval(
      '[id^="step-"]',
      (steps) =>
        steps.find((step) =>
          (step.querySelector('h2, h3')?.textContent ?? '').includes('Создайте intent.md'),
        )?.id,
    );
    assert.ok(soloStep, `B12: ${file} has no «Создайте intent.md» step at ${width}px`);
    const solo = await page.$eval(`#${soloStep} .step-instructions`, (instructions) => {
      const list = instructions.querySelector('.step-actions')!.getBoundingClientRect();
      const example = instructions.querySelector(':scope > .step-example')!;
      const { left, right } = example.getBoundingClientRect();
      const style = getComputedStyle(example);
      return {
        commands: instructions.querySelectorAll('.terminal-copy').length,
        framed: parseFloat(style.borderInlineStartWidth) > 0,
        left,
        right,
        listLeft: list.left,
        expectedRight: list.left + Math.min(list.width, parseFloat(style.maxInlineSize)),
      };
    });
    assert.equal(solo.commands, 0);
    assert.ok(
      solo.framed &&
        Math.abs(solo.left - solo.listLeft) < 1 &&
        Math.abs(solo.right - solo.expectedRight) < 1,
      `B12: ${file} standalone intent.md example at ${width}px: ${JSON.stringify(solo)}`,
    );
  }
};

const assertLessonLayout = async (
  page: Page,
  file: string,
  width: number,
  expectsFilm: boolean,
): Promise<void> => {
  if (file === 'guides/examples/intent-plan/strong-intent.html' && width === 390) {
    const bounds = await page.$eval('[role="region"][aria-label^="План изменений"]', (wrapper) => {
      const id = wrapper.querySelector('table tbody tr:first-child td:first-child')!;
      const range = document.createRange();
      range.selectNodeContents(id);
      const style = getComputedStyle(id);
      return {
        overflow: getComputedStyle(wrapper).overflowX,
        tabIndex: wrapper.getAttribute('tabindex'),
        scroll: wrapper.scrollWidth,
        viewport: wrapper.clientWidth,
        document: document.documentElement.scrollWidth,
        id: id.textContent.trim(),
        fragments: range.getClientRects().length,
        textWidth: range.getBoundingClientRect().width,
        cellWidth: id.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      };
    });
    assert.equal(bounds.overflow, 'auto');
    assert.equal(bounds.tabIndex, '0');
    assert.ok(bounds.scroll > bounds.viewport, 'B22: the change plan scrolls inside its region');
    assert.equal(bounds.document, 390);
    assert.equal(bounds.id, 'change-1');
    assert.equal(bounds.fragments, 1, 'B22: the identifier stays on one line');
    assert.ok(bounds.textWidth > 0 && bounds.cellWidth + 0.5 >= bounds.textWidth);
  }
  if (file === 'guides/p1-zachem.html' && [390, 1440].includes(width)) {
    const diagram = await page.$eval('svg[aria-labelledby~="intro-9-title"]', (svg) => ({
      width: svg.getBoundingClientRect().width,
      viewport: svg.parentElement!.clientWidth,
      scroll: svg.parentElement!.scrollWidth,
    }));
    if (width === 1440) {
      assert.ok(diagram.scroll <= diagram.viewport + 1, 'A6: the whole route fits at 1440 px');
    } else {
      assert.equal(diagram.width, 1040, 'A6: the route keeps its readable width on a phone');
      assert.ok(
        diagram.scroll > diagram.viewport,
        'A6: the narrow viewport scrolls inside the figure',
      );
    }
  }
  if (width === 1440) {
    await page.setViewport({ width, height: 900 });
    if (expectsFilm || (await page.$('#guide-video-chapters')))
      await page.waitForSelector('.lesson-goal > #lesson-video:not([hidden])');
    if (await page.$('body[data-stage] main.grid#guide-content')) {
      const top = await page.$eval(
        '#work-steps .step-list > li:first-child',
        (step) => step.getBoundingClientRect().top + scrollY,
      );
      assert.ok(
        top < 1800,
        `${file}: first step starts at ${top}px, below the second 900px screen`,
      );
    }
    await page.setViewport({ width, height: 1000 });
  }
  if (file === 'guides/p4-metarepository.html' && [390, 1440].includes(width)) {
    const tableWidth = width === 1440 ? 1280 : 390;
    await page.setViewport({ width: tableWidth, height: 900 });
    const cells = await page.$$eval('.meta-table tbody td', (nodes) =>
      nodes.map((cell) => ({
        width: cell.clientWidth,
        overflow: cell.scrollWidth - cell.clientWidth,
        display: getComputedStyle(cell).display,
        label: getComputedStyle(cell, '::before').content,
      })),
    );
    assert.ok(cells.length > 0, 'p4 contains its labelled table');
    for (const cell of cells) {
      assert.ok(
        cell.overflow <= 1 && cell.width > 180,
        `p4: clipped or narrow cell at ${tableWidth}px`,
      );
      assert.equal(cell.display, tableWidth === 390 ? 'block' : 'table-cell');
      if (tableWidth === 390) assert.ok(!['none', 'normal', '""'].includes(cell.label));
    }
    await page.setViewport({ width, height: 1000 });
  }
  if ([390, 1024, 1440].includes(width)) await assertListingEdges(page, file, width);
};

const assertNoviceLinkOpensPreparation = async (page: Page): Promise<void> => {
  await page.click('.level-choice details:first-child > summary');
  await page.click('.level-choice a[href="#course-prereq"]');
  const heading = await page.waitForSelector('section.card--prep:target > h2:first-child', {
    visible: true,
  });
  assert.ok(heading && (await heading.isIntersectingViewport()));
};

const assertExpandedMenu = async (page: Page, file: string, width: number): Promise<void> => {
  assert.equal(
    await page.$$eval(
      '.site-page-actions a, .site-page-actions button, .site-page-actions .counter',
      (controls) =>
        controls.every((el) => {
          const box = el.getBoundingClientRect();
          const nav = el.closest('nav')!.getBoundingClientRect();
          return (
            !el.checkVisibility() ||
            (box.left >= nav.left &&
              box.right <= nav.right &&
              box.top >= nav.top &&
              box.bottom <= nav.bottom)
          );
        }),
    ),
    true,
    `${file} at ${width}: expanded menu exposes every page control`,
  );
  await page.focus(
    file === 'index.html' ? '[data-nav-item="help"]' : '[data-global-nav] .site-catalog-return',
  );
  await page.keyboard.press('Escape');
  assert.deepEqual(
    await page.$eval('.site-nav-more', (el) => ({
      expanded: el.getAttribute('aria-expanded'),
      navigation: el.closest('nav')!.getAttribute('data-expanded'),
      focused: document.activeElement === el,
    })),
    { expanded: 'false', navigation: 'false', focused: true },
    `${file} at ${width}: Escape closes More and restores focus`,
  );
};

const lessonFilmAvailability = async (t: TestContext): Promise<Map<string, boolean>> => {
  const localFilms = new Set(await readdir(GUIDE_VIDEO_DIR));
  const filmPages = new Map<string, boolean>();
  for (const spec of GUIDE_VIDEOS) {
    if (spec.extra) continue;
    const { file } = await readVideoManifest(undefined, spec);
    const available = localFilms.has(file);
    filmPages.set(spec.page, available);
    if (!available)
      await t.test(`${spec.page}: #lesson-video`, { skip: `local film missing: ${file}` });
  }
  return filmPages;
};

await test('built course: navigation geometry and expanded More at all supported widths', async (t) => {
  await mkdir('.cache', { recursive: true });
  const output = await mkdtemp(resolve('.cache/fix5-geometry-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  await buildLearningSite(output);
  const filmPages = await lessonFilmAvailability(t);
  await addGuideVideos(output, true);

  // CI runs Chromium inside the runner container as root. Find/launch before opening the server.
  const browser = await puppeteer.launch({
    executablePath: await findChrome(),
    headless: true,
    args: process.env.CI === 'true' ? ['--no-sandbox'] : [],
  });
  const server = createServer((request, response) => {
    void serve(request, response, output).catch(() => response.writeHead(500).end());
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    const page = await browser.newPage();
    const failures = trackResourceFailures(page);
    const files = (await readdir(output, { recursive: true })).filter((name) =>
      name.endsWith('.html'),
    );
    let checked = 0;
    const geometryFailures: string[] = [];
    for (const file of filmPages.keys())
      assert.ok(files.includes(file), `missing lesson page: ${file}`);
    for (const file of files) {
      const html = await readFile(resolve(output, file), 'utf8');
      if (!filmPages.has(file) && !html.includes('data-global-nav')) continue;
      checked++;
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewport({ width, height: 1000 });
        await page.goto(`http://127.0.0.1:${address.port}/${file}`, { waitUntil: 'networkidle0' });
        await page.evaluate(() => document.fonts.ready);
        await assertLessonLayout(page, file, width, filmPages.get(file) === true);
        assert.deepEqual(failures, [], `${file}: CSS/JS must load`);
        assert.equal(
          await page.$eval('.site-topbar', (el) => getComputedStyle(el).position),
          'fixed',
          file,
        );
        if (width <= 480) {
          const bottom = await page.$eval(
            '.site-topbar',
            (el) => el.getBoundingClientRect().bottom,
          );
          assert.ok(
            bottom <= 64,
            `${file} at ${width}: resting header ends at ${bottom}px, limit 64px`,
          );
        }
        for (const expanded of [false, true]) {
          const more = await page.$('.site-nav-more');
          const visible = more && (await more.isVisible());
          if (expanded && !visible) continue;
          if (expanded) {
            await more!.click();
            await page
              .waitForFunction(
                () =>
                  document.querySelector('[data-global-nav]')?.getAttribute('data-expanded') ===
                  'true',
                { timeout: 1000 },
              )
              .catch(() => geometryFailures.push(`${file} at ${width}: More did not open`));
          }
          const problems = await page.evaluate(navigationProblems);
          assert.deepEqual(
            problems.filter((problem) => problem.startsWith('counter')),
            [],
            `${file} at ${width}, expanded=${expanded}: entire counter must remain visible`,
          );
          geometryFailures.push(
            ...problems.map((problem) => `${file} at ${width}, expanded=${expanded}: ${problem}`),
          );
          if (!expanded && file === 'analytics-process-sdd.html') {
            await page.click('#next');
            geometryFailures.push(
              ...(await page.evaluate(navigationProblems)).map(
                (problem) => `${file} at ${width}, after Next: ${problem}`,
              ),
            );
          }
          if (expanded) await assertExpandedMenu(page, file, width);
        }
      }
      if (file === 'guides/p2-git.html') await assertNoviceLinkOpensPreparation(page);
    }
    assert.deepEqual(geometryFailures, []);
    assert.ok(checked > 0, 'built pages with shared navigation must be checked');
    console.log(`Checked ${checked} built pages at five widths, including visible More menus`);
  } finally {
    await browser.close();
    await new Promise<void>((done) => server.close(() => done()));
  }
});
