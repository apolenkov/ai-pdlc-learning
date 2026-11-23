import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isTerminalBlock,
  TERMINAL_TOOLBAR_HTML,
} from '../docs/pages/sdlc-development/guides/renderer/copy-buttons.ts';
import { GUIDE_IDS, renderGuide } from './learner-guide-test-support.ts';

/** Minimal stand-in for a <pre> element: the enhancer only asks whether it carries a <code> child. */
const preStub = (hasCode: boolean): { querySelector: (selector: string) => unknown } => ({
  querySelector: (selector: string): unknown => (hasCode && selector === 'code' ? true : null),
});

await test('the R-1 example preview stays out of the terminal enhancer', async () => {
  let previews = 0;
  for (const id of GUIDE_IDS) {
    const html = await renderGuide(id);
    for (const match of html.matchAll(/<pre class="example-preview"/gu)) {
      previews += 1;
      const rest = html.slice(match.index ?? 0);
      const tag = rest.slice(0, rest.indexOf('>') + 1);
      const inner = rest.slice(0, rest.indexOf('</pre>'));
      assert.match(tag, /aria-hidden="true"/u, `${id}: the preview is hidden from assistive tech`);
      assert.doesNotMatch(
        tag,
        /\btabindex/u,
        `${id}: the aria-hidden preview must not be focusable`,
      );
      assert.doesNotMatch(inner, /<code/u, `${id}: the preview is plain text, not a command block`);
    }
  }
  assert.ok(previews > 0, 'at least one guide renders a long-example preview');
});

await test('only a pre with a code child becomes a terminal block', () => {
  assert.equal(
    isTerminalBlock(preStub(false)),
    false,
    'the preview must not get a second, dead copy button',
  );
  assert.equal(isTerminalBlock(preStub(true)), true, 'a real command block is wrapped');
});

await test('the terminal toolbar skeleton carries no interpolated label', () => {
  assert.match(TERMINAL_TOOLBAR_HTML, /<strong><\/strong>/u, 'the label goes in via textContent');
  assert.doesNotMatch(TERMINAL_TOOLBAR_HTML, /\$\{/u, 'no command text is interpolated into HTML');
  assert.match(TERMINAL_TOOLBAR_HTML, /class="copy-example"/u);
  assert.match(TERMINAL_TOOLBAR_HTML, /role="status" aria-live="polite"/u);
});

await test('a collapsed example keeps exactly one full-text code block to copy', async () => {
  let checked = 0;
  for (const id of GUIDE_IDS) {
    const html = await renderGuide(id);
    const at = html.indexOf('<div class="step-example step-example--long"');
    if (at < 0) continue;
    const block = html.slice(at, html.indexOf('</div>', html.indexOf('</details>', at)));
    assert.equal(
      [...block.matchAll(/<code>/gu)].length,
      1,
      `${id}: the copy button must reach the full text, not the preview`,
    );
    const preview = block.slice(
      block.indexOf('<pre class="example-preview"'),
      block.indexOf('</pre>', block.indexOf('<pre class="example-preview"')),
    );
    assert.match(preview, /…\s*$/u, `${id}: the preview is visibly truncated`);
    checked += 1;
  }
  assert.ok(checked > 0, 'at least one collapsed example was checked');
});
