import assert from 'node:assert/strict';
import { pairViolations } from './course-rules-test-support.ts';
import { examples, collapsedAction } from './learner-guide-contract-common.ts';
import type { LearnerGuides, LearnerGuide } from './learner-guide-types.ts';

const assertStageFourBranch = (
  fourth: LearnerGuide,
  fourthText: string,
  fourthEntryActions: string,
): void => {
  const fourthBranch = fourth.steps.find((step) =>
    step.title.startsWith('Создайте ветку для требований'),
  );
  assert.ok(fourthBranch, 'step 5 branch step is missing');
  const [creation, verification, continuation] = fourthBranch.actions;
  assert.match(
    creation ?? '',
    /В VS Code:[\s\S]*Create new branch[\s\S]*В терминале:<pre><code>git switch -c course\/&lt;LOGIN&gt;\/stage-4-amount-limits<\/code><\/pre>[\s\S]*переключении на новую ветку/u,
    'step 5 must pair branch creation with its command and expected result in the same action',
  );
  assert.match(
    creation ?? '',
    /после успешного отчёта[\s\S]*VS Code или терминал[\s\S]*Замените/u,
    'step 5 must retain the preparation gate, alternative routes and login substitution',
  );
  assert.match(
    verification ?? '',
    /В VS Code:[\s\S]*Source Control[\s\S]*В терминале:<pre><code>git status --short --branch<\/code><\/pre>[\s\S]*## course\/&lt;LOGIN&gt;\/stage-4-amount-limits[\s\S]*без строк файлов[\s\S]*организатору/u,
    'step 5 must pair the clean branch check with exact output and a recovery contact',
  );
  assert.match(
    `${continuation ?? ''} ${fourthBranch.gitNote ?? ''}`,
    /В VS Code:[\s\S]*той же папки требований[\s\S]*Для продолжения диалога в Kilo команда Git не нужна/u,
    'step 5 must resume the same session without inventing a Git command',
  );
  assert.deepEqual(pairViolations({ steps: [fourthBranch] }), []);
  for (const action of fourthBranch.actions) {
    const commands = [...action.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/gu)];
    assert.ok(commands.length <= 1, 'step 5 branch actions must contain at most one command');
    for (const [, command] of commands)
      assert.doesNotMatch(command!.replaceAll(/&(?:lt|gt);/gu, ''), /\n|;|&&/u);
  }
  assert.doesNotMatch(
    fourthBranch.advanced ?? '',
    /git switch|git status/u,
    'step 5 must not repeat the completed branch actions in a separate terminal route',
  );
  assert.doesNotMatch(
    examples(fourthBranch),
    /git switch|git status --short --branch/u,
    'step 5 analyst branch commands must not render as a visible terminal example',
  );
  for (const change of ['add-reset-and-years-term', 'add-payment-summary']) {
    assert.ok(fourthText.includes(change), `step 5 must preserve active ${change}`);
  }
  assert.match(
    fourthText,
    /IMPORT_BASE_BRANCH/u,
    'step 5 MR must retain the organizer-issued base',
  );
  assert.match(
    fourthText,
    /services\.lock\.yaml/u,
    'step 5 must distinguish the pinned service context',
  );
  assert.match(
    fourthText,
    /пустом наборе основных спецификаций/iu,
    'step 5 must accept empty main specs',
  );
  const commandStream = [fourthEntryActions, ...fourth.steps.map(examples)].join('\n');
  const positions = [/скопируйте свой форк/iu, /setup-analysis-workspace/u].map((pattern) =>
    commandStream.search(pattern),
  );
  assert.ok(
    positions.every((index) => index >= 0),
    'step 5 needs the fork clone route and the project setup skill',
  );
  assert.ok(
    positions.every((index, i) => i === 0 || index > positions[i - 1]!),
    'step 5 order must be clone → project setup skill',
  );
};

const assertStageFourScenarios = (
  guides: LearnerGuides,
  fourth: LearnerGuide,
  fourthText: string,
): void => {
  for (const title of [
    'Откройте задачу шага 5',
    'Обсудите требование с моделью вопросами',
    'Создайте изменение лимита суммы',
  ]) {
    const step = fourth.steps.find((candidate) => candidate.title.startsWith(title));
    assert.ok(step, `step 5: missing ${title}`);
    assert.match(
      examples(step),
      /10 000(?: до |\.\.|–)100 000 000 ₽ включительно/u,
      'step 5 must retain the agreed inclusive amount bounds in task, grill and proposal',
    );
  }
  assert.match(
    fourthText,
    /неизменённ(?:ые|ых)\s*\+\s*заменённ(?:ые|ых)\s*\+\s*нов(?:ые|ых)\s+сценар/iu,
    'step 5 must explain the effective unchanged/replaced/new scenario inventory',
  );
  assert.match(
    fourthText,
    /незавершённы[ех] задач[аи]?[^.]{0,100}(?:во всех|каждого|active Changes)/iu,
    'step 5 must explain that unfinished tasks are counted from each effective Change',
  );
  assert.doesNotMatch(
    fourthText,
    /\d+\s+неизмен[а-яё]+[\s\S]{0,80}\+\s*\d+\s+замен[а-яё]+[\s\S]{0,80}\+\s*\d+\s+нов[а-яё]+[\s\S]{0,80}=\s*\d+\s+сценар/iu,
    'step 5 must not require a fixed scenario quota',
  );
  assert.match(
    fourthText,
    /повтор[ёе]нн(?:ые|ых)\s+MODIFIED-блоки/iu,
    'step 5 must avoid duplicate counting via repeated MODIFIED blocks',
  );
  const fourthChecklist = guides['3-star'].check.join(' ');
  assert.match(
    fourthChecklist,
    /(?:\.workspace.*read-?only|\.workspace.*только для чтения)/iu,
    'step 5 handoff must preserve .workspace read-only',
  );
  assert.match(
    fourthText,
    /IMPORT_BASE_BRANCH/iu,
    'step 5 must preserve the organizer-issued base branch anchor',
  );
  assert.match(
    fourthText,
    /course\/<LOGIN>\/stage-4-amount-limits/iu,
    'step 5 must preserve planning MR branch anchor',
  );
};

const assertStageFourSave = (fourth: LearnerGuide, fourthText: string): void => {
  const fourthSave = fourth.steps.find((step) => step.title.startsWith('Сохраните запрос'));
  assert.ok(fourthSave, 'step 5 save step is missing');
  const fourthSaveVisible = fourthSave.actions
    .filter((action) => !collapsedAction(action))
    .join('\n');
  assert.match(
    fourthSaveVisible,
    /Source Control[\s\S]*openspec\/changes\/limit-credit-amount[\s\S]*docs\/course\/requirements-traceability\.md/u,
    'step 5 visible route must limit staging to the two planning paths',
  );
  assert.match(
    fourthSaveVisible,
    /origin[\s\S]*Поля запроса на слияние/u,
    'step 5 visible route must retain the personal fork and exact MR pair',
  );
  assert.match(
    fourthSaveVisible,
    /IMPORT_BASE_BRANCH[\s\S]{0,80}не main/iu,
    'step 5 visible route must name the issued MR base and forbid main',
  );
  assert.match(
    fourthSaveVisible,
    /принудительную отправку[^.]{0,80}останов/iu,
    'step 5 visible route must stop instead of accepting a force push',
  );
  assert.match(
    fourthSaveVisible,
    /одного Reviewer[\s\S]*владельца продукта[\s\S]*список обязательных комментариев:[\s\S]*аналитик[\s\S]*техлид[\s\S]*архитектор[\s\S]*@-упоминаниями/u,
    'step 5 requires one assigned Reviewer and distinct analyst, techlead and architect comment roles',
  );
  assert.match(
    fourthSaveVisible,
    /после Push[\s\S]*Re-request review[\s\S]*единственного назначенного Reviewer[\s\S]*снова[\s\S]*@-упоминаниями[\s\S]*обязательный комментарий[\s\S]*одобряет актуальную версию заново/iu,
    'step 5 reviewers must check the current MR head again after changes',
  );
  assert.match(
    fourthSaveVisible,
    /проверка моделью не считается одобрением человека/iu,
    'step 5 AI review must not count as human approval',
  );
  assert.deepEqual(pairViolations({ steps: [fourthSave] }), [], 'step 5 save actions are paired');
  assert.match(
    fourthSaveVisible,
    /Stage Changes[\s\S]*git add openspec\/changes\/limit-credit-amount[\s\S]*git diff --cached[\s\S]*git commit -m[\s\S]*git push -u origin[\s\S]*New merge request[\s\S]*Approve[\s\S]*Merge/u,
    'step 5 orders staging, commit, publication, MR, approval and merge',
  );
  const fourthSaveAdvanced = fourthSave.advanced ?? '';
  assert.ok(
    fourthSaveAdvanced,
    'step 5 must keep the terminal commit/push sequence in the advanced variant',
  );
  assert.match(
    fourthSaveAdvanced,
    /git add openspec\/changes\/limit-credit-amount/u,
    'step 5 terminal route stages the planning change',
  );
  assert.match(
    fourthSaveAdvanced,
    /git diff --cached/u,
    'step 5 terminal route reviews the staged diff',
  );
  assert.match(
    fourthSaveAdvanced,
    /git push -u origin course\/&lt;LOGIN&gt;\/stage-4-amount-limits/u,
    'step 5 terminal route pushes the analyst branch to the learner fork',
  );
  assert.match(
    fourthText,
    /add-reset-and-years-term/iu,
    'step 5 must keep the inherited active Change',
  );
  assert.match(
    fourthText,
    /add-payment-summary|limit-credit-amount/iu,
    'step 5 must keep all active Change names',
  );
};

export const assertStageFourPlanning = (
  guides: LearnerGuides,
  fourth: LearnerGuide,
  fourthText: string,
  fourthEntryActions: string,
): void => {
  assertStageFourBranch(fourth, fourthText, fourthEntryActions);
  assertStageFourScenarios(guides, fourth, fourthText);
  assertStageFourSave(fourth, fourthText);
};
