import assert from 'node:assert/strict';
import test from 'node:test';
import { isGuideId } from '../docs/pages/sdlc-development/guides/renderer/common.ts';
import {
  directDisclosureElements,
  loadGuides,
  renderGuide,
  renderedStepHtml,
} from './learner-guide-test-support.ts';

/**
 * Owner defect (pack14): the first step of p2-git printed `<a href=…>` as text.
 * Links within results and onward links must render as HTML. Check the markup and
 * the visible text of both fields on every step.
 * Uppercase placeholders of code examples (`&lt;SHA`, `&lt;FORK`) are not tags.
 */
const lowerTag = /<\/?[a-z][a-z0-9-]*\b/u;
const escapedTag = /&lt;\/?[a-z][a-z0-9-]*\b/u;
const visibleText = (html: string): string =>
  html
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&amp;/gu, '&')
    .replace(/&nbsp;/gu, ' ')
    .replace(/\s+/gu, ' ');

await test('guide pages render markup in results and onward links instead of printing it', async () => {
  const guides = await loadGuides();
  const ids = Object.keys(guides).filter(isGuideId);
  assert.ok(ids.length >= 10, `expected the guide pages, found ${ids.length}`);
  const violations: string[] = [];
  for (const id of ids) {
    const html = await renderGuide(id);
    if (escapedTag.test(html)) violations.push(`${id}: escaped HTML tag markup is in the page`);
    const blocks = [...html.matchAll(/<p class="(?:step-result|step-nav)">([\s\S]*?)<\/p>/gu)];
    assert.equal(blocks.length, guides[id].steps.length * 2, id);
    for (const [index, match] of blocks.entries()) {
      const text = visibleText(match[1] ?? '');
      if (lowerTag.test(text))
        violations.push(`${id}: step ${index + 1} prints markup as text: ${text.slice(0, 120)}`);
    }
  }
  assert.deepEqual(violations, [], `markup is printed as text: ${violations.join('; ')}`);
});

await test('each step keeps one onward link and one help row, and shared Git notes follow the actions', async () => {
  const guides = await loadGuides();
  for (const id of Object.keys(guides).filter(isGuideId)) {
    const html = await renderGuide(id);
    assert.doesNotMatch(html, /class="step-self-check"|Где пригодится:<\/strong>|>Перейти →</u);
    for (const [index, item] of guides[id].steps.entries()) {
      const block = renderedStepHtml(html, index + 1)!;
      const last = index === guides[id].steps.length - 1;
      const label = last ? `Дальше: ${item.nextUse.label}` : 'Следующий шаг →';
      assert.ok(block.includes(`href="${item.nextUse.href}">${label}</a>`), `${id} ${index + 1}`);
      assert.equal(block.match(/class="step-tail"/gu)?.length, 1);
      const tail = block.slice(
        block.indexOf('<div class="step-tail">'),
        block.indexOf('<p class="step-nav">'),
      );
      assert.ok(tail.includes('class="step-trouble"'));
      if (block.includes('step-level--novice'))
        assert.ok(
          !tail.includes('step-level--novice') &&
            block.indexOf('step-level--novice') < block.indexOf('class="step-instructions'),
        );
      if (item.gitNote) {
        assert.equal(block.split(item.gitNote).length, 2);
        assert.ok(block.indexOf(item.gitNote) > block.indexOf(item.actions.at(-1)!));
      }
    }
  }
});

await test('review and handoff steps keep one Git note outside the list and link repeated commands to the save step', async () => {
  for (const [id, numbers] of [
    ['2', [6, 7]],
    ['i4', [3, 4, 5]],
  ] as const) {
    const page = await renderGuide(id);
    for (const number of numbers) {
      const block = renderedStepHtml(page, number)!;
      const actions = block.match(/<ol class="step-actions">([\s\S]*?)<\/ol>/u);
      assert.ok(actions, `${id} step ${number}: missing action list`);
      assert.doesNotMatch(
        visibleText(actions[1]!),
        /не требует Git|команда Git[^.!?]*не нужна|нет команды Git/iu,
      );
      const notes = [...block.matchAll(/<p class="step-git-note">([^<]*)<\/p>/gu)];
      assert.equal(notes.length, 1, `${id} step ${number}: expected one shared note`);
      assert.match(notes[0]![1]!, /команда Git не нужна/u);
      assert.ok(notes[0]!.index >= actions.index! + actions[0].length);
      if (id === '2') assert.match(actions[1]!, /Commit[^<]*<a href="#step-05">/u);
    }
  }
});

await test('the specification and design disclosure appears once, in the standard step help row', async () => {
  const block = renderedStepHtml(await renderGuide('sdd'), 3)!;
  const summary = '<h4>Где граница между спецификацией аналитика и design.md</h4>';
  assert.equal(block.split(summary).length - 1, 1);
  const row = /<div class="step-tail">([\s\S]*?)<\/div><p class="step-nav">/u.exec(block);
  assert.ok(row);
  const content = row[1]!.trim().replace(/>\s+</gu, '><');
  const children = directDisclosureElements(content).map(({ html }) => html);
  assert.equal(
    children.join(''),
    content,
    'the help row contains sibling details without wrappers',
  );
  assert.deepEqual(
    children.map((html) => html.match(/^<details class="([^"]+)"/u)![1]),
    ['step-trouble', 'step-additional'],
  );
  assert.ok(children[1]!.includes(`<section class="beginner-extra">${summary}`));
});

await test('the exercises ask the learner to label the numbers and identify who owns the review delay', async () => {
  const guides = await loadGuides();
  const exercise = guides.i1.steps[2]!.actions.find((action) => action.includes('срок в годах'));
  assert.match(
    exercise ?? '',
    /числ[^.]+срок проверки[^.]+границу[^.]*\. [^.]*числа[^.]+учебные/iu,
  );
  assert.match(
    guides.sdd.steps[5]!.actions.join(' '),
    /больше изменений[^?]+задержаться проверка\?[^?]+отвечает/iu,
  );
});

await test('the March risk includes a partial improvement and points to the counting method', async () => {
  const risks = renderedStepHtml(await renderGuide('i3'), 3)!;
  const row = /<tr><td>(К марту[^<]+)<\/td><td>(.*?)<\/td><\/tr>/u.exec(risks);
  assert.ok(row);
  assert.match(row[1]!, /выше 25 в неделю/u);
  const fallback = visibleText(row[2]!);
  for (const detail of [
    'Признаки успеха',
    'способ подсчета',
    'журнал обращений поддержки',
    '42 в неделю',
    '25',
    'вымышлены',
  ])
    assert.ok(fallback.includes(detail), detail);
});
