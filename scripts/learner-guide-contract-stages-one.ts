import assert from 'node:assert/strict';
import { pairViolations } from './course-rules-test-support.ts';
import {
  prose,
  examples,
  collapsedAction,
  stepDisclosures,
} from './learner-guide-contract-common.ts';
import type { LearnerGuides, LearnerStep } from './learner-guide-types.ts';

const assertStageOneEntry = (guides: LearnerGuides): LearnerStep => {
  const firstEntry = guides['1'].steps.find((step) => step.mockup?.kind === 'gitlab-fork');
  assert.ok(firstEntry, 'step 1 entry is missing');
  assert.doesNotMatch(
    examples(firstEntry),
    /npm|openspec|git clone/iu,
    'step 1 entry needs neither Node nor OpenSpec and no visible terminal clone',
  );
  assert.match(
    firstEntry.advanced ?? '',
    /git clone https:\/\/gitlab\.example\.invalid\/your_login\/ai-pdlc-learning-stage-1\.git/u,
    'step 1 must clone the learner fork after it is created',
  );
  assert.deepEqual(pairViolations({ steps: [firstEntry] }), [], 'step 1 Git actions are paired');
  for (const action of firstEntry.actions.filter((text) => /git clone/u.test(text))) {
    assert.match(
      action,
      /В VS Code:[\s\S]*Git: Clone[\s\S]*В терминале:<pre><code>git clone https:\/\/gitlab\.example\.invalid\/your_login\//u,
      'step 1 clone must be paired with its VS Code action and use the learner fork',
    );
  }
  const analysisGuides = Object.fromEntries(
    Object.entries(guides).filter(([id]) => id !== 'delivery'),
  );
  const allGuideText = prose(analysisGuides);
  assert.doesNotMatch(
    allGuideText,
    /CORPORATE_FORK_URL|push_remote|fork_url|remote add fork/u,
    'learner routes must use the cloned fork as origin',
  );
  return firstEntry;
};

const assertStageOneSave = (guides: LearnerGuides): void => {
  const firstSave = guides['1'].steps.find((step) => step.title.startsWith('Сверьте с образцом'));
  assert.ok(firstSave, 'step 1 save step is missing');
  assert.match(
    firstSave.actions.filter((action) => !collapsedAction(action)).join('\n'),
    /Source Control/u,
    'step 1 must run the visible save route through VS Code Source Control',
  );
  const firstSaveAdvanced = firstSave.advanced ?? '';
  assert.match(
    firstSaveAdvanced,
    /git add specification\.md/u,
    'step 1 terminal route must stage only the changed specification',
  );
  assert.doesNotMatch(
    firstSaveAdvanced,
    /\bgit add (?:\.|--all|-A)(?:\s|$)/u,
    'step 1 terminal route must not stage the whole checkout',
  );
  assert.match(
    firstSaveAdvanced,
    /git diff --cached --check<\/code><\/pre>[^]*?git diff --cached<\/code><\/pre>[^]*?git commit -m &quot;docs: уточнить результат при ошибке ввода&quot;<\/code><\/pre>/u,
    'step 1 terminal route must inspect the staged diff before the expected commit',
  );
  assert.doesNotMatch(
    examples(firstSave),
    /git (?:add|commit|diff|status|push)/u,
    '1: terminal commands must not render as a visible example',
  );
};

const assertStageOnePush = (guides: LearnerGuides, firstEntry: LearnerStep): LearnerStep => {
  const firstPush = guides['1'].steps.find((step) => step.title.startsWith('Сверьте с образцом'));
  assert.ok(firstPush, 'step 1 push step is missing');
  assert.match(
    firstPush.advanced ?? '',
    /git push -u origin course\/your_login\/stage-1-error-result/u,
    'step 1 must push directly to origin',
  );
  assert.match(
    firstPush.advanced ?? '',
    /git rev-parse HEAD[\s\S]*git status --short/u,
    '1: the advanced variant keeps exact-SHA and clean-tree evidence',
  );
  const r1VisibleActions = firstEntry.actions.filter((action) => !collapsedAction(action));
  const r1ForkIndex = r1VisibleActions.findIndex((action) =>
    /<strong>Fork<\/strong>/u.test(action),
  );
  assert.ok(
    r1ForkIndex >= 0 && r1ForkIndex <= 1,
    '1: the visible route must lead with the GitLab Fork before any other setup',
  );
  assert.match(
    r1VisibleActions[r1ForkIndex] ?? '',
    /скопируйте[^.]{0,80}(?:HTTPS|адрес|URL)/iu,
    '1: the Fork action must hand the learner their own fork URL',
  );
  assert.doesNotMatch(
    r1VisibleActions.join('\n'),
    /remote add|второй remote|Personal access tokens|Sign in with SAML|credential\.helper/u,
    '1: the numbered route must not carry remote-add or credential setup',
  );
  const r1SetupHelp = stepDisclosures(firstEntry).filter(
    (action) => collapsedAction(action) && /Если Git ещё не настроен/u.test(action),
  );
  assert.equal(r1SetupHelp.length, 1, '1: Git setup help must live in a single collapsed block');
  assert.match(
    r1SetupHelp[0] ?? '',
    /<details class="beginner-extra beginner-extra--secondary"><summary>Если Git ещё не настроен<\/summary>/u,
    '1: Git help must be a subdued secondary block titled «Если Git ещё не настроен»',
  );
  assert.match(
    r1SetupHelp[0] ?? '',
    /\.\.\/corporate-resources\.html#git/u,
    '1: Git help must link the canonical corporate resource',
  );
  assert.match(r1SetupHelp[0] ?? '', /останов/iu, '1: unresolved Git setup must stop the learner');
  assert.doesNotMatch(
    r1SetupHelp[0] ?? '',
    /Personal access tokens|credential\.helper|Sign in with SAML/iu,
    '1: token and credential steps stay in the canonical resource, not duplicated on the stage',
  );
  return firstPush;
};

const assertStageOneRequirements = (guides: LearnerGuides, firstPush: LearnerStep): void => {
  const r1Edit = guides['1'].steps.find((step) => step.title.startsWith('Уточните правило'));
  assert.ok(r1Edit, 'step 1 requirements step is missing');
  assert.match(prose(r1Edit), /«ПРАВИЛА»/u, '1: requirements must keep the «Правила» subsection');
  assert.match(
    prose(r1Edit),
    /всего пять сценариев/iu,
    '1: requirements must state exactly five scenarios',
  );
  for (const example of [firstPush.example, ...(firstPush.examples ?? [])]) {
    if (!example) continue;
    assert.ok(
      example.content
        .split('\n')
        .some((line) => line.trim().length > 0 && !line.trimStart().startsWith('#')),
      `1: "${example.label}" must be executable commands, not a comment-only block`,
    );
  }
  const r1ForkPolicy = stepDisclosures(firstPush).find(
    (action) => collapsedAction(action) && /Остановитесь и сообщите организатору/u.test(action),
  );
  assert.ok(
    r1ForkPolicy && /beginner-extra--secondary/u.test(r1ForkPolicy),
    '1: the fork-policy fallback must stay as collapsed secondary help',
  );
  const firstCorporate = String(guides['1'].corporate ?? '');
  assert.doesNotMatch(
    firstCorporate,
    /OpenCode|Kilo|ИИ\b/iu,
    '1: the manual stage must not prescribe an AI route',
  );
};

/** step 1: fork and clone, save, push, requirements. */
export const assertStageOne = (guides: LearnerGuides): void => {
  const firstEntry = assertStageOneEntry(guides);
  assertStageOneSave(guides);
  const firstPush = assertStageOnePush(guides, firstEntry);
  assertStageOneRequirements(guides, firstPush);
};

/** steps 1–2 visible routes never demand a manual full SHA. */
export const assertNoManualSha = (guides: LearnerGuides): void => {
  for (const id of ['1', '2'] as const) {
    const guide = guides[id];
    const visible = [
      guide.title,
      guide.summary,
      guide.output,
      ...guide.check,
      ...guide.steps.flatMap((step) => [
        step.title,
        step.why ?? '',
        step.result,
        ...step.actions.filter((action) => !collapsedAction(action)),
        examples(step),
      ]),
    ].join('\n');
    assert.doesNotMatch(
      visible,
      /\bSHA\b|rev-parse\s+HEAD|ls-remote/iu,
      `${id}: the visible route must not demand a manual full SHA; exact-SHA diagnostics stay in collapsed secondary help`,
    );
  }
};
