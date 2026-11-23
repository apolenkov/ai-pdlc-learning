import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import names from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import { renderGuide } from './learner-guide-test-support.ts';
import { readLearningEnhancementsCss } from './learning-enhancements-css.ts';

const pages = new Set(Object.values(names.guides).map(({ file }) => file));
const linkMark = (file: string) => `⟦${file}⟧`;
const stepIds = (html: string) =>
  new Set([...html.matchAll(/<[\w:-]+\b[^>]*?\sid="(step-\d+)"/gu)].map(([, id]) => id!));
const courseNumbers = new Set([
  ...names.route.map(({ number }) => number),
  ...names.branches.flatMap(({ number, branchOf }) => [branchOf, number]),
]);

/**
 * A step number must exist in this guide, or — when its sentence links another guide — in that
 * guide too; a link's own `#step-NN` must exist in the guide it opens. A guide link never switches
 * the check off for its sentence.
 */
function missingReferences(
  html: string,
  page: string,
  idsByFile: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
): string[] {
  const ids = stepIds(html);
  const missing: string[] = [];
  const prose = html
    .replace(/\s*\n\s*/gu, ' ')
    .replace(/<(pre|script|style)\b[^>]*>[\s\S]*?<\/\1>/giu, ' ')
    .replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/giu, (_, href: string) => {
      const target = href.split(/[?#]/u)[0]?.split('/').pop() || page;
      const anchor = /#(step-\d+)$/u.exec(href)?.[1];
      const targetIds = target === page ? ids : idsByFile.get(target);
      if (anchor && targetIds && !targetIds.has(anchor)) missing.push(`${href}: no ${anchor}`);
      return target !== page && pages.has(target) ? linkMark(target) : '';
    })
    .replace(
      /<\/?(?:h[1-6]|p|div|section|li|summary|td|th|figcaption|button|title|desc|text|br)\b[^>]*>/giu,
      '\n',
    )
    .replace(/<[^>]+>/gu, '')
    .replace(/&(?:nbsp|#160|#xa0);/giu, ' ');
  for (const sentence of prose.split(/[.!?](?=\s|$)|\n/u)) {
    const linked = [...sentence.matchAll(/⟦([^⟧]+)⟧/gu)].map(([, file]) => idsByFile.get(file!));
    const text = sentence.replace(/⟦[^⟧]+⟧/gu, '');
    for (const match of text.matchAll(
      /(?<!\p{L})шаг(?:ом|ам|ами|ах|ов|[аеуи])?\s+(\d+[аб]?)(?:\s*[-–—]\s*(\d+[аб]?))?(\s+курса(?!\p{L}))?/giu,
    )) {
      const first = match[1]!;
      const last = match[2] ?? first;
      const course =
        match[3] || /[аб]$/u.test(first) || /ветви\s+$/iu.test(text.slice(0, match.index));
      const step = (number: string) => `step-${number.padStart(2, '0')}`;
      const exists = (number: string) =>
        course
          ? courseNumbers.has(number)
          : ids.has(step(number)) || linked.some((other) => other?.has(step(number)));
      if (!exists(first) || !exists(last) || Number(last) < Number(first)) {
        missing.push(text.trim());
        continue;
      }
      for (let number = Number(first) + 1; number < Number(last); number++)
        if (!exists(String(number))) {
          missing.push(text.trim());
          break;
        }
    }
  }
  return [...new Set(missing)];
}

await test('references in every rendered guide name existing instruction steps', async () => {
  const missing = [];
  const rendered = new Map<string, string>();
  for (const [stage, { file }] of Object.entries(names.guides))
    rendered.set(file, await renderGuide(stage));
  const idsByFile = new Map([...rendered].map(([file, html]) => [file, stepIds(html)]));
  for (const [stage, { file }] of Object.entries(names.guides)) {
    // The VM renders the lesson body, but its document stub has no static page template.
    const shell =
      stage === 'metarepo'
        ? ''
        : await readFile(
            new URL(`../docs/pages/sdlc-development/guides/${file}`, import.meta.url),
            'utf8',
          );
    const supplement =
      shell.match(/<template id="guide-supplement">([\s\S]*?)<\/template>/u)?.[1] ?? '';
    for (const issue of missingReferences(rendered.get(file)! + supplement, file, idsByFile))
      missing.push(`${file} — ${issue}`);
  }
  assert.deepEqual(missing, []);
});

await test('the reference check catches holes, inflections, unknown steps beside a guide link and missing step anchors', () => {
  const html =
    '<section id="step-01"></section><section id="step-03"></section>' +
    '<p>После шагов&nbsp;1–3 перейдите дальше. Вернитесь к шагу\u00a07. См. <a href="p2-git.html#step-14">шаг 14</a>. Здесь шаг 8. ' +
    'Выполните шаг 99 и откройте <a href="p2-git.html">учебник Git</a>. Откройте <a href="p2-git.html#step-99">последний шаг</a>.</p>';
  const git = new Map([['p2-git.html', new Set(['step-01', 'step-14'])]]);
  assert.deepEqual(missingReferences(html, 's1-git.html', git), [
    'p2-git.html#step-99: no step-99',
    'После шагов 1–3 перейдите дальше',
    'Вернитесь к шагу\u00a07',
    'Здесь шаг 8',
    'Выполните шаг 99 и откройте учебник Git',
  ]);
});

await test('the instruction contents list has neither a height limit nor internal scrolling', async () => {
  const guide = await readFile(
    new URL('../docs/pages/sdlc-development/guides/guide.css', import.meta.url),
    'utf8',
  );
  const css = (guide + (await readLearningEnhancementsCss())).replace(/\/\*[\s\S]*?\*\//gu, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].filter(([, selectors]) =>
    /\.step-toc\s*(?:>\s*)?ol(?:\s|,|$)/u.test(selectors!),
  );
  assert.ok(rules.length);
  for (const [rule, , declarations] of rules) {
    for (const declaration of declarations!.split(';')) {
      const [property, value] = declaration.trim().split(/\s*:\s*/u);
      if (/^(?:max-)?(?:height|block-size)$/u.test(property ?? ''))
        assert.match(value ?? '', /^(?:none|auto)(?:\s*!important)?$/iu, rule);
      if (/^overflow(?:-[xy]|-block|-inline)?$/u.test(property ?? ''))
        assert.doesNotMatch(value ?? '', /(?:auto|scroll|hidden|clip)/iu, rule);
    }
  }
});

await test('the Git contents expose fourteen numbered links in reading order', async () => {
  const guide = await renderGuide('0a');
  const toc = guide.match(/<nav class="step-toc"[^>]*>(.*?)<\/nav>/su)?.[1];
  assert.ok(toc);
  assert.deepEqual(
    [...toc.matchAll(/href="#(step-\d+)"/gu)].map(([, id]) => id),
    Array.from({ length: 14 }, (_, index) => `step-${String(index + 1).padStart(2, '0')}`),
  );
});
