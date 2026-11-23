import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';

const PAGE = 'docs/pages/sdlc-development/guides/examples/legacy-calculator/confluence-page.html';

const readPage = (): Promise<string> => readFile(resolve(PAGE), 'utf8');

await test('the change history table scrolls inside its own labelled region instead of breaking words', async () => {
  const html = await readPage();
  assert.match(
    html,
    /<div class="table-scroll" role="region" aria-label="История изменений: прокрутка по горизонтали" tabindex="0">\s*<table>[\s\S]*?<\/table>\s*<\/div>/u,
  );
  assert.equal((html.match(/<table>/gu) ?? []).length, 1, 'the page has one table');
  assert.match(html, /\.table-scroll \{ overflow-x: auto; \}/u);
  assert.match(html, /<p class="table-hint">Таблицу можно прокрутить вправо\.<\/p>/u);
});

await test('version, date and author cells never wrap; the narrow rule keeps a minimum table width and shows the hint', async () => {
  const html = await readPage();
  assert.match(html, /th:nth-child\(-n\+3\), td:nth-child\(-n\+3\) \{ white-space: nowrap; \}/u);
  assert.match(html, /\.table-hint \{ display: none; \}/u);
  const narrow = [...html.matchAll(/@media \(max-width: 760px\) \{((?:[^{}]|\{[^{}]*\})*)\}/gu)];
  assert.equal(narrow.length, 1, 'exactly one narrow block');
  assert.match(narrow[0]![1]!, /\.table-scroll table \{ min-width: 480px; \}/u);
  assert.match(narrow[0]![1]!, /\.table-hint \{ display: block;/u);
  assert.doesNotMatch(html, /td\s*\{[^}]*overflow-wrap:\s*anywhere/u);
});
