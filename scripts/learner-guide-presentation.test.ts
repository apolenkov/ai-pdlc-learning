import { renderedStepHtml } from './learner-guide-test-support.ts';
import { guideInfo, routeLabel } from '../docs/pages/sdlc-development/guides/renderer/common.ts';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { guideContent, readGuideSource } from './guide-content.ts';
import {
  loadGuides,
  renderGuide,
  GUIDE_IDS,
  disclosureText,
} from './learner-guide-test-support.ts';
import { renderStrip, STEPS } from '../docs/pages/sdlc-development/route-strip/strip.ts';
import { crumbItems } from '../docs/pages/sdlc-development/route-strip/crumbs.ts';
import { routeState, GROUP_WORDS } from '../docs/pages/sdlc-development/route-strip/model.ts';
import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import { resolve } from 'node:path';
import './learner-guide-presentation.test/outcome-grid.ts';
import './learner-guide-presentation.test/course-map-prev.ts';

await test('route outcome items keep natural inline text flow inside each card', async () => {
  const [catalog, css] = await Promise.all([
    readFile('docs/pages/sdlc-development/guides/index.html', 'utf8'),
    readFile('docs/pages/sdlc-development/guides/guide.css', 'utf8'),
  ]);
  const inlineItem = catalog.match(/<li><strong>Код моделью:<\/strong>([^<]+)<\/li>/u)?.[1] ?? '';
  assert.ok(
    inlineItem.trim().length > 0,
    'the implementation item keeps a direct text child after <strong>; a grid/flex li would split it onto its own track',
  );
  const listRule = css.match(/\.route-outcome ol\s*\{([^}]*)\}/u)?.[1] ?? '';
  assert.match(
    listRule,
    /display:\s*grid/u,
    'the outcome list itself stays a responsive card grid',
  );
  assert.match(
    listRule,
    /repeat\(auto-fit,\s*minmax\(min\(100%,\s*12rem\),\s*1fr\)\)/u,
    'cards wrap into fewer columns before their text becomes too narrow',
  );
  const itemRule = css.match(/\.route-outcome li\s*\{([^}]*)\}/u)?.[1] ?? '';
  assert.ok(itemRule, 'the .route-outcome li rule is missing');
  assert.doesNotMatch(
    itemRule,
    /display:\s*(?:inline-)?(?:grid|flex)\b/u,
    'a grid/flex item turns every direct text and inline child into a separate track, breaking the sentence flow',
  );
  const markerRule = css.match(/\.route-outcome li::before\s*\{([^}]*)\}/u)?.[1] ?? '';
  assert.match(
    markerRule,
    /display:\s*block/u,
    'the outcome number stays on its own line above the text',
  );
  const spanRule = css.match(/\.route-outcome li span\s*\{([^}]*)\}/u)?.[1] ?? '';
  assert.match(
    spanRule,
    /display:\s*block/u,
    'the labelled card keeps its description on the next line',
  );
});

await test('guide footer links stack vertically at phone widths', async () => {
  const css = await readFile('docs/pages/sdlc-development/guides/guide.css', 'utf8');
  const mobile = css.split('@media (max-width: 760px) {')[1] ?? '';
  assert.ok(mobile, 'the phone-width media block must exist');
  const mobileRule = mobile.match(/\.footer-nav\s*\{([^}]*)\}/u)?.[1] ?? '';
  assert.match(
    mobileRule,
    /flex-direction:\s*column/u,
    'the footer links must stack vertically at phone widths instead of squeezing into columns',
  );
  const desktopRule = css.match(/\.footer-nav\s*\{\s*display:\s*flex;([^}]*)\}/u)?.[1] ?? '';
  assert.match(
    desktopRule,
    /justify-content:\s*space-between/u,
    'the desktop footer keeps its current spread layout',
  );
});

await test('a half-width guide card without a partner in its row takes the full width, including the odd last of why, prerequisites and terms', async () => {
  const css = await readFile('docs/pages/sdlc-development/guides/guide.css', 'utf8');
  const rule =
    css.match(/(#guide-content > :not\(\.card:not\(\.card--wide\)\) \+ [^{]*\{[^}]*\})/u)?.[1] ??
    '';
  assert.match(
    rule,
    /\.card:not\(\.card--wide\):not\(:has\(\+ \.card:not\(\.card--wide\)\)\)/u,
    'a run of one half-width card',
  );
  assert.match(
    rule,
    /#course-why \+ \.card \+ #course-terms/u,
    'terms after the why and prerequisites pair',
  );
  assert.match(rule, /grid-column:\s*1 \/ -1/u);
  assert.match(
    css,
    /#course-prereq:has\(\+ #course-terms\)\s*\{\s*align-self:\s*start;/u,
    'prerequisites beside the terms card do not stretch',
  );
});

await test('the shared installation warning stays once on the catalog and out of individual guides', async () => {
  const catalog = await readFile('docs/pages/sdlc-development/guides/index.html', 'utf8');
  assert.equal(
    catalog.match(/machine-install-warning/gu)?.length ?? 0,
    1,
    'the catalog keeps exactly one shared installation warning',
  );
  assert.match(
    catalog,
    /<aside class="warning machine-install-warning"[^>]*><strong>Установка инструментов:<\/strong>[\s\S]*?Git, Node\.js, OpenSpec, Kilo Code, OpenCode, VS Code или WSL[\s\S]*?Windows и в VDI[\s\S]*?заявк[\s\S]*?согласование служб информационной безопасности \(ИБ\)[\s\S]*?информационных технологий \(ИТ\)[\s\S]*?заявку на установку ПО[\s\S]*?macOS и Linux[\s\S]*?официальн[\s\S]*?<\/aside>/iu,
  );
  assert.match(catalog, /corporate-resources\.html#installation-request/u);
  const source = await readGuideSource();
  const rendered = await renderGuide('1');
  assert.doesNotMatch(
    source,
    /machineInstallWarning|machine-install-warning/u,
    'the per-guide renderer must not inject the repeated installation warning',
  );
  assert.match(
    rendered,
    /<section class="card[^"]*"[^>]*><h2>Перед началом<\/h2>[\s\S]*?<ul>/u,
    'the Перед началом card keeps the route-specific preparation note and prerequisites',
  );
  for (const id of ['1', '2', '3', '3-star'] as const) {
    const html = await renderGuide(id);
    const start = html.indexOf('<h2>Перед началом</h2>');
    const preparation = disclosureText(html.slice(start, html.indexOf('</section>', start)));
    assert.ok(
      preparation.includes(disclosureText(guideContent.accessPreparation[id])),
      `${id}: route-specific preparation is rendered`,
    );
    for (const prerequisite of guideContent.prerequisites[id]) {
      assert.ok(
        preparation.includes(disclosureText(prerequisite)),
        `${id}: prerequisite is rendered`,
      );
    }
    assert.doesNotMatch(
      html,
      /machine-install-warning|installation-request/iu,
      `${id}: the rendered guide must not repeat the catalog installation warning`,
    );
    assert.match(
      html,
      /<h2>Перед началом<\/h2><p><strong>/u,
      `${id}: the Перед началом card still leads with the route-specific preparation note`,
    );
  }
});

await test('prerequisite placeholders remain visible when rendered as HTML', () => {
  const { prerequisites } = guideContent;
  for (const [id, items] of Object.entries(prerequisites)) {
    assert.doesNotMatch(
      items.join('\n'),
      /<[A-Z][A-Z_]+>/u,
      `${id}: a placeholder must not become an HTML element`,
    );
  }
  assert.match(prerequisites['3-star'].join('\n'), /IMPORT_BASE_BRANCH/u);
});

await test('C11 delivers responsive WebP previews while original captures remain zoom targets', async () => {
  const guides = await loadGuides();
  for (const [id, guide] of Object.entries(guides))
    for (const step of guide.steps) {
      for (const shot of step.screenshots ?? []) {
        assert.ok(shot.previews?.length, `${id}: ${shot.src} has no preview`);
        for (const preview of shot.previews) {
          assert.ok(preview.width <= 1200 && preview.width <= shot.width);
          assert.match(preview.src, /\.webp$/u);
          assert.ok(
            (await readFile(`docs/pages/sdlc-development/guides/${preview.src}`)).length > 0,
          );
        }
      }
    }
  const html = await renderGuide('1');
  assert.match(html, /srcset="[^"]+\.webp \d+w/u);
  assert.doesNotMatch(html, /<img[^>]+src="[^" ]+\.(?:png|jpg)"/u);
  assert.match(html, /<a href="assets\/route-r1-vscode-specification-editor\.png"/u);
});

await test('C13 preserves complete inline code, emphasis and links in each visible field', async () => {
  for (const [id, guide] of Object.entries(await loadGuides()))
    for (const [index, step] of guide.steps.entries()) {
      for (const field of [step.why ?? '', ...step.actions, step.result])
        for (const tag of ['code', 'strong', 'a']) {
          assert.equal(
            (field.match(new RegExp(`<${tag}\\b[^>]*>`, 'gu')) ?? []).length,
            (field.match(new RegExp(`</${tag}>`, 'gu')) ?? []).length,
            `${id}.${index + 1}: ${tag} is split across fields`,
          );
        }
    }
});

await test('every step but the last links to the next step; step 2 closing keeps the branch checkbox action', async () => {
  const guides = await loadGuides();
  for (const id of GUIDE_IDS) {
    const html = await renderGuide(id);
    const n = guides[id].steps.length;
    assert.equal(
      [...html.matchAll(/<a class="step-next" href="#step-(\d\d)">/gu)].length,
      n - 1,
      `${id}: step-next on all but the last step`,
    );
    for (let i = 1; i < n; i += 1) {
      assert.ok(
        html.includes(`id="step-${String(i).padStart(2, '0')}"`) &&
          html.includes(`href="#step-${String(i + 1).padStart(2, '0')}">Следующий шаг`),
        `${id}: step ${i} links to ${i + 1}`,
      );
    }
  }
  const text = JSON.stringify((await loadGuides())['2'].steps.at(-1));
  assert.ok(
    text.includes('Delete source branch') &&
      text.includes('git push origin course/your_login/stage-2-reset'),
  );
});

await test('the catalog names the step 5 implementation section by its rendered summary', async () => {
  const html = await renderGuide('3-star');
  const summary = html.match(/id="implementation"><summary>([^<]*)<\/summary>/u)?.[1] ?? '';
  assert.ok(summary, 'the rendered step 5 guide must expose the implementation handoff summary');
  const catalog = await readFile('docs/pages/sdlc-development/guides/index.html', 'utf8');
  assert.ok(
    catalog.includes(`«${summary}»`),
    'the catalog must point learners at the section by its rendered name',
  );
});

await test('every stage key resolves to its page file from course-names.json', () => {
  for (const [id, expected] of Object.entries(courseNames.guides)) {
    assert.equal(
      guideInfo(id).file,
      expected.file,
      'every stage key resolves to its page file through course-names.json',
    );
  }
});

await test('every stage page keeps its place in the strip and crumb line, goals stay content', async () => {
  const order = STEPS.map((step) => step.id);
  for (const id of GUIDE_IDS) {
    const html = await renderGuide(id);
    assert.doesNotMatch(
      html,
      /route-position/u,
      `${id}: the position plate is gone; the strip and crumb carry wayfinding`,
    );
    const strip = renderStrip(STEPS, routeState(STEPS, id, new Set()), id);
    const step = STEPS.find((entry) => entry.id === id)!;
    const at = order.indexOf(id);
    const prevHref = strip.match(/course-route__edge--prev" href="([^"]+)"/u)?.[1];
    const nextHref = strip.match(/course-route__edge--next" href="([^"]+)"/u)?.[1];
    assert.equal(prevHref, STEPS[at - 1]?.href, `${id}: the left strip arrow leads back`);
    assert.equal(nextHref, STEPS[at + 1]?.href, `${id}: the right strip arrow leads on`);
    const crumbs = crumbItems({ home: { label: 'Карта PDLC', href: '../../' }, step });
    assert.deepEqual(
      crumbs.map((crumb) => crumb.label),
      ['Карта PDLC', 'Курс анализа', `${GROUP_WORDS[step.group]}\u00a0· ${routeLabel(step)}`],
      `${id}: the crumb line names site, course and stage`,
    );
    assert.match(
      strip,
      /course-route__dot" href="index\.html|course-route__word" href="index\.html#course-map"/u,
      `${id}: the strip links to the full map`,
    );
    assert.match(strip, /aria-current="step"/u, `${id}: the current step is marked`);
    assert.match(
      html,
      /<details class="prep-fold"><summary>(?:Слова перед практикой|Слова и репозитории)<span class="terms-count"> · Показать \d+ (?:слово|слова|слов)<\/span><\/summary><section aria-label="Слова перед практикой" id="course-terms">/u,
      `${id}: the preparation card offers a closed glossary`,
    );
    assert.ok(
      html.indexOf('class="lesson-goal"') >= 0 &&
        html.indexOf('class="lesson-goal"') < html.indexOf('id="work-steps"') &&
        html.indexOf('id="course-terms"') < html.indexOf('id="work-steps"'),
      `${id}: learning goals and words come before the steps`,
    );
  }
});

await test('model blocks render closed with copied prompts, actions and human checks only in steps 1–3', async () => {
  const guides = await loadGuides();
  for (const id of GUIDE_IDS) {
    const html = await renderGuide(id);
    const blocks = [...html.matchAll(/<section class="step-model"><h4>[\s\S]*?<\/section>/gu)].map(
      ([block]) => block,
    );
    const expected = guides[id].steps.filter((step) => step.model);
    assert.equal(blocks.length, expected.length);
    if (id === '3-star') assert.equal(blocks.length, 0);
    else assert.ok(blocks.length > 0);
    for (const [i, block] of blocks.entries()) {
      assert.match(block, /^<section class="step-model"><h4>/u);
      const step = renderedStepHtml(html, guides[id].steps.indexOf(expected[i]!) + 1)!;
      assert.ok(
        step.indexOf('<details class="step-additional">') >= 0 &&
          step.indexOf(block) > step.indexOf('<details class="step-additional">'),
      );
      assert.match(block, /<svg[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/svg>С моделью/u);
      for (const heading of ['Что написать модели', 'Что она сделает', 'Что проверяете вы'])
        assert.ok(block.includes('<h4>' + heading + '</h4>'));
      assert.match(block, /class="copy-example"/u);
      assert.match(block, /role="status" aria-live="polite"/u);
      assert.ok(block.includes(expected[i]!.model!.does));
      assert.equal([...block.matchAll(/<li>/gu)].length, expected[i]!.model!.check.length);
    }
  }
});

await test('stage pages with four or more steps expose a step table of contents with working anchors', async () => {
  const guides = await loadGuides();
  for (const id of GUIDE_IDS) {
    const html = await renderGuide(id);
    const count = guides[id].steps.length;
    const toc = html.match(/<nav class="step-toc"[\s\S]*?<\/nav>/u)?.[0] ?? '';
    if (count < 4) {
      assert.equal(toc, '', `${id}: short pages have no table of contents`);
      continue;
    }
    const anchors = [...toc.matchAll(/href="#(step-\d\d)"/gu)].map((match) => match[1]);
    assert.equal(anchors.length, count, `${id}: one anchor per step`);
    for (const anchor of anchors)
      assert.ok(html.includes(`<li id="${anchor}">`), `${id}: ${anchor} target exists`);
  }
});

await test('every «Скачать .md» link of a step points at an existing example file', async () => {
  const links = new Set<string>();
  for (const stage of Object.values(guideContent.stages)) {
    for (const step of stage.steps)
      for (const [, href] of step.links)
        if (/^examples\/.+\.html$/u.test(href) && !href.endsWith('/confluence-page.html'))
          links.add(href.replace(/\.html$/u, '.md'));
  }
  assert.ok(links.size > 0);
  for (const link of links)
    await stat(resolve(import.meta.dirname, '../docs/pages/sdlc-development/guides', link));
});
