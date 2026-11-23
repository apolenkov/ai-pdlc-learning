import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintIntent } from '../tools/intent-lint.ts';

const standardRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = resolve(standardRoot, '../..');
const examplesRoot = join(repositoryRoot, 'docs/pages/sdlc-development/guides/examples');
const read = (file: string): Promise<string> => readFile(file, 'utf8');
const ruleOf =
  (rule: string) =>
  (violation: { rule: string }): boolean =>
    violation.rule === rule;

const oldIntent = join(
  examplesRoot,
  'credit-calculator-intents/intents/clear-calculation-result.md',
);
const oldIntentLimit = join(examplesRoot, 'credit-calculator-intents/intent-2-credit-limit.md');
const strongIntent = join(examplesRoot, 'intent-plan/strong-intent.md');
const weakIntent = join(examplesRoot, 'intent-plan/weak-intent.md');
const weakCompleteIntent = join(examplesRoot, 'intent-plan/weak-complete-intent.md');
const stageTemplate = join(standardRoot, 'templates/intent.md');

await test('analysis-course intents pass the analysis mode without edits', async () => {
  for (const file of [oldIntent, oldIntentLimit]) {
    assert.deepEqual(lintIntent(await read(file), 'analysis'), [], file);
  }
});

await test('strong intent passes the stage1 mode', async () => {
  assert.deepEqual(lintIntent(await read(strongIntent), 'stage1'), []);
});

await test('weak intent fails the stage1 mode', async () => {
  assert.ok(lintIntent(await read(weakIntent), 'stage1').length > 0);
});

await test('structurally complete but weak intent passes stage1: meaning is out of scope', async () => {
  // Граница линтера: структура ≠ смысл; смысл проверяет рецензент.
  // weak-complete-intent.md заполнен целиком, но описывает решение вместо
  // проблемы, поэтому проходит проверку структуры и возвращается рецензентом.
  assert.deepEqual(lintIntent(await read(weakCompleteIntent), 'stage1'), []);
});

await test('analysis-course intent fails the stage1 mode: no plan and no measurement', async () => {
  for (const file of [oldIntent, oldIntentLimit]) {
    assert.ok(lintIntent(await read(file), 'stage1').length > 0, file);
  }
});

await test('stage1 template fails the stage1 mode: placeholders are expected', async () => {
  const violations = lintIntent(await read(stageTemplate), 'stage1');
  assert.ok(violations.length > 0);
  assert.ok(violations.some(ruleOf('placeholder')));
});

await test('duplicate change-1 is a violation', async () => {
  const markdown = (await read(strongIntent)).replace('change-2', 'change-1');
  assert.ok(lintIntent(markdown, 'stage1').some(ruleOf('duplicate-change-id')));
});

await test('empty plan cell is a violation', async () => {
  const markdown = (await read(strongIntent)).replace('| Нет |', '|  |');
  assert.ok(lintIntent(markdown, 'stage1').some(ruleOf('empty-plan-cell')));
});

await test('«не определено» without a reason is a violation', async () => {
  const markdown = (await read(weakCompleteIntent)).replace(
    'До: не определено — замеров нет',
    'До: не определено',
  );
  assert.ok(lintIntent(markdown, 'stage1').some(ruleOf('undefined-without-reason')));
});

await test('intent-lint CLI exits 1 on violations and 0 on a clean file', () => {
  const run = (file: string): number =>
    spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        join(standardRoot, 'tools/intent-lint.ts'),
        file,
        '--mode',
        'stage1',
      ],
      { cwd: standardRoot, encoding: 'utf8' },
    ).status ?? -1;
  assert.equal(run(strongIntent), 0);
  assert.equal(run(weakIntent), 1);
});
