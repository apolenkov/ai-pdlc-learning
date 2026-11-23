import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const PAGES = resolve(import.meta.dirname, '../docs/pages/sdlc-development');
const DECK = readFileSync(resolve(PAGES, 'analytics-process-sdd.html'), 'utf8');
const NAV = readFileSync(resolve(PAGES, 'site-nav.css'), 'utf8');

/** Body of the first `@media <query> { ... }` block, found by brace balance. */
const mediaBlock = (css: string, query: string): string => {
  const start = css.indexOf(`@media ${query} {`);
  assert.notEqual(start, -1, `no @media ${query} block`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}' && (depth -= 1) === 0) return css.slice(open + 1, i);
  }
  throw new Error(`unclosed @media ${query} block`);
};

/** Declarations of the first rule whose selector is exactly `selector` inside `css`. */
const rule = (css: string, selector: string): string => {
  const at = css.indexOf(`${selector} {`);
  assert.notEqual(at, -1, `no rule ${selector}`);
  return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
};

await test('analytics deck: mini-card rows become one column on a phone (390 finding M1)', () => {
  const phone = mediaBlock(DECK, '(max-width: 560px)');
  assert.match(
    rule(phone, '.evidence-strip, .meta-flow'),
    /grid-template-columns:\s*minmax\(0,\s*1fr\);/u,
  );
  assert.match(rule(phone, '.meta-flow > span'), /transform:\s*rotate\(90deg\)/u);
});

await test('analytics deck: the three-column rows stay three columns above the phone breakpoint', () => {
  assert.match(
    rule(DECK, '.meta-flow'),
    /grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\) auto minmax\(0, 1fr\)/u,
  );
  assert.match(
    rule(DECK, '.evidence-strip'),
    /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/u,
  );
});

await test('analytics deck: the collapsed counter and Next keep the tighter gap at 320px', () => {
  assert.match(
    rule(mediaBlock(NAV, '(max-width: 360px)'), '.deck-topbar .site-page-actions'),
    /gap:\s*4px/u,
  );
});

await test('analytics deck: the counter is centred in the control row (C2, text no longer rides above the buttons)', () => {
  const counter = rule(NAV, '.deck-topbar .counter');
  assert.match(counter, /display:\s*flex;/u);
  assert.match(counter, /align-items:\s*center;/u);
  assert.match(counter, /justify-content:\s*center;/u);
});

await test('analytics deck: the «Проверка» label of the process matrix lines up with its neighbours on a phone (C3)', () => {
  const phone = mediaBlock(DECK, '(max-width: 720px)');
  assert.match(
    rule(phone, '.process-tile-pair[data-label]::before'),
    /padding-inline:\s*var\(--space-2\);/u,
  );
});
