import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { renderExamplePage } from './example-pages.ts';

await test('only intent-plan tables get a keyboard-accessible scroll region named for their section', () => {
  const markdown =
    '# Пример\n\n## План изменений\n\n| ID | Роль |\n|---|---|\n| change-1 | Команда |';
  const plan = renderExamplePage(markdown, 'examples/intent-plan/intent-template.md', '../../');
  assert.match(
    plan,
    /<h2>План изменений<\/h2>\s*<div class="intent-plan-table-scroll" role="region" aria-label="План изменений: прокрутка по горизонтали" tabindex="0">\s*<table>[\s\S]*?<\/table>\s*<\/div>/u,
  );
  const other = renderExamplePage(
    markdown,
    'examples/credit-calculator-intents/intent-template.md',
    '../../',
  );
  assert.match(other, /<h2>План изменений<\/h2>\s*<table>/u);
});

// TASK-904 (B18, B19): an example page reads as one column under a title that does not wrap at 24ch.
await test('example pages keep one reading column and a full-width title', async () => {
  const css = await readFile('docs/pages/sdlc-development/guides/metarepository.css', 'utf8');
  const html = renderExamplePage('# Заголовок\n\n- пункт\n', 'a.md', '../../');
  assert.match(
    html,
    /<article class="meta-content meta-content--example">/u,
    'an example article has both layout classes and no guide id',
  );
  assert.match(
    css,
    /\.meta-content:not\(#metarepository-guide\) \.meta-title>h1 \{[^}]*max-width: none;/u,
    'the example title is not held to 24ch',
  );
  assert.match(
    css,
    /\.meta-content:not\(#metarepository-guide\) > :not\(\.meta-title, table, \.intent-plan-table-scroll, pre, figure, details\) \{ max-width: 78ch; \}/u,
    'lists, quotes and headings share the 78ch measure of paragraphs; tables, code and diagrams stay wide',
  );
});

await test('TASK-904 B22/B23 table and checklist adjustments are limited to example pages', async () => {
  const css = await readFile('docs/pages/sdlc-development/guides/metarepository.css', 'utf8');
  assert.match(
    css,
    /\.meta-content:not\(#metarepository-guide\) table \{ table-layout: auto; \}/u,
    'example tables size columns to their contents without changing the metarepository guide',
  );
  assert.match(
    css,
    /\.meta-content:not\(#metarepository-guide\) ul:has\(> li > label > input\[type="checkbox"\]\) \{ padding-left: 0; list-style: none; \}/u,
    'only example checklist lists hide the duplicate list marker',
  );
  assert.match(
    css,
    /\.meta-content:not\(#metarepository-guide\) li > label > input\[type="checkbox"\] \{[^}]*appearance: none;[^}]*border: 2px solid var\(--customdev-green\);[^}]*opacity: 1;/u,
    'example checklist controls keep their green accent and full opacity',
  );
});
