import assert from 'node:assert/strict';
import { test } from 'node:test';
import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import { gearsSvg } from '../docs/pages/sdlc-development/route-strip/gears.ts';
import { buildRoute, routeState } from '../docs/pages/sdlc-development/route-strip/model.ts';
import { renderStrip } from '../docs/pages/sdlc-development/route-strip/strip.ts';
import { mountFixture } from './route-strip-test-support.ts';

const steps = buildRoute(courseNames, { '0': 404.3, '1': 281.7, '2': 274.3 });
const at = (id: string | null, done: string[] = []) =>
  renderStrip(steps, routeState(steps, id, new Set(done)), id);

await test('on a guide the strip names the groups in words, links every step and marks only the current one', () => {
  const html = at('2');
  assert.match(html, /^<nav class="course-route" aria-label="Маршрут курса"/u);
  for (const word of ['Подготовка', 'Практика', 'Разработка']) assert.ok(html.includes(word), word);
  const links = [...html.matchAll(/<a class="course-route__dot[^"]*" href="([^"]+)"/gu)].map(
    (m) => m[1],
  );
  assert.deepEqual(
    links,
    steps.map((step) => step.href),
  );
  assert.deepEqual(
    [...html.matchAll(/style="--i:(\d+)"/gu)].map((m) => Number(m[1])),
    steps.map((_, i) => i),
    'every node carries its relay index',
  );
  assert.equal(html.match(/aria-current="step"/gu)?.length, 1);
  assert.match(
    html,
    /course-route__status-group[^>]*>Практика · <\/span>Шаг\u00a02\u00a0· Проверяем и согласуем/u,
  );
  assert.doesNotMatch(html, /П[1-3]|С[1-4]|Д1/u, 'route codes are not reader-facing labels');
  for (const letter of ['а', 'б'])
    assert.ok(html.includes(`>6<span class="course-route__suffix">${letter}</span>`));
  const dots = [...html.matchAll(/<a class="course-route__dot"[^>]*>/gu)];
  assert.equal(dots.length, steps.length);
  for (const [dot] of dots) {
    const title = dot.match(/ title="([^"]+)"/u)?.[1];
    assert.match(title ?? '', /^(Подготовка|Практика|Разработка)[\s\S]*·/u);
    assert.ok(dot.includes(`aria-label="${title}"`));
  }
  assert.match(
    html,
    /<span class="course-route__passed">пройдено ≈ \d+ мин · <\/span>осталось ≈ \d+ мин роликов/u,
    'the passed part can be dropped on narrow desktops',
  );
  assert.match(html, /вы смотрите/u);
  assert.match(
    at('4-legacy'),
    /data-route-id="4-new" class="[^"]*is-traversed/u,
    'the line reaches the second branch without marking its sibling passed',
  );
  assert.equal([...html.matchAll(/class="course-route__icon /gu)].length, 3);
  assert.doesNotMatch(html, /course-route__bar/u, 'steps show progress');
});
await test('on the map nothing is current and the strip invites to start with preparation', () => {
  const html = at(null);
  assert.doesNotMatch(html, /aria-current/u);
  assert.match(html, /Начните: Подготовка\u00a0· Зачем меняем процесс/u);
  assert.match(html, /≈ \d+ мин роликов/u);
});
await test('no step renders as NaN or undefined, even without film minutes', () => {
  const bare = buildRoute(courseNames, {});
  for (const id of [null, '0', '4-legacy', 'delivery']) {
    const html = renderStrip(bare, routeState(bare, id, new Set()), id);
    assert.doesNotMatch(html, /NaN|undefined|null/u, String(id));
  }
});
await test('gears stay a small inline svg drawn at its natural 34x22 box', () => {
  const svg = gearsSvg();
  assert.match(svg, /^<svg[^>]+viewBox="0 0 34 22" width="34" height="22"[^>]+aria-hidden="true"/u);
  assert.ok(svg.length < 2048, `${svg.length} bytes`);
});
await test('on the map with marks the strip offers to continue from the first step not passed', () => {
  const html = at(null, ['0', '0a']);
  assert.doesNotMatch(html, /Начните: Подготовка\u00a0· Зачем меняем процесс/u);
  assert.match(html, /<a href="p3-sdd\.html">Продолжить: Подготовка\u00a0· SDD и OpenSpec<\/a>/u);
  assert.match(html, /пройдено ≈ \d+ мин · <\/span>осталось ≈ \d+ мин роликов/u);
});
await test('preparation has unnumbered dots and one preparation label in its status', () => {
  const html = at('0a');
  const preparation = html.match(/<ol class="course-route__steps">([^]*?)<\/ol>/u)?.[1] ?? '';
  assert.equal((preparation.match(/course-route__dot/g) ?? []).length, 4);
  assert.doesNotMatch(preparation, /course-route__number|Шаг|справка, по желанию|is-optional/u);
  assert.equal(
    new Set([...preparation.matchAll(/<svg[^]*?<\/svg>/gu)].map(([svg]) => svg)).size,
    4,
  );
  assert.equal(
    preparation.match(/<svg viewBox="0 0 24 24" width="22" height="22"/gu)?.length,
    4,
    'preparation icons are 22 px inside the 36 px nodes',
  );
  assert.match(preparation, /data-title="Подготовка 2 · Markdown, Git, GitLab"/u);
  assert.match(
    html,
    /<strong title="Подготовка\u00a0· Markdown, Git, GitLab">Подготовка\u00a0· Markdown, Git, GitLab<\/strong>/u,
  );
  assert.doesNotMatch(html, /Подготовка · <\/span>Подготовка|Шаг\s*·/u);
});
await test('map viewing follows only the nearest intersecting card, survives progress refresh and never writes progress', (t) => {
  const f = mountFixture(t, true);
  f.sticky(true);
  const observer = () =>
    f.intersections.filter((item) => item.targets.includes(f.cards[0]!)).at(-1)!;
  const notify = (entries: { target: object; isIntersecting: boolean }[]) =>
    observer().notify(entries.map((entry) => ({ ...entry, boundingClientRect: { top: 0 } })));
  const viewing = () =>
    f.dots.filter((dot) => dot.classList.contains('is-viewing')).map((dot) => dot.dataset.routeId);
  notify(f.cards.map((target) => ({ target, isIntersecting: true })));
  assert.deepEqual(viewing(), ['2']);
  assert.equal(f.dots[1]?.attributes.get('aria-label'), 'Шаг 2 — вы смотрите');
  assert.equal(f.status.href, 's2-review.html');
  assert.equal(f.status.textContent, 'Шаг\u00a02\u00a0· Проверяем и согласуем');
  f.fire('course-route:update');
  assert.deepEqual(viewing(), ['2']);
  assert.equal(f.status.href, 's2-review.html', 'refresh restores the viewed step link');
  assert.match(f.compact.innerHTML, /class="course-route__current" href="s2-review.html"/u);
  assert.match(f.compact.innerHTML, /aria-label="Вперёд: Шаг\u00a03/u);
  notify([{ target: f.cards[1]!, isIntersecting: false }]);
  assert.deepEqual(viewing(), ['1']);
  assert.equal(f.status.href, 's1-git.html');
  assert.equal(f.status.textContent, 'Шаг\u00a01\u00a0· Требования в Git');
  notify([{ target: f.cards[0]!, isIntersecting: false }]);
  assert.deepEqual(viewing(), []);
  assert.equal(f.status.href, 'p1-zachem.html', 'leaving the map restores the next unpassed step');
  for (const dot of f.dots)
    assert.equal(dot.attributes.get('aria-label'), `Шаг ${dot.dataset.routeId}`);
  f.root.clientHeight = 800;
  f.events.dispatchEvent(new Event('resize'));
  f.root.clientHeight = 700;
  f.events.dispatchEvent(new Event('resize'));
  assert.equal(f.frames.length, 1, 'resize events share one pending frame');
  assert.equal(observer().margin, '-450px 0px', 'the observer waits for the frame');
  f.flush();
  assert.equal(observer().margin, '-315px 0px');
  notify([{ target: f.cards[0]!, isIntersecting: true }]);
  assert.deepEqual(viewing(), ['1']);
  f.root.clientHeight = 600;
  f.fire('resize');
  assert.equal(observer().margin, '-270px 0px');
  assert.equal(f.writes(), 0);
});
await test('the strip pulses the step the reader just left and keeps the load relay to one run', (t) => {
  const f = mountFixture(t, true);
  assert.ok(f.strip.classList.contains('is-live'), 'the load relay starts with the mounted strip');
  const observer = () =>
    f.intersections.filter((item) => item.targets.includes(f.cards[0]!)).at(-1)!;
  const notify = (entries: { target: object; isIntersecting: boolean }[]) =>
    observer().notify(entries.map((entry) => ({ ...entry, boundingClientRect: { top: 0 } })));
  const pulsed = () =>
    f.dots.filter((dot) => dot.classList.contains('is-new')).map((dot) => dot.dataset.routeId);
  notify([{ target: f.cards[0]!, isIntersecting: true }]);
  assert.deepEqual(pulsed(), [], 'the first card stays quiet until the reader moves on');
  notify([{ target: f.cards[1]!, isIntersecting: true }]);
  assert.deepEqual(pulsed(), ['1'], 'the step left behind is the only one that flashes');
  notify([
    { target: f.cards[1]!, isIntersecting: true },
    { target: f.cards[0]!, isIntersecting: false },
  ]);
  assert.deepEqual(pulsed(), ['1'], 'more intersection noise does not cut the flash short');
  notify([{ target: f.cards[1]!, isIntersecting: false }]);
  assert.deepEqual(pulsed(), [], 'the strip rests again once the reader leaves the map');
  notify([{ target: f.cards[0]!, isIntersecting: true }]);
  assert.deepEqual(pulsed(), [], 'going back flashes nothing');
  f.fire('course-route:update');
  assert.equal(
    f.strip.classList.contains('is-live'),
    false,
    'a progress refresh does not replay the relay',
  );
});

for (const onMap of [false, true])
  await test(`sentinel sticking survives progress refresh and measures the compact strip (map=${onMap})`, (t) => {
    const f = mountFixture(t, onMap, 0);
    assert.ok(f.root.classList.contains('has-course-route'));
    assert.equal(f.properties.get('--route-top'), '92px');
    assert.equal(f.properties.get('--route-height'), '54px');
    assert.equal(f.properties.get('--route-sticky-height'), '146px');
    f.scroll(40);
    assert.equal(
      f.properties.get('--route-top'),
      '0px',
      'strip stays at the top when the menu hides',
    );
    f.sticky(true);
    assert.ok(f.strip.classList.contains('is-stuck'));
    assert.equal(f.properties.get('--route-top'), '0px');
    f.strip.height = 38;
    f.resizeStrip();
    assert.equal(f.properties.get('--route-height'), '38px');
    assert.equal(
      f.properties.get('--route-sticky-height'),
      '38px',
      'anchor padding follows rendered compact height',
    );
    const mounted = f.nav.nextElementSibling;
    f.fire('course-route:update');
    assert.equal(f.nav.nextElementSibling, mounted, 'progress refresh preserves the mounted strip');
    assert.ok(f.strip.classList.contains('is-stuck'));
    assert.equal(f.properties.get('--route-top'), '0px');
    f.sticky(false);
    assert.equal(f.strip.classList.contains('is-stuck'), false);
    assert.equal(f.properties.get('--route-top'), '0px');
  });
await test('restored scroll hides the menu before the first scroll event and lets the reader reveal it', (t) => {
  const f = mountFixture(t, false, 120);
  assert.ok(f.nav.classList.contains('is-route-menu-hidden'));
  assert.equal(f.properties.get('--route-top'), '0px');
  f.sticky(true);
  f.scroll(112);
  assert.equal(f.nav.classList.contains('is-route-menu-hidden'), false);
  assert.ok(f.strip.classList.contains('is-stuck'));
  f.scroll(124);
  assert.ok(f.nav.classList.contains('is-route-menu-hidden'));
  f.nav.dispatchEvent(new Event('focusin'));
  assert.equal(f.nav.classList.contains('is-route-menu-hidden'), false);
});
await test('menu hides after accumulated downward movement and reveals on upward movement or focus', (t) => {
  const f = mountFixture(t);
  f.sticky(true);
  f.scroll(3);
  f.scroll(6);
  assert.ok(
    !f.nav.classList.contains('is-route-menu-hidden'),
    'small downward movements wait for the threshold',
  );
  f.scroll(9);
  assert.ok(
    f.nav.classList.contains('is-route-menu-hidden'),
    'small movements accumulate to hide the menu',
  );
  f.scroll(8);
  assert.ok(f.nav.classList.contains('is-route-menu-hidden'), 'no jitter on a 1px reversal');
  f.scroll(1);
  assert.ok(
    !f.nav.classList.contains('is-route-menu-hidden'),
    'accumulated upward movement reveals the menu',
  );
  assert.ok(f.strip.classList.contains('is-stuck'), 'revealed menu keeps the strip sticky');
  assert.equal(
    f.properties.get('--route-top'),
    '92px',
    'strip touches the revealed menu bottom without a gap',
  );
  assert.equal(f.properties.get('--route-sticky-height'), '146px', 'anchors clear both panels');
  f.scroll(60);
  assert.ok(f.nav.classList.contains('is-route-menu-hidden'));
  assert.equal(f.properties.get('--route-top'), '0px');
  assert.equal(f.properties.get('--route-sticky-height'), '54px');
  f.fire('click');
  f.scroll(30);
  assert.ok(f.nav.classList.contains('is-route-menu-hidden'), 'anchor jump keeps menu hidden');
  f.fire('wheel');
  f.scroll(20);
  assert.equal(f.nav.classList.contains('is-route-menu-hidden'), false);
  f.scroll(40);
  f.fire('hashchange');
  f.doc.activeElement = f.nav;
  f.nav.dispatchEvent(new Event('focusin'));
  f.flush();
  assert.equal(f.properties.get('--route-top'), '92px', 'focus without scrolling');
  assert.equal(f.properties.get('--route-sticky-height'), '146px');
  assert.ok(!f.nav.classList.contains('is-route-menu-hidden'), 'keyboard focus reveals the menu');
  f.scroll(80);
  assert.ok(!f.nav.classList.contains('is-route-menu-hidden'), 'focused menu remains reachable');
  f.fire('hashchange');
  assert.equal(f.nav.classList.contains('is-route-menu-hidden'), false);
  assert.equal(f.properties.get('--route-top'), '92px', 'focused menu still clears a hash target');
  f.doc.activeElement = f.strip;
  f.strip.dispatchEvent(new Event('focusin'));
  assert.equal(f.properties.get('--route-top'), '0px', 'focusing the strip hides the menu');
  assert.equal(f.properties.get('--route-sticky-height'), '54px');
  f.doc.activeElement = null;
  f.nav.dispatchEvent(new Event('focusin'));
  f.fire('hashchange');
  assert.equal(f.properties.get('--route-top'), '0px', 'hash jumps clear the menu immediately');
  assert.equal(f.properties.get('--route-sticky-height'), '54px');
});
await test('map route is bound to the start of the path: hidden above it, pinned once the title is reached, hidden again on return', (t) => {
  const f = mountFixture(t, true);
  assert.deepEqual(
    f.introduction.placedBefore,
    [f.sentinel],
    'the sentinel stands before #course-introduction-title',
  );
  assert.deepEqual(f.nav.placedBefore, [], 'the menu is not the trigger on the map');
  assert.ok(f.sentinel.className.includes('course-route-sentinel--map'));
  assert.equal(f.strip.hidden, true, 'no route panel from the top of the map');
  assert.equal(f.strip.classList.contains('is-stuck'), false);
  assert.equal(f.properties.get('--route-height'), '54px', 'hidden panel is measured');
  assert.equal(f.properties.get('--route-sticky-height'), '146px');
  assert.equal(
    f.properties.has('--site-nav-reserve'),
    false,
    'the map reserve stays CSS-owned so the appearing panel does not move the page',
  );
  const observer = f.intersections.find((item) => item.targets.includes(f.sentinel));
  assert.ok(observer);
  observer.notify([
    { target: f.sentinel, isIntersecting: false, boundingClientRect: { top: 800 } },
  ]);
  assert.equal(f.strip.hidden, true, 'a sentinel below the viewport is not a reached title');
  f.sticky(true);
  assert.equal(f.strip.hidden, false, 'the panel appears once the title is reached');
  assert.ok(f.strip.classList.contains('is-stuck'));
  f.fire('course-route:update');
  assert.equal(f.strip.hidden, false, 'progress refresh preserves visibility');
  f.strip.height = 38;
  f.resizeStrip();
  assert.equal(f.properties.get('--route-sticky-height'), '130px');
  f.sticky(false);
  assert.equal(f.strip.hidden, true, 'returning above the title hides the panel again');
  assert.equal(f.strip.classList.contains('is-stuck'), false);
  assert.equal(f.properties.get('--route-height'), '38px', 'hidden panel keeps its measure');
  f.fire('course-route:update');
  assert.equal(f.strip.hidden, true, 'progress refresh preserves the hidden state');
});
await test('a guide step keeps the panel pinned from the load: its sentinel stays before the menu', (t) => {
  const f = mountFixture(t, false);
  assert.deepEqual(f.nav.placedBefore, [f.sentinel]);
  assert.deepEqual(f.introduction.placedBefore, []);
  assert.equal(f.strip.hidden, false);
  assert.equal(f.properties.get('--site-nav-reserve'), '170px');
  f.sticky(true);
  assert.equal(f.strip.hidden, false);
  f.sticky(false);
  assert.equal(f.strip.hidden, false, 'a guide never hides the panel');
});
await test('the map without a course introduction falls back to the pinned panel', (t) => {
  const f = mountFixture(t, true, 0, { introduction: false });
  assert.equal(f.strip.hidden, false);
  assert.deepEqual(f.nav.placedBefore, [f.sentinel]);
  f.sticky(false);
  assert.equal(f.strip.hidden, false);
});
await test('the map CSS lifts the sentinel and keeps its reserve and veil off the hidden panel', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(
    new URL('../docs/pages/sdlc-development/course-motion.css', import.meta.url),
    'utf8',
  );
  assert.match(css, /\.course-route\[hidden\]\s*\{\s*display:\s*none/u, 'hidden beats flex');
  assert.match(css, /\.course-route-sentinel--map \{[^}]*position: relative;[^}]*translateY\(/u);
  assert.doesNotMatch(
    css,
    /html:has\(body\[data-stage\]\), html:has\(#course-map\) \{[^}]*--site-nav-reserve/u,
    'the map does not inherit the strip reserve',
  );
  assert.match(
    css,
    /:not\(:has\(\.course-route\[hidden\]\)\)::before/u,
    'no tall veil over the hidden panel',
  );
});
await test('only the current step carries the current mark, a branch sibling included', () => {
  for (const [current, branch] of [
    ['3', '4-new'],
    ['4-new', '4-legacy'],
  ] as const) {
    const html = at(current);
    assert.equal((html.match(/aria-current="step"/gu) ?? []).length, 1);
    assert.equal((html.match(/class="course-route__step is-current/gu) ?? []).length, 1);
    assert.match(
      html,
      new RegExp(`data-route-id="${current}" class="course-route__step is-current`, 'u'),
    );
    assert.match(
      html,
      new RegExp(`data-route-id="${branch}" class="course-route__step is-ahead`, 'u'),
    );
  }
});
await test('hovering a step that is not current never draws the current ring', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(
    new URL('../docs/pages/sdlc-development/course-motion.css', import.meta.url),
    'utf8',
  );
  const hover = [...css.matchAll(/([^{}]*\.course-route__dot:hover[^{}]*)\{([^}]*)\}/gu)].filter(
    ([, selector]) => !selector!.includes('::after'),
  );
  assert.ok(hover.length > 0, 'the strip dot has a hover rule');
  for (const [, selector, body] of hover) {
    // A hovered branch must remain distinct from the current step.
    assert.doesNotMatch(body!, /border-color:\s*var\(--route-green\)/u, selector!);
    assert.doesNotMatch(body!, /box-shadow/u, selector!);
  }
});
await test('mobile route names the current step and links its actual neighbours, including ends and branches', () => {
  for (const [id, current, previous, next] of [
    ['2', 's2-review.html', 's1-git.html', 's3-openspec.html'],
    ['0', 'p1-zachem.html', null, 'p2-git.html'],
    ['4-legacy', 's4b-legacy.html', 's4-product.html', 'd1-delivery.html'],
    ['delivery', 'd1-delivery.html', 's4-product.html', null],
  ]) {
    const compact = at(id!).split('<div class="course-route__compact">')[1]!;
    assert.ok(compact, 'a narrow viewport has a route control');
    assert.ok(compact.includes(`href="${current}"`));
    assert.doesNotMatch(compact, /из \d/u);
    assert.match(compact, id === '0' ? /course-route__prep[^]*?<svg/u : /course-route__number/u);
    if (id === '0') assert.match(compact, /Подготовка\u00a0· Зачем меняем процесс/u);
    const arrows = [...compact.matchAll(/class="course-route__arrow" href="([^"]+)"/gu)].map(
      (m) => m[1],
    );
    assert.deepEqual(arrows, [previous, next].filter(Boolean));
    assert.equal(
      (compact.match(/role="link" aria-disabled="true"/gu) ?? []).length,
      previous && next ? 0 : 1,
    );
  }
});
