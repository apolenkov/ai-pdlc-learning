import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

await test('outcome cards stack below the text on tablets and preserve whole words', async () => {
  const css = await readFile('docs/pages/sdlc-development/guides/guide.css', 'utf8');
  const tablet = css.split('@media (max-width: 1000px) {')[1]?.split('@media')[0] ?? '';
  assert.match(tablet, /\.route-outcome\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/u);
  for (const selector of ['li', 'strong', 'li span']) {
    const rule = css.split(`.route-outcome ${selector} {`)[1]?.split('}')[0] ?? '';
    assert.match(rule, /overflow-wrap:\s*normal/u, `${selector} preserves whole words`);
    assert.doesNotMatch(rule, /(?:anywhere|break-all|break-word)/u);
  }
  const card = css.split('.route-outcome li {')[1]?.split('}')[0] ?? '';
  assert.match(card, /word-break:\s*normal/u);
  assert.match(card, /hyphens:\s*manual/u);
});
