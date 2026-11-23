import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(
  new URL(
    '../docs/pages/sdlc-development/guides/learning-enhancements/09-step-layout.css',
    import.meta.url,
  ),
  'utf8',
);

await test('a long step example title wraps instead of being cut off', () => {
  const rule = /\.step-example>\.example-toolbar>:first-child\{([^}]*)\}/u.exec(css)?.[1];
  assert.ok(rule, 'the step example title rule is present');
  assert.match(rule, /overflow-wrap:anywhere/u);
  assert.doesNotMatch(rule, /white-space:nowrap|text-overflow:ellipsis|overflow:hidden/u);
});
