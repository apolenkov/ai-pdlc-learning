import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { guideContent } from './guide-content.ts';

const root = resolve(import.meta.dirname, '..');
const readSource = (path: string): Promise<string> => readFile(resolve(root, path), 'utf8');
const plain = (text: string): string => text.replaceAll('\u00a0', ' ');

await test('intent acceptance commits the final state before approval and keeps the approved file immutable (TASK-685 №12)', async () => {
  const acceptance = guideContent.stages.i4.steps[3]!;
  const actions = acceptance.actions.map(plain);
  const state = actions.findIndex((text) => text.includes('«Состояние: принят»'));
  const lint = actions.findIndex((text) => text.includes('Повторите проверку линтером'));
  const restore = actions.findIndex((text) =>
    text.includes('cd "&lt;абсолютный путь к рабочей копии аналитика&gt;"'),
  );
  const stage = actions.findIndex((text) =>
    text.includes('git add intents/clear-result/intent.md'),
  );
  assert.ok(state < lint && lint < restore && restore < stage);
  const commit = actions.findIndex((text) => text.includes('git commit -m'));
  const push = actions.findIndex((text) => text.includes('<code>git push</code>'));
  const revision = actions.findIndex((text) => text.includes('git rev-parse HEAD'));
  const approval = actions.findIndex((text) => text.includes('нажимает Approve'));
  assert.ok(
    state >= 0 && state < commit && commit < push && push < revision && revision < approval,
  );
  assert.match(plain(acceptance.why ?? ''), /До финального Approve[^]*не факт принятия/u);
  assert.match(actions[approval]!, /После финального одобрения intent\.md не меняют/u);
  assert.ok(actions.slice(approval + 1).every((text) => !/git (?:add|commit|push)/u.test(text)));
  const i2 = plain(guideContent.stages.i2.steps[3]!.why ?? '');
  assert.match(i2, /итоговый коммит перед финальным одобрением/u);
  const template = plain(
    await readSource('docs/pages/sdlc-development/guides/examples/intent-plan/intent-template.md'),
  );
  assert.match(template, /итоговый\s+коммит перед финальным Approve/u);
  assert.doesNotMatch(template, /после одобрения владельца продукта — «принят»/u);
});

await test('the intent workflow separates meaning ownership from MR authorship (TASK-685 P2)', () => {
  const publication = guideContent.stages.i4.steps[2]!;
  assert.match(plain(publication.why ?? ''), /Технический автор MR — другой человек, аналитик/u);
  assert.match(publication.actions.map(plain).join('\n'), /под своей учётной записью/u);
  assert.match(
    plain(guideContent.stages.i4.steps[3]!.actions.at(-1)!),
    /владелец продукта, не автор MR/u,
  );
  assert.match(
    plain(guideContent.stages.i4.steps[3]!.trouble),
    /Не ослабляйте запрет самоодобрения/u,
  );
});

await test('each intent action has at most one command, adjacent to its UI or terminal action (TASK-685 №15)', () => {
  for (const step of guideContent.stages.i4.steps) {
    for (const action of step.actions) {
      const blocks = [...action.matchAll(/<pre><code>([^]*?)<\/code><\/pre>/gu)];
      assert.ok(blocks.length <= 1, `one command per action: ${action}`);
      for (const block of blocks) {
        assert.ok(!block[1]!.includes('\n'), 'copyable command stays on one line');
        assert.match(action.slice(0, block.index), /В терминале:/u);
        if (block[1]!.startsWith('git ')) {
          assert.match(action.slice(0, action.indexOf('В терминале:')), /В (?:GitLab|VS Code):/u);
        }
      }
    }
  }
});

await test('handoff lives in the MR, while analysis is explicitly a standalone exercise (TASK-685 №14)', async () => {
  const handoff = guideContent.stages.i4.steps[4]!;
  const text = plain(JSON.stringify(handoff));
  assert.match(text, /комментарии к одобренному MR/u);
  assert.match(text, /самостоятельный пример/u);
  for (const field of [
    'Принял в анализ:',
    'Решение:',
    'Ревизия:',
    'Документ:',
    'Пункт плана: change-1',
  ]) {
    assert.ok(handoff.example?.content.includes(field), field);
  }
  assert.match(handoff.example!.content, /Ревизия: [a-f0-9]{40} /u);
  assert.match(text, /принятый файл остаётся без изменений/u);
  for (const file of [
    'docs/pages/sdlc-development/guides/intent.html',
    'docs/pages/sdlc-development/guides/content/stage-0-step-intent.ts',
  ]) {
    const source = plain((await readSource(file)).replaceAll('\\u00a0', ' '));
    assert.match(source, /самостоятельный учебный пример/u, file);
    assert.match(source, /не продолжение/u, file);
    assert.match(source, /change-N/u, file);
  }
});

await test('linter prerequisites explain who provides the clone and its working directory (TASK-685 P2)', () => {
  const text = plain(guideContent.prerequisites.i4.join('\n'));
  assert.match(text, /HTTPS-адрес[^]*выдаёт организатор/u);
  assert.match(text, /git clone "&lt;HTTPS-адрес от организатора&gt;" course-linter/u);
  assert.match(text, /cd course-linter\/standards\/sdlc-analysis-standard/u);
  assert.match(text, /абсолютный путь/u);
});
