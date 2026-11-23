import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadGuides, renderGuide } from './learner-guide-test-support.ts';
import { steps as setup } from '../docs/pages/sdlc-development/guides/content/stage-4-team-step-setup.ts';
import { steps as repositories } from '../docs/pages/sdlc-development/guides/content/stage-4-team-step-repositories.ts';
import { steps as timeline } from '../docs/pages/sdlc-development/guides/content/stage-4-team-step-timeline.ts';
import { steps as legacySources } from '../docs/pages/sdlc-development/guides/content/stage-4-legacy-step-source-copy.ts';

await test('team CI selects both a change and its registered Store without prompting', () => {
  const actions = setup[0]!.actions.join('\n');
  assert.match(actions, /store register \. --yes/u);
  assert.match(
    actions,
    /npm exec --yes --package=@fission-ai\/openspec@1\.15\.0 -- openspec validate limit-credit-amount --strict --no-interactive --store sdd-credit-calculator-product-meta/u,
  );
  assert.match(actions, /--all/u);
  assert.doesNotMatch(actions, /<code>openspec validate --strict<\/code>/u);
  for (const action of setup[0]!.actions) {
    assert.ok((action.match(/<pre><code>/gu) ?? []).length <= 1);
  }
});

await test('architect can publish design from a personal branch in the requirements repository', async () => {
  const html = await renderGuide('4-team');
  assert.match(
    html,
    /<th scope="row">Архитектор<\/th><td>Developer: своя ветка с design\.md → MR в ветку изменения/u,
  );
  assert.doesNotMatch(html, /<th scope="row">Архитектор<\/th><td>Reporter/u);
  assert.match(html, /<th scope="row">Владелец продукта<\/th><td>Developer/u);
  const review = (await loadGuides())['2'].steps.flatMap((step) => step.actions).join('\n');
  assert.match(
    review,
    /Архитектор[\s\S]*ветку от ветки изменения[\s\S]*MR[\s\S]*в ветку изменения/u,
  );
});

await test('team layout and handoff separate meta context from Store and label the combined teaching kit', async () => {
  const layout = repositories[0]!;
  assert.match(layout.figure!.html, /product-meta\/ — контекст, ссылки, services\.lock\.yaml/u);
  assert.match(layout.figure!.html, /product-specs\/ — openspec\/specs\/ и changes\//u);
  assert.doesNotMatch(layout.figure!.html, /product-meta\/[^<]*openspec\//u);
  assert.match(layout.actions.join('\n'), /совмещённый Store-пример/u);
  const handoff = (await renderGuide('3-star')).split('id="implementation"')[1]!;
  assert.match(handoff, /stage-4-requirements[\s\S]*учебный Store-пример/u);
  assert.doesNotMatch(handoff, /Требования редактируются в product-meta/u);
  const deck = await readFile('docs/pages/sdlc-development/analytics-process-sdd.html', 'utf8');
  assert.match(deck, /отдельный product-specs \(OpenSpec Store\)/u);
  assert.match(deck, /Учебный Store-пример/u);
  assert.doesNotMatch(deck, /OpenSpec в product-meta/u);
});

await test('the team timeline has four MRs and keeps tasks in the requirements repository', () => {
  const step = timeline[0]!;
  assert.match(step.title, /три этапа, четыре запроса/u);
  assert.match(step.figure!.html, /Реализация · два MR/u);
  assert.match(step.figure!.html, /Код и тесты → main форка сервиса/u);
  assert.match(step.figure!.html, /tasks\.md → main форка требований/u);
  assert.match(step.actions.join('\n'), /После их слияния отдельный MR архива/u);
  assert.doesNotMatch(step.figure!.html, /Код, тесты, tasks\.md|Три запроса/u);
});

await test('archive stages new files and updates main after Merge before comparing named refs', async () => {
  const archiveActions = (await loadGuides()).delivery.steps[6]!.actions.join('\n');
  const commands = [...archiveActions.matchAll(/<pre><code>([^<]+)<\/code><\/pre>/gu)].map(
    ([, command]) => command,
  );
  assert.deepEqual(commands, [
    'git status --short',
    'git switch main',
    'git pull --ff-only origin main',
    'git switch -c course/&lt;LOGIN&gt;/archive-limit-credit-amount',
    'npm exec openspec -- archive add-reset-and-years-term --yes',
    'npm exec openspec -- archive add-payment-summary --yes',
    'npm exec openspec -- archive limit-credit-amount --yes',
    'npm exec openspec -- validate --all --strict --no-interactive',
    'git status --short --untracked-files=all',
    'git add -- openspec/specs openspec/changes',
    'git diff --cached -- openspec/specs openspec/changes',
    'git commit -m &quot;docs: archive implemented credit amount limits&quot;',
    'git push -u origin course/&lt;LOGIN&gt;/archive-limit-credit-amount',
    'git status --short',
    'git switch main',
    'git pull --ff-only origin main',
    'git rev-parse main refs/remotes/origin/main',
  ]);
  assert.match(
    archiveActions.replace(/<[^>]*>/gu, ''),
    /Обычный git diff новые untracked-файлы не показывает/u,
  );
  assert.match(archiveActions, /HEAD остаётся на ветке архива/u);
});

await test('legacy exports have durable paths for later model reads without replacing originals', () => {
  const actions = legacySources[0]!.actions.join('\n');
  for (const path of ['tz-2021.txt', 'confluence-page.txt', 'observed-2026.md']) {
    assert.ok(actions.includes(`docs/legacy/${path}`));
  }
  assert.match(actions, /UTF-8/u);
  assert.match(actions, /исходный Word оставьте без изменений/u);
  assert.match(actions, /постоянные источники для чтения/u);
  assert.match(actions, /первый коммит своей ветки/u);
});
