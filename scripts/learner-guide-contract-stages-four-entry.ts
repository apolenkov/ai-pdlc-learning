import assert from 'node:assert/strict';
import {
  collapsedAction,
  stepDisclosures,
  assertVsCodeCloneNames,
} from './learner-guide-contract-common.ts';
import type { LearnerGuide, LearnerStep } from './learner-guide-types.ts';

const assertStageFourFork = (
  fourth: LearnerGuide,
): { fourthEntry: LearnerStep; fourthEntryActions: string; fourthEntryVisible: string[] } => {
  const fourthEntry = fourth.steps[1];
  assert.ok(fourthEntry, 'step 5 entry step is missing');
  const fourthEntryActions = [...fourthEntry.actions, ...stepDisclosures(fourthEntry)].join('\n');
  const fourthEntryVisible = fourthEntry.actions.filter((action) => !collapsedAction(action));
  const forkActionIndex = fourthEntry.actions.findIndex((action) =>
    /<strong>Fork<\/strong>/u.test(action),
  );
  const cloneActionIndex = fourthEntry.actions.findIndex((action) =>
    /скопируйте свой форк/iu.test(action),
  );
  assert.ok(
    forkActionIndex >= 0 && cloneActionIndex >= 0,
    'step 5 step 1 must keep Fork through the GitLab UI followed by the short clone',
  );
  assert.ok(
    forkActionIndex < cloneActionIndex,
    'step 5 step 1 must present Fork as the primary action before clone',
  );
  assert.equal(
    fourthEntryVisible.length,
    7,
    'step 5 entry separates Fork, clone, cd, origin, switch, SHA and clean tracking checks',
  );
  const fourthEntryShots = (fourthEntry.screenshots ?? []).map((shot) => shot.src);
  assert.ok(
    !fourthEntryShots.some((src) => /github/iu.test(src)),
    'step 5 step 1 must not show a GitHub screenshot; the learner platform is the team GitLab group',
  );
  assert.ok(
    !fourthEntryShots.includes('assets/route-r4-vscode-two-root.png'),
    'step 5 step 1 keeps only the fork screenshot; the two-root workspace capture belongs to the setup step',
  );
  return { fourthEntry, fourthEntryActions, fourthEntryVisible };
};

const assertStageFourClone = (fourthEntryActions: string, fourthEntryVisible: string[]): void => {
  assert.doesNotMatch(
    fourthEntryVisible.join('\n'),
    /git switch -c|git checkout -b|git branch /u,
    'step 5 step 1 visible route must not create a branch; branch creation stays in step 3',
  );
  assert.doesNotMatch(
    fourthEntryActions,
    /stage-4-amount-limits/u,
    'step 5 step 1 must not mention the analyst branch; it is created only in the dedicated step',
  );
  assert.match(
    fourthEntryActions,
    /<details class="beginner-extra beginner-extra--secondary"><summary>Для организатора · архитектор или разработчик, владелец метарепозитория<\/summary>/u,
    'step 5 organizer instructions stay collapsed, subdued and name the architect-or-developer meta-repository owner',
  );
  assert.match(
    fourthEntryActions,
    /<details class="beginner-extra beginner-extra--secondary"><summary>[^<]*только[^<]*ветка не скопировалась в форк[^<]*<\/summary>/iu,
    'step 5 fallback stays collapsed, subdued and scoped only to a failed branch copy',
  );
  const fourthEntryVisibleText = fourthEntryVisible.join('\n');
  assertVsCodeCloneNames(
    fourthEntryVisibleText,
    'step 5 step 1 must clone the learner fork through VS Code',
  );
  assert.match(
    fourthEntryVisibleText,
    /IMPORT_BASE_BRANCH/u,
    'step 5 step 1 must select the organizer-issued base branch, not a login-derived name',
  );
  const commands = fourthEntryVisible.flatMap((action) =>
    [...action.matchAll(/<pre><code>([^<]*(?:&lt;[^;]*&gt;[^<]*)*)<\/code><\/pre>/gu)].map(
      (match) => match[1],
    ),
  );
  assert.deepEqual(commands, [
    'git clone &lt;FORK_REPOSITORY_URL&gt;',
    'cd ai-pdlc-learning-stage-4-requirements',
    'git remote get-url origin',
    'git switch &lt;IMPORT_BASE_BRANCH&gt;',
    'git rev-parse HEAD',
    'git status --short --branch',
  ]);
  for (const action of fourthEntryVisible) {
    if (/Fork<\/strong>/u.test(action)) assert.match(action, /^В GitLab:/u);
    else assert.match(action, /В (?:GitLab|VS Code):[\s\S]*В терминале:/u);
    assert.equal(
      (action.match(/<pre><code>/gu) ?? []).length,
      /Fork<\/strong>/u.test(action) ? 0 : 1,
    );
  }
};

const assertStageFourFallback = (fourthEntry: LearnerStep, fourthEntryActions: string): void => {
  const fourthEntryAdvanced = fourthEntry.actions.join('\n');
  if (/git clone/u.test(fourthEntryAdvanced)) {
    assert.match(
      fourthEntryAdvanced,
      /git clone\s+&lt;FORK_REPOSITORY_URL&gt;/u,
      'step 5 terminal clone, when offered, must clone the learner fork',
    );
    assert.match(
      fourthEntryAdvanced,
      /git remote get-url origin[\s\S]*&lt;FORK_REPOSITORY_URL&gt;/u,
      'step 5 terminal clone must verify that origin is the learner fork',
    );
    assert.doesNotMatch(
      fourthEntryAdvanced,
      /git clone[^\n]*META_REPOSITORY_URL/u,
      'step 5 terminal clone must not use the meta-repository as origin',
    );
  }
  const fourthFallback = stepDisclosures(fourthEntry).filter(
    (action) => collapsedAction(action) && /ветка не скопировалась в форк/u.test(action),
  );
  const fallbackText = fourthFallback[0] ?? '';
  assert.match(
    fallbackText,
    /передайте организатору[\s\S]*IMPORT_BASE_BRANCH[\s\S]*IMPORT_BASE_SHA/u,
    'a missing issued base must go to the organizer with branch and SHA',
  );
  assert.doesNotMatch(
    fallbackText,
    /git clone/u,
    'step 5 fallback must recover the existing requirements checkout, not clone again',
  );
  assert.doesNotMatch(
    fallbackText,
    /\bcd ai-pdlc-learning/u,
    'step 5 fallback must not re-enter the requirements directory',
  );
  assert.doesNotMatch(
    fallbackText,
    /git (?:push|fetch|switch -c)|set -eu/u,
    'learners must not import or publish a missing issued base themselves',
  );
  const organizer =
    stepDisclosures(fourthEntry).find((part) => /<summary>Для организатора/u.test(part)) ?? '';
  assert.match(
    organizer,
    /до любой записи[\s\S]*origin точно равен FORK_REPOSITORY_URL[\s\S]*upstream точно равен META_REPOSITORY_URL[\s\S]*только при отсутствии[\s\S]*IMPORT_BASE_BRANCH отсутствует в origin/u,
    'organizer recovery must verify both remotes and require an absent destination branch',
  );
  assert.match(
    organizer,
    /получает ровно эту ветку из upstream[\s\S]*FETCH_HEAD с IMPORT_BASE_SHA[\s\S]*Только при совпадении[\s\S]*от проверенного FETCH_HEAD[\s\S]*публикует её в origin/u,
    'organizer recovery must pin the fetched source before creating and publishing the base',
  );
  assert.match(
    organizer,
    /Любая ошибка останавливает импорт[\s\S]*существующую ветку не перезаписывают[\s\S]*в upstream не отправляют/u,
    'fail-closed checks, no overwrite and no write to upstream remain mandatory',
  );
  assert.match(
    fourthEntryAdvanced,
    /git switch &lt;IMPORT_BASE_BRANCH&gt;[\s\S]*git rev-parse HEAD[\s\S]*&lt;IMPORT_BASE_SHA&gt;[\s\S]*git status --short --branch/u,
    'step 5 paired entry actions must land on the issued branch and pin the exact HEAD SHA',
  );
  assert.doesNotMatch(
    fourthEntryActions,
    /set -eu|git push -u origin &lt;IMPORT_BASE_BRANCH&gt;/u,
    'the learner page delegates protected recovery instead of teaching a multi-command import script',
  );
};

export const assertStageFourEntry = (fourth: LearnerGuide): string => {
  const { fourthEntry, fourthEntryActions, fourthEntryVisible } = assertStageFourFork(fourth);
  assert.equal(fourthEntry.gitNote, 'Для создания форка в GitLab команда Git не нужна.');
  assertStageFourClone(fourthEntryActions, fourthEntryVisible);
  assertStageFourFallback(fourthEntry, fourthEntryActions);
  return fourthEntryActions;
};
