import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { crumbItems } from '../docs/pages/sdlc-development/route-strip/crumbs.ts';
import { STEPS_INTENT } from '../docs/pages/sdlc-development/route-strip/strip.ts';

// Layout review TASK-904, hub pages of the course: each defect was measured at 1440×900 before the
// fix; these checks keep the fixed state. Numbers are the defect ids of the review.
const ROOT = resolve(import.meta.dirname, '..');
const PAGES = 'docs/pages/sdlc-development';
const read = (file: string): Promise<string> => readFile(resolve(ROOT, PAGES, file), 'utf8');

/** Body of the first rule whose selector list equals `selector` exactly. */
const rule = (css: string, selector: string): string => {
  const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = new RegExp(`(?:^|[}\\n])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'u').exec(css);
  assert.ok(match, `no rule ${selector}`);
  return match[1]!;
};

await test('hub pages: result band under the intro, one-column map help, steps as a text column', async () => {
  const css = await read('guides/learning-enhancements/09-route-hub-layout.css');
  // #1: the result card is a band under the intro, the acceptance rule reads in lines up to 68ch.
  assert.match(
    rule(css, '.route-page .hero'),
    /grid-template-columns:minmax\(0,1fr\) minmax\(0,\.7fr\)/u,
  );
  assert.match(
    await read('guides/index.html'),
    /<\/header>[\s\S]*?<p id="acceptance-rule">Для одобрения/u,
  );
  assert.match(rule(css, '.route-page .hero>.proof>p'), /max-width:68ch/u);
  assert.match(rule(css, '.route-page .hero>.proof>span'), /text-transform:none/u);
  // #2: «Как пользоваться картой» in one column, items as tall as their text.
  assert.match(
    rule(css, '.route-page .map-howto__steps'),
    /grid-template-columns:minmax\(0,1fr\)/u,
  );
  assert.match(rule(css, '.route-page .map-howto__steps'), /align-items:start/u);
  // #3: map facts labels are plain bold text, pairs 10px apart.
  assert.match(rule(css, '.course-map__facts span'), /text-transform:none/u);
  assert.match(rule(css, '.course-map__facts'), /gap:10px/u);
  // #7: tool chips keep 12px above «Результат:».
  assert.match(rule(css, '.route-page .route-card>.route-tools+p'), /margin-top:12px/u);
  // #8, #10: step cards, branches and the practicum share one text column.
  assert.match(
    css,
    /\.route-page \.route-row--solo>\.route-card,\s*\.route-page \.r4-entries>\.star-route\{width:100%;max-width:700px\}/u,
  );
  assert.match(rule(css, '.route-page #implementation.route-outcome'), /max-width:700px/u);
  assert.match(
    css,
    /@media\(min-width:1101px\)\{\s*\.route-page #implementation\.route-outcome\{max-width:none/u,
  );
  assert.match(css, /#implementation ol\{grid-column:2;grid-row:1\/span 4/u);
  assert.match(
    css,
    /\.route-page \.r4-entries>\.star-route\{grid-template-columns:minmax\(0,1fr\)/u,
  );
  // #11: the practicum is a plain numbered list.
  assert.match(rule(css, '.route-page #implementation ol'), /list-style:decimal/u);
  assert.match(rule(css, '.route-page #implementation li::before'), /content:none/u);
  // #12: section plates cover the route line.
  assert.match(rule(css, '.route-page .route-board .route-block-title'), /z-index:1/u);
  // #14: the role dictionary reads at paragraph width without the 40px indent.
  assert.match(rule(css, '.route-page .course-surface dd'), /max-width:68ch;margin:4px 0 0/u);
});

await test('hub page: steps 5, 6а, 6б and 7 carry a marker on the route line like steps 1–4 (#9)', async () => {
  const html = await read('guides/index.html');
  for (const id of ['3-star', '4-new', '4-legacy', 'delivery'])
    assert.match(
      html,
      new RegExp(`data-route-marker="\\{\\{NUMBER:${id}\\}\\}"`, 'u'),
      `marker ${id}`,
    );
  const css = await read('guides/learning-enhancements/09-route-hub-layout.css');
  assert.match(
    css,
    /\.route-page \[data-route-marker\]::before\{[^}]*content:attr\(data-route-marker\)/u,
  );
});

await test('the intent course page names its own course in the crumb line (#13)', () => {
  const home = { label: 'Карта PDLC', href: '../../' };
  assert.deepEqual(
    crumbItems({ home, onMap: true, mapCourse: 'Намерение и план' }).map((item) => item.label),
    ['Карта PDLC', 'Намерение и план'],
  );
  assert.deepEqual(
    crumbItems({ home, onMap: true }).map((item) => item.label),
    ['Карта PDLC', 'Курс анализа'],
    'the analysis course page keeps its name',
  );
  // A step of the intent course: home, the intent course page, the step (frame review of 9a144a71, #5).
  const step = STEPS_INTENT.find((item) => item.id === 'i1');
  assert.ok(step);
  assert.deepEqual(
    crumbItems({
      home: { label: 'Маршрут курса', href: './' },
      step,
      stepCourse: { label: 'Намерение и план', href: 'intent.html' },
      courseRoot: true,
    }).map((item) => [item.label, item.href]),
    [
      ['Маршрут курса', './'],
      ['Намерение и план', 'intent.html'],
      ['Шаг\u00a01\u00a0· Проблема и эффект', undefined],
    ],
  );
});

await test('SDD deck: subtitle, links, matrix columns, level cards and callouts (#29–#36)', async () => {
  const html = await read('analytics-process-sdd.html');
  assert.match(html, /\.slide-title \+ \.lead \{ margin-top: var\(--space-4\); \}/u, '#29');
  assert.match(
    html,
    /\.slide > \.slide-links \+ \.slide-footer \{ margin-top: var\(--space-6\); \}/u,
    '#30',
  );
  assert.doesNotMatch(
    html,
    /\.process-layer--\d \{ margin-left:/u,
    '#31: rows stay under the column labels',
  );
  assert.match(
    html,
    /\.process-layer--4 > \.process-layer-label \{ padding-left:/u,
    '#31: the staircase is inside the layer cell',
  );
  assert.match(
    html,
    /\.level-card \{ display: flex; flex-direction: column;/u,
    '#32: links sit at the bottom',
  );
  assert.match(
    rule(html, '.guide-link'),
    /margin-top:\s*auto;/u,
    '#32: the bottom link absorbs free space',
  );
  for (const slide of [4, 5]) {
    const section = html.split(`id="slide-${slide}"`)[1]!.split(`id="slide-${slide + 1}"`)[0]!;
    const cards = [...section.matchAll(/<article class="level-card[^"]*">([^]*?)<\/article>/gu)];
    assert.equal(cards.length, 3);
    for (const [, content] of cards)
      assert.match(content!, /<\/div>\s*<a class="guide-link"[^>]*>[^]*?<\/a>\s*$/u);
  }
  assert.match(html, /\.level-actions a \{ color: var\(--color-green\);/u, '#33');
  assert.match(html, /\.bottleneck-callout p \{[^}]*font-weight: 450;/u, '#34');
  assert.match(html, /\.local-flow \.stage-label \{\s*min-height: 2\.24em;/u, '#35');
  for (const label of ['.stage-label', '.card-copy']) {
    const row = rule(html, `body.is-presentation #slide-1 .local-flow ${label}`);
    assert.match(row, /display: block/u);
    assert.doesNotMatch(row, /align-items:\s*center/u);
  }
  assert.match(html, /\.slide-note \{[^}]*text-align: left;/u, '#36');
});

await test('harness page: scheme at natural size, paragraphs at 72ch, plain benchmark list (#48–#51)', async () => {
  const css = await read('harness-levels.css');
  assert.match(css, /\.harness-figure img \{[^}]*width: 3094px; max-width: none;/u, '#48');
  assert.match(css, /\.harness-figure-scroll \{[^}]*overflow: auto;/u, '#48');
  assert.match(
    css,
    /\.harness-prose p, \.harness-compare p, \.reference-panel > header p \{ max-width: 72ch; \}/u,
    '#49',
  );
  const page = await read('harness-levels.html');
  const compare = page.match(/<ul class="harness-compare">([^]*?)<\/ul>/u)?.[1] ?? '';
  assert.equal(compare.match(/<li><p>[^]*?<\/p><\/li>/gu)?.length, 2);
  assert.match(
    rule(css, '.harness-compare'),
    /grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 26rem\), 1fr\)\)/u,
  );
  const header = rule(css, '.reference-panel > header');
  assert.match(header, /border:\s*0;/u, '#38');
  assert.match(header, /background:\s*transparent;/u, '#38');
  assert.match(css, /#benchmark \.reference-rule-list > li \{[^}]*border: 0;/u, '#50');
  assert.match(css, /\.harness-pair \{[^}]*align-items: start;/u, '#51');
  assert.match(css, /\.harness-pair ul \+ p \{ margin-top: 12px; \}/u, '#51');
});

await test('calculator: readiness conditions are dots, not empty checkboxes (#45)', async () => {
  const css = await read('guides/learning-enhancements/04-calculator.css');
  assert.match(
    css,
    /\.calculator-page \.readiness-card \.check li::before\{[^}]*border:0;border-radius:50%/u,
  );
});

await test('calculator: the dash before the first calculation is body-size text (#44)', async () => {
  const css = await read('guides/learning-enhancements/04-calculator.css');
  const html = await read('examples/credit-calculator.html');
  assert.match(html, /<output id="payment"[^>]*data-state="empty">—<\/output>/u);
  assert.match(
    rule(css, '.calculator-page main .eyebrow,.calculator-page .result-kicker'),
    /text-transform:none/u,
    '#20',
  );
  assert.match(
    html,
    /<output id="payment"[^>]*>—<\/output>\s*<p[^>]*>[^<]*<\/p>\s*<div class="formula-strip"/u,
  );
  assert.deepEqual(
    [...html.matchAll(/<b id="summary-([^"]+)">—<\/b>/gu)].map(([, id]) => id),
    ['principal', 'rate', 'months'],
  );
  assert.match(
    rule(css, '.calculator-page .result output[data-state="empty"]~.formula-strip'),
    /display:none/u,
  );
  assert.match(rule(css, '.calculator-page .formula-strip'), /display:grid/u);
  assert.match(
    css,
    /\.calculator-page \.result output\[data-state="empty"\]\{font-size:1rem;color:var\(--muted\)\}/u,
  );
});

await test('the empty payment caption explains the dash and the readiness markers start at the heading edge', async () => {
  const css = await read('guides/learning-enhancements/04-calculator.css');
  assert.match(
    await read('examples/credit-calculator.html'),
    /id="payment-context">Платёж появится после расчёта\.<\/p>/u,
  );
  assert.match(
    rule(css, '.calculator-page .result output[data-state="empty"]+.result-context'),
    /font-size:18px/u,
  );
  assert.match(rule(css, '.calculator-page .readiness-card .check'), /padding-inline-start:0/u);
});

await test('intent hub keeps only the outcome in the header and links to the approval rule in the body', async () => {
  const html = await read('guides/intent.html');
  const header = html.match(/<header class="hero">([\s\S]*?)<\/header>/u)?.[1];
  assert.ok(header);
  assert.match(
    header,
    /<aside class="proof">\s*<span>Проверяемый результат обучения<\/span>\s*<strong>Принятая запись намерения[^<]+<\/strong>\s*<\/aside>/u,
  );
  assert.equal(html.match(/Для принятия нужны комментарии/gu)?.length, 1);
  assert.equal(html.match(/id="acceptance-rule"/gu)?.length, 1);
  assert.match(
    html,
    /<main [^>]*>[\s\S]*?<section class="course-surface" aria-labelledby="handoff-title">\s*<h2[^>]*>Передача в анализ<\/h2>\s*<p id="acceptance-rule">Для принятия нужны комментарии[^<]+после правок смысла его нужно получить заново\.<\/p>/u,
  );
  assert.match(html, /href="#acceptance-rule"/u);
});
