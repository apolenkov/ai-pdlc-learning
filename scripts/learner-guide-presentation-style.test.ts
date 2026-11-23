import assert from 'node:assert/strict';
import test from 'node:test';
import { readGuideSource } from './guide-content.ts';
import { readLearningEnhancementsCss } from './learning-enhancements-css.ts';

await test('collapsed step blocks share one visible expand marker with keyboard focus', async () => {
  const css = await readLearningEnhancementsCss();
  for (const selector of [
    '.step-screenshots>summary::before',
    '.step-trouble>summary::before',
    '.step-platforms>summary::before',
    '.step-screenshots[open]>summary::before',
  ]) {
    assert.ok(css.includes(selector), `expand marker rule for ${selector} is missing`);
  }
  assert.match(css, /summary:focus-visible\{outline:3px/u);
  const source = await readGuideSource();
  assert.match(source, /terminal-copy/u, 'terminal command blocks get a copy button');
  assert.match(
    source,
    /closest\("\.step-example, \.terminal-copy"\)/u,
    'the copy handler serves both block kinds',
  );
});
