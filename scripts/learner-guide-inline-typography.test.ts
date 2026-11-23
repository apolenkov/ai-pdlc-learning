import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { pluralRu } from '../docs/pages/sdlc-development/guides/renderer/common.ts';
import { truncateContext } from '../docs/pages/sdlc-development/guides/renderer/copy-buttons.ts';
import {
  keepFlagsTogether,
  splitFlags,
} from '../docs/pages/sdlc-development/guides/renderer/inline-code.ts';
import { GUIDE_IDS, renderGuide } from './learner-guide-test-support.ts';

const lines = (count: number): string => `${count} ${pluralRu(count, 'строка', 'строки', 'строк')}`;

await test('a count picks the Russian noun form: 1, 2–4, 5–20, 21, 22–24, 11–14', () => {
  assert.equal(lines(1), '1 строка');
  assert.equal(lines(2), '2 строки');
  assert.equal(lines(4), '4 строки');
  assert.equal(lines(5), '5 строк');
  assert.equal(lines(11), '11 строк');
  assert.equal(lines(12), '12 строк');
  assert.equal(lines(14), '14 строк');
  assert.equal(lines(20), '20 строк');
  assert.equal(lines(21), '21 строка');
  assert.equal(lines(22), '22 строки');
  assert.equal(lines(42), '42 строки');
  assert.equal(lines(111), '111 строк');
  assert.equal(lines(0), '0 строк');
});

await test('«Показать полностью» carries the right noun form for every long example', async () => {
  let seen = 0;
  for (const id of GUIDE_IDS) {
    const html = await renderGuide(id);
    for (const match of html.matchAll(/Показать полностью · (\d+) ([а-я]+)</gu)) {
      seen += 1;
      assert.equal(
        match[2],
        pluralRu(Number(match[1]), 'строка', 'строки', 'строк'),
        `${id}: ${match[0]}`,
      );
    }
  }
  assert.ok(seen > 0, 'at least one long example renders the label');
});

await test('a command flag is one part, so it cannot wrap between its dashes', () => {
  assert.deepEqual(splitFlags('openspec init --tools none'), [
    'openspec init ',
    '--tools',
    ' none',
  ]);
  assert.deepEqual(splitFlags('git commit --no-verify -m x'), [
    'git commit ',
    '--no-verify',
    ' -m x',
  ]);
  assert.deepEqual(splitFlags('add-reset-and-years-term'), ['add-reset-and-years-term']);
  assert.deepEqual(splitFlags('a--b'), ['a--b']);
  assert.deepEqual(splitFlags('git add -- file'), ['git add ', '--', ' file']);
  assert.deepEqual(splitFlags('x ---y'), ['x ---y']);
  assert.deepEqual(splitFlags('--change x --description y'), [
    '',
    '--change',
    ' x ',
    '--description',
    ' y',
  ]);
});

await test('a terminal caption is cut at a word boundary, never inside a name or a flag', () => {
  assert.equal(truncateContext('git status'), 'git status');
  assert.equal(
    truncateContext('openspec new change add-reset-and-years-term --description "x"'),
    'openspec new change add-reset-and-years-term…',
  );
  assert.equal(truncateContext('x'.repeat(60)), `${'x'.repeat(41)}…`);
});

await test('the preparation card is marked, so its two paragraphs get spacing', async () => {
  for (const id of GUIDE_IDS) {
    const html = await renderGuide(id);
    assert.match(html, /<section class="card card--prep[^"]*"[^>]*><h2>Перед началом<\/h2>/u, id);
  }
});

/** A host element that answers every selector the guide script asks main for, and records what the enhancers do to it. */
const enhancedHost = () => {
  const replaced: string[] = [];
  const classes: string[] = [];
  const flagText = {
    nodeType: 3,
    nodeValue: 'openspec init --tools none',
    replaceWith: () => replaced.push('flag'),
  };
  const colonText = { nodeType: 3, nodeValue: ': команда создаёт структуру' };
  const host = {
    childNodes: [flagText],
    nextSibling: colonText,
    closest: () => null,
    querySelectorAll: () => [],
    classList: { add: (name: string) => classes.push(name) },
    dataset: {},
    hasAttribute: () => false,
    getAttribute: () => null,
    setAttribute: () => undefined,
    addEventListener: () => undefined,
  };
  return { host, replaced, classes } satisfies { host: unknown } & Record<string, unknown>;
};

await test('the guide script runs both inline-code enhancers on the rendered body', async () => {
  const { host, replaced, classes } = enhancedHost();
  await renderGuide('3', undefined, { containers: [host], classes: {} });
  assert.ok(replaced.length > 0, 'keepFlagsTogether is called: the --flag text node is replaced');
  assert.ok(
    classes.includes('code--tight'),
    'tightenCodePunctuation is called: the chip is marked',
  );
});

const ENHANCEMENTS =
  'docs/pages/sdlc-development/guides/learning-enhancements/08-course-map-and-rhythm.css';

/** Body of the first `@media` block whose query matches `query`. */
const mediaBlock = (css: string, query: RegExp): string => {
  for (const match of css.matchAll(/@media\s*(\([^{]+?)\s*\{/gu)) {
    if (!query.test(match[1]!)) continue;
    let depth = 1;
    let index = match.index + match[0].length;
    const start = index;
    while (index < css.length && depth > 0) {
      if (css[index] === '{') depth += 1;
      else if (css[index] === '}') depth -= 1;
      index += 1;
    }
    return css.slice(start, index - 1);
  }
  throw new Error(`no @media block for ${query}`);
};

/** Selector and body of the first rule matching `selector` inside a media block. */
const rule = (block: string, selector: RegExp): { selector: string; body: string } => {
  const match = selector.exec(block);
  assert.ok(match, `no rule ${selector} in the media block`);
  const open = block.indexOf('{', match.index);
  const close = block.indexOf('}', open);
  return { selector: block.slice(match.index, open).trim(), body: block.slice(open + 1, close) };
};

await test('the scheme hint scrolls with each scrolling viewport on phones and tablets', async () => {
  const css = await readFile(ENHANCEMENTS, 'utf8');
  const scheme = 'content: "Схема шире экрана — прокрутите её вправо"';
  const phone = rule(
    mediaBlock(css, /max-width:\s*719px/u),
    /\.course-figure__viewport[^{]*::before/u,
  );
  assert.match(phone.body, new RegExp(scheme, 'u'));
  assert.match(phone.body, /position:\s*sticky/u);
  assert.match(
    phone.selector,
    /:not\(:has\(> table\)\)/u,
    'a viewport around a table gets no scheme label: the table carries its own',
  );
  assert.match(
    phone.selector,
    /\.layout-shift__narrow/u,
    'the narrow-layout scheme fits the phone, so it is never called wider than the screen',
  );
  assert.match(
    mediaBlock(css, /min-width:\s*720px.*max-width:\s*1040px/u),
    /\.course-figure__viewport[^{]*::before\s*\{[^}]*"Схема шире экрана — прокрутите её вправо"/u,
    'the tablet range keeps the scheme hint: the column is still narrower than the scheme',
  );
  assert.equal(
    (css.match(/\.course-figure__viewport[^{]*::before/gu) ?? []).length,
    2,
    'exactly two scheme-hint ranges: the phone one and the tablet one',
  );
  assert.doesNotMatch(
    css,
    /\.course-figure:has\(\.course-figure__viewport\)::before/u,
    'the figure-level hint falls into the tail of a stepper grid',
  );
});

await test('a wide table gets its own hint on the scrolling table, not on the viewport', async () => {
  const css = await readFile(ENHANCEMENTS, 'utf8');
  const table = rule(
    mediaBlock(css, /max-width:\s*554px/u),
    /\.course-figure__table[^{]*::before/u,
  );
  assert.match(table.body, /content:\s*"Таблица шире экрана — прокрутите её вправо"/u);
  assert.match(table.body, /position:\s*sticky/u);
  assert.doesNotMatch(table.selector, /viewport/u, 'the hint lives on the scrolling table itself');
  assert.equal(
    (css.match(/\.course-figure__table[^{]*::before/gu) ?? []).length,
    1,
    'one table-hint rule: a table never shows two labels',
  );
});

await test('the inline-code and preparation rules ship with the stylesheet', async () => {
  const css = await readFile(ENHANCEMENTS, 'utf8');
  assert.match(css, /\.nobr-flag\s*\{\s*white-space:\s*nowrap/u);
  assert.match(css, /code\.code--tight\s*\{\s*padding-right:/u);
  assert.match(css, /\.card--prep > p \+ p\s*\{\s*margin-top:/u);
});

await test('the long-example label keeps its number and noun together', async () => {
  const html = await renderGuide('2');
  assert.match(html, /Показать полностью · \d+ [а-я]+</u);
  const source = await readFile('docs/pages/sdlc-development/guides/renderer/examples.ts', 'utf8');
  assert.match(source, /· \$\{lines\.length\}\\u00a0\$\{pluralRu\(/u);
});

await test('a wrapped step-toc link keeps its number on the first line', async () => {
  const css = await readFile(
    'docs/pages/sdlc-development/guides/learning-enhancements/05-route-navigation-and-gitlab-panels.css',
    'utf8',
  );
  assert.match(
    css,
    /\.step-toc a\{display:block;/u,
    'an inline-block link puts the marker on its last line',
  );
});

/** The enhancer only calls querySelectorAll on its root, so a stub with that method stands in for a ParentNode. */
const isDomRoot = (value: { querySelectorAll: unknown }): value is ParentNode =>
  typeof value.querySelectorAll === 'function';

/** A host element: matches a selector by tag, reports an svg ancestor through closest, records what replaces its text node. */
const flagHost = (tag: string, insideSvg: boolean) => {
  const wrapped: string[] = [];
  const text = {
    nodeType: 3,
    nodeValue: 'openspec init --tools none',
    replaceWith: (fragment: { parts: unknown[] }) => {
      wrapped.push(...fragment.parts.map((part) => JSON.stringify(part)));
    },
  };
  return {
    tag,
    wrapped,
    childNodes: [text],
    closest: (selector: string) => (insideSvg && selector.includes('svg') ? {} : null),
  };
};

await test('a flag is wrapped in a figcaption but never inside an svg', () => {
  const caption = flagHost('figcaption', false);
  const svgText = flagHost('text', true);
  const hosts = [caption, svgText];
  // The root answers like the DOM: «*» matches every host, a narrower selector only the tags it names.
  const root = {
    querySelectorAll: (selector: string) =>
      hosts.filter((host) => selector === '*' || selector.split(/\s*,\s*/u).includes(host.tag)),
  };
  const previous = Reflect.get(globalThis, 'document');
  Reflect.set(globalThis, 'document', {
    createDocumentFragment: () => {
      const parts: unknown[] = [];
      return { parts, append: (part: unknown) => parts.push(part) };
    },
    createElement: () => ({ className: '', textContent: '' }),
  });
  try {
    assert.ok(isDomRoot(root));
    keepFlagsTogether(root);
  } finally {
    Reflect.set(globalThis, 'document', previous);
  }
  assert.ok(caption.wrapped.length > 0, 'the figcaption text gets the nowrap flag span');
  assert.ok(
    caption.wrapped.some((part) => part.includes('nobr-flag') && part.includes('--tools')),
    'the span carries the flag text',
  );
  assert.equal(
    svgText.wrapped.length,
    0,
    'svg text must stay a plain text node: a span would drop the flag from the scheme',
  );
});
