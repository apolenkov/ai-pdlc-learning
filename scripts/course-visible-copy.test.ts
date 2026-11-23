import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import { guideContent, readGuideSource } from './guide-content.ts';

const root = resolve(import.meta.dirname, '..');

const checkVisibleCourseText = (file: string, html: string, violations: string[]): void => {
  const content = html.replace(/<!--[^]*?-->|<(script|style)\b[^>]*>[^]*?<\/\1>/giu, '');
  const readerAttributes = [
    ...content.matchAll(/\b(?:content|alt|title|aria-label)\s*=\s*(["'])([^]*?)\1/giu),
  ]
    .map((match) => match[2])
    .join(' ');
  const visible = `${content.replace(/<[^>]+>/gu, ' ')} ${readerAttributes}`
    .replace(/&nbsp;/giu, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/giu, (_, code: string) =>
      String.fromCodePoint(
        code[0]?.toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code),
      ),
    );
  for (const match of visible.matchAll(
    /(?<![а-яё])ступен(?:ь|и|ей|ям|ями|ях|ью|ю)\s*(?:№\s*)?(?:[RС]\s*)?\d+(?:\s*[–—-]\s*(?:[RС]\s*)?\d+)?|блок(?:ом)?\s*0[аa]/giu,
  )) {
    violations.push(`${file}: ${match[0]}`);
  }
};

await test('visible course pages use titles instead of numbered block labels', async () => {
  const directory = resolve(root, 'docs/pages/sdlc-development');
  const files = [
    ...(await readdir(directory)).filter((file) => ['catalog.html', 'index.html'].includes(file)),
    ...(await readdir(resolve(directory, 'guides')))
      .filter((file) => file.endsWith('.html'))
      .map((file) => `guides/${file}`),
    'corporate-resources.html',
    'examples/credit-calculator.html',
    'guides/examples/credit-calculator-intents/README.md',
  ];
  // Files missing from this checkout are skipped.
  const present = (
    await Promise.all(
      files.map(async (file) =>
        (await stat(resolve(directory, file)).then(
          () => true,
          () => false,
        ))
          ? file
          : undefined,
      ),
    )
  ).filter((file): file is string => file !== undefined);
  const violations: string[] = [];
  for (const file of present)
    checkVisibleCourseText(file, await readFile(resolve(directory, file), 'utf8'), violations);
  // The HTML shells receive their instructional copy from both browser scripts.
  const source = await readGuideSource();
  for (const stage of Object.keys(guideContent.stages)) {
    const output: string[] = [];
    const element = () => ({
      setAttribute: () => undefined,
      addEventListener: () => undefined,
      querySelectorAll: () => [],
      insertAdjacentHTML: (_position: string, html: string) => output.push(html),
      set innerHTML(value: string) {
        output.push(value);
      },
      set textContent(value: string) {
        output.push(value);
      },
    });
    runInNewContext(
      source,
      {
        document: {
          body: { dataset: { stage }, append: () => undefined },
          createElement: element,
          getElementById: element,
          querySelector: element,
          querySelectorAll: () => [],
          title: '',
        },
        location: { hash: '' },
      },
      { timeout: 1000 },
    );
    checkVisibleCourseText(`rendered guide ${stage}`, output.join('\n'), violations);
  }
  assert.deepEqual(
    violations,
    [],
    'reader-facing copy, including descriptions, must use titles or R codes',
  );
});
