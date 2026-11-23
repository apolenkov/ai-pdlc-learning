import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bundleMotion, placeHtml } from './build-learning-pages.ts';

const BUDGET_BYTES = 50 * 1024;

await test('motion bundle stays within the 50 KB budget and needs no module loader', async () => {
  const bundle = await bundleMotion();
  assert.ok(Buffer.byteLength(bundle) <= BUDGET_BYTES);
  assert.doesNotMatch(bundle, /^\s*(?:import|export)\b/mu);
});

await test('motion is added to atmosphere pages only, never to pages with their own CSP', () => {
  const atmos = '<html data-atmos><head></head><body></body></html>';
  const placed = placeHtml(atmos, '../');
  assert.match(placed, /<link rel="stylesheet" href="\.\.\/course-motion\.css">/u);
  // A classic deferred script, not a module script.
  assert.match(placed, /<script defer src="\.\.\/course-motion\.js"><\/script>/u);
  assert.equal(placeHtml(placed, '../').split('course-motion.js').length, 2);
  assert.doesNotMatch(placeHtml('<html><head></head><body></body></html>', './'), /course-motion/u);
  assert.doesNotMatch(
    placeHtml(
      '<html data-atmos><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"></head></html>',
      './',
    ),
    /course-motion/u,
  );
});

await test('an empty self-check note stays hidden inside a card too', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(
    new URL('../docs/pages/sdlc-development/course-motion.css', import.meta.url),
    'utf8',
  );
  const shown = css.indexOf('.card .check__toast, .check__toast {');
  const hidden = css.indexOf(
    '.card .check__toast:empty, .check__toast:empty { margin: 0; padding: 0; background: none; }',
  );
  // The empty ✓ badge showed under unfinished self-checks (013, 15.10); the live region must stay rendered.
  assert.ok(shown >= 0 && hidden > shown);
  assert.match(css, /\.check__toast:empty::before \{ content: none; \}/u);
  assert.doesNotMatch(css, /check__toast:empty[^{]*\{[^}]*display: none/u);
});

await test('the step-transition flash survives the relay rules that out-specify it', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(
    new URL('../docs/pages/sdlc-development/course-motion.css', import.meta.url),
    'utf8',
  );
  const relay = css.slice(
    css.indexOf('@keyframes course-route-relay'),
    css.indexOf('@keyframes course-route-line'),
  );
  assert.deepEqual(
    [...relay.matchAll(/opacity:\s*([^;]+);/gu)].map((match) => Number(match[1])),
    [1, 1, 1],
    'the number stays opaque through the relay delay and every animation keyframe',
  );
  assert.doesNotMatch(
    relay,
    /box-shadow|border-color|background-color/u,
    'a passed dot cannot flash the current ring during load',
  );
  const fill = css.match(/@keyframes course-route-fill \{([^]*?)\n\}/u)![1]!;
  assert.match(fill, /to \{ background-color: var\(--route-passed\)/u);
  assert.doesNotMatch(fill, /box-shadow|border-color/u);
  // Every mounted strip is `is-live`, and `.is-live .course-route__step …` out-specifies the plain
  // `.is-new` rule: without its own rule the flash never played on the map (found by the frames).
  const live =
    /\.course-route\.is-live \.course-route__step\.is-new > \.course-route__dot > :first-child \{([^}]*)\}/u.exec(
      css,
    );
  assert.ok(live, 'a live strip carries its own is-new rule');
  assert.match(live[1]!, /course-route-fill \.6s ease-out;/u);
  // No delay (the reader just moved) and no `both`: a filled flash would stay pinned on a map node.
  assert.doesNotMatch(live[1]!, /course-route-fill[^;]*both/u);
  assert.doesNotMatch(live[1]!, /course-route-fill[^;]*calc\(/u);
  // The same trap in reverse: the live state rules out-specify the reduced-motion reset, so a plain
  // `animation: none` loses — the breathing ring and the flashes would keep playing (found on review).
  assert.match(
    css,
    /\.course-route__step\.is-new > \.course-route__dot > :first-child \{ animation: none !important; opacity: 1; transform: none; \}/u,
  );
});

await test('CSP maps permit exactly the shared navigation handlers without allowing arbitrary inline code', async () => {
  const { createHash } = await import('node:crypto');
  const { NAV_ESCAPE_HANDLER, MORE_TOGGLE_HANDLER } = await import('./site-navigation-contract.ts');
  const source =
    '<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'sha256-original\';"></head><body><nav data-global-nav></nav></body></html>';
  const html = placeHtml(source, './');
  for (const handler of [NAV_ESCAPE_HANDLER, MORE_TOGGLE_HANDLER])
    assert.ok(html.includes(`'sha256-${createHash('sha256').update(handler).digest('base64')}'`));
  assert.match(html, /script-src 'sha256-original'/u);
  assert.match(html, /script-src-attr 'unsafe-hashes'/u);
  assert.doesNotMatch(html, /'unsafe-inline'/u);
  assert.equal(placeHtml(html, './').match(/script-src-attr/gu)?.length, 1);
});
