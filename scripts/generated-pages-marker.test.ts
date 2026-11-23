import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const GENERATED_MARKER =
  '<!-- GENERATED in customdev (canonical sources + npm run learning:export). Do not edit by hand. -->';
const generatedPages = ['roles', 'glossary', 'analysis-maturity-map', 'intent-maturity-map'];

await test('generated pages keep the marker: they are edited in customdev and copied here, never by hand', async () => {
  for (const name of generatedPages) {
    const html = await readFile(resolve('docs/pages/sdlc-development', `${name}.html`), 'utf8');
    assert.ok(
      html.replace(/^<!doctype html>\s*/iu, '').startsWith(GENERATED_MARKER),
      `${name}.html: the marker must follow the doctype; re-copy the page from customdev`,
    );
  }
});

await test('the course source tree omits the retired environment pages, data and stylesheet', async () => {
  for (const name of [
    'environment-scales.html',
    'environment-contours.html',
    'environment-data.json',
    'environment.css',
  ])
    await assert.rejects(
      access(resolve('docs/pages/sdlc-development', name)),
      { code: 'ENOENT' },
      name,
    );
});
