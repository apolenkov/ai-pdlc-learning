import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { renderStrip, STEPS } from '../docs/pages/sdlc-development/route-strip/strip.ts';
import { routeState } from '../docs/pages/sdlc-development/route-strip/model.ts';

const css = await readFile(
  new URL('../docs/pages/sdlc-development/course-motion.css', import.meta.url),
  'utf8',
);
const wide = css.match(/@media \(min-width: 1280px\) \{([^@]*?)\n\}/u)?.[1] ?? '';
const rule = (source: string, selector: string): string =>
  source.match(
    new RegExp(`^\\s*${selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')} \\{([^}]*)\\}`, 'mu'),
  )?.[1] ?? '';

await test('desktop route keeps the arrows and all dots on one row and shows the complete title and film time', () => {
  assert.match(rule(wide, '.course-route'), /flex-wrap: nowrap/u);
  assert.match(rule(wide, '.course-route > .course-route__groups'), /flex: 0 0 max-content/u);
  const status = rule(wide, '.course-route__status');
  assert.match(status, /max-width: none/u);
  assert.match(status, /flex: 1 1 0/u);
  assert.match(
    rule(wide, '.course-route__status strong, .course-route__status > span'),
    /max-width: 100%; white-space: normal; overflow-wrap: anywhere/u,
  );
  assert.doesNotMatch(wide, /display: none|overflow: (?:hidden|clip)|ellipsis/u);
  assert.doesNotMatch(css, /\.course-route\.is-stuck [^{]*__status[^}]*display: none/u);
  const phone = css.match(/@media \(max-width: 760px\) \{([^@]*?)\n\}/u)?.[1] ?? '';
  assert.match(rule(phone, '.course-route__status'), /display: block/u);
  assert.match(rule(phone, '.course-route__status > span'), /white-space: normal/u);
  assert.match(rule(phone, '.course-route__current > span:last-child'), /overflow-wrap: anywhere/u);
  assert.doesNotMatch(phone, /ellipsis|overflow: (?:hidden|clip)/u);
  assert.doesNotMatch(
    css,
    /@media[^{]*\{\s*\.course-route__(?:status-group|passed)[^}]*display: none/u,
  );
});

await test('the group names go before the last step reaches the next arrow: hidden up to 1079px', () => {
  const limit = css.match(
    /@media \(min-width: 761px\) and \(max-width: (\d+)px\) \{\s*\.course-route__group-name \{ display: none; \}/u,
  )?.[1];
  assert.ok(
    Number(limit) >= 1079,
    `the strip overflowed its arrow at 1024px; the limit is ${limit}`,
  );
});

await test('on 761-807px the strip uses 28px steps and tighter groups, so the last step clears the next arrow', () => {
  const block = css.match(
    /@media \(min-width: 761px\) and \(max-width: (\d+)px\) \{\s*\.course-route \{ --route-node: 28px; \}([^@]*?)\n\}/u,
  );
  assert.ok(
    Number(block?.[1]) >= 807,
    'the small steps reach 807px, where the 32px strip first fits',
  );
  assert.match(block?.[2] ?? '', /\.course-route__groups \{ gap: var\(--customdev-space-3\); \}/u);
});

await test('only a completed self-check adds a check mark and a spoken description to the route symbol', () => {
  const saved = new Set(['0a', '2', '3']);
  const strip = renderStrip(STEPS, routeState(STEPS, '2', saved), '2');
  const dots = [...strip.matchAll(/<li data-route-id="([^"]+)"[^>]*>(.*?)<\/li>/gu)];
  assert.equal(dots.length, STEPS.length);
  for (const [, id, dot] of dots) {
    assert.ok(id && dot);
    const checked = saved.has(id);
    assert.equal(dot.includes('data-selfchecked'), checked, id);
    assert.equal(/aria-label="[^"]*самопроверка пройдена"/u.test(dot), checked, id);
  }
  assert.match(strip.split('class="course-route__compact"')[1]!, /data-selfchecked/u);
  assert.doesNotMatch(
    renderStrip(STEPS, routeState(STEPS, '2', new Set()), '2'),
    /data-selfchecked/u,
  );
  assert.match(rule(css, '.course-route [data-selfchecked]::after'), /content: "✓"/u);
});
