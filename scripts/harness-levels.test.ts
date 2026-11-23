import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { SITE_FILE_LIST } from './site-file-list.ts';
import { pageOutputPaths } from './pages-route-manifest.ts';

const SOURCE = resolve('docs/pages/sdlc-development');
const page = await readFile(resolve(SOURCE, 'harness-levels.html'), 'utf8');

/** The only external sources the page may cite: each one was checked for the concept of TASK-621. */
const ALLOWED_EXTERNAL = [
  'https://www.anthropic.com/engineering/building-effective-agents',
  'https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/',
  'https://simonwillison.net/2026/Jan/28/the-five-levels/',
  'https://temporal.io',
  'https://github.com/omnigent-ai/omnigent',
];

await test('the harness levels page is published with its styles and diagram', () => {
  assert.ok((pageOutputPaths as readonly string[]).includes('harness-levels.html'));
  for (const file of ['harness-levels.html', 'harness-levels.css', 'harness-levels-bpmn.png'])
    assert.ok(SITE_FILE_LIST.includes(file), `${file} is a declared site file`);
});

await test('the page has the five sections of the concept, in order', () => {
  const ids = [...page.matchAll(/<section id="([^"]+)"/gu)].map((match) => match[1]);
  assert.deepEqual(ids, ['was-will-be', 'levels', 'dark-factory', 'benchmark', 'compare']);
  assert.match(page, /<h1>Ступени harness и Dark Factory<\/h1>/u);
  assert.equal((page.match(/<li><div><h3>\d\. /gu) ?? []).length, 7, 'seven PDLC stages');
});

await test('external links are only the checked sources of the concept', () => {
  const external = [...page.matchAll(/href="(https?:[^"]+)"/gu)].map((match) => match[1]);
  assert.deepEqual(
    [...new Set(external)].sort(),
    [...ALLOWED_EXTERNAL].sort(),
    'every external link is from the concept',
  );
});

await test('the benchmark section describes the method and carries no figures', () => {
  const section = page.match(/<section id="benchmark"[\s\S]*?<\/section>/u)?.[0] ?? '';
  assert.match(section, /время, стоимость и дефекты после ревью/u);
  assert.doesNotMatch(section.replace(/<[^>]+>/gu, ''), /\d/u, 'no numbers before a real run');
});

await test('the page keeps the owner analogies and names no private project or person', () => {
  assert.match(page, /Все умеют писать, но многие печатают/u);
  assert.match(page, /Вождение и автопилот/u);
  assert.doesNotMatch(page, /example-archi|Коллега-1|Коллега-2/iu);
});

await test('the page has a way in from the first preparation guide step, so it is not an orphan', async () => {
  const references = await readFile(
    resolve(SOURCE, 'guides/content/stage-0-step-process.ts'),
    'utf8',
  );
  assert.match(references, /'\.\.\/harness-levels\.html'/u);
});
