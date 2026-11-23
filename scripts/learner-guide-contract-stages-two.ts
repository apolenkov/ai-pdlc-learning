import assert from 'node:assert/strict';
import { pairViolations } from './course-rules-test-support.ts';
import {
  prose,
  examples,
  collapsedAction,
  stepDisclosures,
} from './learner-guide-contract-common.ts';
import type { LearnerGuides, LearnerStep } from './learner-guide-types.ts';

const scenarioRows = (text: string) =>
  text.split('\n').filter((line) => /^\| (?!Сценарий|---)/u.test(line));

const assertStageTwoDraft = (guides: LearnerGuides): string => {
  const sample = guides['1'].steps.at(-1)?.example?.content ?? '';
  const draft = guides['2'].steps[2]?.example?.content ?? '';
  assert.match(
    draft,
    /^# Кредитный калькулятор/u,
    'step 2 draft must replace the complete specification',
  );
  assert.equal(scenarioRows(sample).length, 5, 'step 1 sample must contain five scenarios');
  assert.equal(
    scenarioRows(draft).length,
    7,
    'step 2 draft omits only reset-after-error from eight scenarios',
  );
  const acceptedRow = scenarioRows(sample).find((line) =>
    line.startsWith('| Успешный расчёт → ошибочный ввод |'),
  );
  assert.ok(acceptedRow, 'step 1 sample must cover error after a successful calculation');
  for (const line of sample.split('\n').filter((line) => line.trim() && line !== acceptedRow)) {
    assert.ok(
      draft.split('\n').includes(line),
      'step 2 draft must preserve every accepted step 1 line except the planted field error',
    );
  }
  assert.ok(
    draft.includes(acceptedRow.replace('ошибка у поля срока', 'ошибка у поля суммы')),
    'step 2 draft must plant exactly the intended field error in the fifth step 1 scenario',
  );
  const additions = draft
    .split('\n')
    .filter((line) => line.trim() && !sample.split('\n').includes(line));
  assert.equal(
    additions.length,
    4,
    'step 2 draft must add only the reset rule, two reset scenarios and the planted step 1 row',
  );
  assert.match(
    draft,
    /Перед сбросом калькулятор спрашивает подтверждение\.[^\n]*ставку 15%[^\n]*сразу считает платёж/u,
    'step 2 draft must plant the extra confirmation, wrong rate and automatic calculation',
  );
  assert.doesNotMatch(
    draft,
    /\| Сброс после ошибки \|/u,
    'step 2 draft must omit reset after error',
  );
  return sample;
};

const assertStageTwoCorrections = (guides: LearnerGuides, sample: string): void => {
  const resetStep = guides['2'].steps.find((step) => step.title.startsWith('Проверьте черновик'));
  assert.ok(resetStep, 'step 2 reset step is missing');
  const corrected = resetStep.trouble.match(
    /<summary>Полный образец specification\.md · восемь сценариев<\/summary>[\s\S]*?<code>([\s\S]*?)<\/code>/u,
  )?.[1];
  assert.ok(
    corrected,
    'step 2 corrected sample must contain the complete eight-scenario specification',
  );
  const correctedRows = scenarioRows(corrected);
  assert.equal(
    correctedRows.length,
    8,
    'step 2 corrected sample must contain exactly eight scenarios',
  );
  for (const row of scenarioRows(sample)) {
    assert.ok(
      correctedRows.includes(row),
      'step 2 corrected sample must preserve every accepted step 1 scenario verbatim',
    );
  }
  const answers =
    resetStep.trouble.match(
      /<table>\s*<caption>Пять ошибок учебного черновика<\/caption>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/u,
    )?.[1] ?? '';
  const answerRows = [...answers.matchAll(/<tr>([\s\S]*?)<\/tr>/gu)].map((match) => match[1]!);
  assert.equal(
    answerRows.length,
    5,
    'step 2 answer table must contain exactly five correction rows',
  );
  assert.deepEqual(
    answerRows.map((row) => row.match(/^<td>(.*?)<\/td>/u)?.[1]),
    ['Лишнее', 'Пропущено', 'Числа', 'Противоречие', 'Принятое раньше'],
    'step 2 answer table must cover all five review questions',
  );
  assert.match(
    answerRows[1]!,
    /после ошибки/u,
    'step 2 answer table must restore reset after error',
  );
  assert.match(
    answerRows[2]!,
    /<td>[^<]*16%[^<]*<\/td>/u,
    'step 2 answer table must restore the intended 16% rate',
  );
  assert.match(
    answerRows[4]!,
    /<td>[^<]*поля срока[^<]*<\/td>/u,
    'step 2 answer table must restore the accepted term-field error',
  );
  assert.match(
    prose(resetStep),
    /повторный сброс[^.]{0,120}не меняет состояние[^.]{0,120}не запускает расчёт[^.]{0,120}не показывает ошибк/iu,
    'step 2 must define repeated reset as idempotent',
  );
};

const assertStageTwoEntry = (guides: LearnerGuides): void => {
  const secondEntry = guides['2'].steps[1];
  assert.ok(secondEntry, 'step 2 entry step is missing');
  const r2VisibleActions = secondEntry.actions.filter((action) => !collapsedAction(action));
  assert.doesNotMatch(
    r2VisibleActions.join('\n'),
    /Отдельный старт|начинаете сразу с шага 2|эталон шага 2/iu,
    '2: the numbered route must not repeat the separate-start explanation',
  );
  assert.match(
    r2VisibleActions.join('\n'),
    /VS Code/iu,
    '2: the happy path creates the branch through VS Code',
  );
  assert.doesNotMatch(
    r2VisibleActions.join('\n'),
    /FULL_R1_SHA/u,
    '2: the numbered route must not demand a manual SHA',
  );
  assert.doesNotMatch(
    examples(secondEntry),
    /git clone|stage-2-import-base/iu,
    '2: continuous entry must not require another clone or import base',
  );
  assert.deepEqual(
    pairViolations({ steps: [secondEntry] }),
    [],
    'step 2 branch actions are paired',
  );
  assert.match(
    r2VisibleActions.join('\n'),
    /Git: Fetch[\s\S]*git fetch origin[\s\S]*@\{upstream\}[\s\S]*git switch -c course\/your_login\/stage-2-reset/u,
    'step 2 verifies the published upstream before creating its branch',
  );
  assert.match(
    secondEntry.advanced ?? '',
    /git (?:status|rev-parse)/u,
    '2: the advanced terminal variant must verify the learner checkout',
  );
  assert.match(
    secondEntry.advanced ?? '',
    /git switch -c course\/your_login\/stage-2-reset/u,
    '2: the advanced variant must keep the exact branch-from-SHA command',
  );
  assert.match(
    prose(secondEntry),
    /Source Control есть изменения/iu,
    '2: uncommitted changes must be named in Source Control',
  );
  assert.match(
    prose(secondEntry),
    /останов/iu,
    '2: the wrong checkout state must stop the learner',
  );
  assert.match(
    prose(secondEntry),
    /не (?:подставляйте|используйте)(?: текущую)? main/iu,
    '2: recovery must forbid substituting main',
  );
  assert.match(
    prose(secondEntry),
    /не применяйте принудительную отправку/iu,
    '2: recovery keeps the no-force warning',
  );
  const secondSave = guides['2'].steps.find((step) =>
    step.title.startsWith('Сохраните и отправьте результат шага 2'),
  );
  assert.ok(secondSave, 'step 2 save/push step is missing');
  assert.match(
    secondSave.advanced ?? '',
    /git push -u origin course\/your_login\/stage-2-reset/u,
    '2: the advanced route pushes only the learner step 2 branch to the fork',
  );
  assert.doesNotMatch(
    secondSave.advanced ?? '',
    /git push[^\n]*(?:stage-1-error-result|\bmain\b)/u,
    '2: direct push to the personal base or main is forbidden',
  );
  assertStageTwoSeparateEntry(guides, secondEntry);
};

const assertStageTwoSeparateEntry = (guides: LearnerGuides, secondEntry: LearnerStep): void => {
  const r2Separate = stepDisclosures(secondEntry).filter(
    (action) => collapsedAction(action) && /Отдельный старт/u.test(action),
  );
  assert.equal(r2Separate.length, 1, '2: the separate-start block must appear exactly once');
  assert.match(
    r2Separate[0] ?? '',
    /<details class="beginner-extra beginner-extra--secondary"><summary>Отдельный старт — без результата шага 1 курса<\/summary>/u,
    '2: separate start must be a subdued secondary block titled «Отдельный старт — без результата step 1»',
  );
  assert.match(
    r2Separate[0] ?? '',
    /git clone https:\/\/gitlab\.example\.invalid\/your_login\/ai-pdlc-learning-stage-2\.git/u,
    '2: the collapsed block must keep the fork-clone commands',
  );
  assert.match(
    r2Separate[0] ?? '',
    /transfer\.md/u,
    '2: the collapsed block must keep the separate-entry provenance file',
  );
  assert.equal(
    prose(guides['2']).match(/ai-pdlc-learning-stage-2\.git/gu)?.length ?? 0,
    1,
    '2: the separate-start repository must be referenced exactly once',
  );
};

const assertStageTwoClosing = (
  guides: LearnerGuides,
): { secondClose: LearnerStep; r2CloseVisible: string } => {
  const secondClose = guides['2'].steps.at(-1);
  assert.ok(secondClose, 'step 2 closing step is missing');
  assert.doesNotMatch(
    secondClose.title,
    /^(?:при желании|необязательно|опционально)/iu,
    '2: the final step title must lead with the mandatory step 3 entry, not an optional extra',
  );
  const r2CloseVisible = secondClose.actions
    .filter((action) => !collapsedAction(action))
    .join('\n');
  assert.match(
    r2CloseVisible,
    /Jira[\s\S]{0,240}запрос[\s\S]{0,240}ветк\S*\s+шага 2 курса[^.\n]*основа шага 3 курса/iu,
    '2: the numbered route must log the accepted MR and branch state in Jira for the step 3 entry',
  );
  assert.doesNotMatch(
    r2CloseVisible,
    /git (?:rev-parse|status|ls-remote)/u,
    '2: SHA evidence commands stay out of the visible handoff',
  );
  assert.match(
    secondClose.advanced ?? '',
    /git rev-parse HEAD[\s\S]*git status --short[\s\S]*git ls-remote/iu,
    '2: the advanced variant keeps rev-parse, clean-tree and ls-remote evidence',
  );
  assert.doesNotMatch(
    `${secondClose.actions.join('\n')}\n${secondClose.advanced ?? ''}`,
    /(?:git\s+(?:switch|checkout)|переключ\p{L}*)[^.\n]{0,120}stage-1-error-result|\bpull\b(?!\s*request)/iu,
    '2: the final handoff must not switch to or pull the step 1 branch; step 3 continues from the reviewed step 2 branch',
  );
  assert.doesNotMatch(
    examples(secondClose),
    /git (?:rev-parse|status|ls-remote)/u,
    '2: the visible example must not carry terminal evidence commands',
  );
  assert.doesNotMatch(
    secondClose.actions.join('\n'),
    /2-ИИ|stage-2-ai/iu,
    '2: the retired AI stage must not render inside the mandatory step 3 logging step',
  );
  return { secondClose, r2CloseVisible };
};

const assertStageTwoReview = (guides: LearnerGuides, secondClose: LearnerStep): void => {
  const secondReview = guides['2'].steps.find((step) => step.title.startsWith('Одобрение;'));
  assert.ok(secondReview, 'step 2 human review step is missing');
  assert.ok(
    guides['2'].steps.indexOf(secondReview) < guides['2'].steps.indexOf(secondClose),
    '2: the human review step must render before the mandatory step 3 entry logging',
  );
  assert.doesNotMatch(
    prose(guides['2']),
    /2-ИИ|stage-2-ai/iu,
    '2: model help stays inside step 2 without links to the retired AI stage',
  );
  assert.match(
    prose(secondReview),
    /Запросить повторное ревью[\s\S]*Решить нить[\s\S]*владелец продукта заново ставит одобрение/iu,
    '2: accepted model edits require a re-review request, closed threads and a fresh manager approval',
  );
  const secondPr = guides['2'].steps.find((step) =>
    step.title.startsWith('Запрос на слияние из ветки шага 2'),
  );
  assert.ok(secondPr, 'step 2 MR step is missing');
  assert.match(
    examples(secondPr),
    /source \(исходная ветка\):\s*course\/your_login\/stage-2-reset[\s\S]*base \(целевая ветка\):\s*course\/your_login\/stage-1-error-result/u,
    '2: the step 2 MR targets the previous personal branch inside the same fork',
  );
  assert.ok(
    guides['2'].steps.indexOf(secondPr) < guides['2'].steps.indexOf(secondReview),
    '2: the MR opens before the human review step',
  );
  assert.match(
    prose(secondReview),
    /владелец продукта одобряет последнюю версию, аналитик и техлид оставляют замечания/iu,
    '2: the manager approves while the analyst and tech lead comment, plus the conditional architect',
  );
  assert.match(
    guides['2'].summary,
    /владелец продукта даёт одно одобрение[\s\S]*это то, что я просил/iu,
    '2: the manager must give one approval confirming the specification matches the request',
  );
  assert.match(
    guides['2'].summary,
    /аналитик проверяет комментариями смысл и полноту[\s\S]*техлид — реализуемость/iu,
    '2: the analyst and tech lead retain their separate review responsibilities',
  );
  assert.match(
    guides['2'].summary,
    /архитектор оставляет комментарий по признакам или при споре/iu,
    '2: the architect comments on triggers or a dispute',
  );
  assert.match(
    prose(secondReview),
    /одобрение последней версии запроса/u,
    '2: step 2 reviews must cover the current MR head',
  );
  assert.match(
    prose(secondReview),
    /комментарии ботов и одобрение предыдущей версии не засчитываются/iu,
    '2: bot comments and stale approvals do not count as human reviews',
  );
  assert.doesNotMatch(
    secondPr.actions.join('\n'),
    /смёрж|смерж|\bmerge\b(?!\s+Request)|после двух (?:проверок|ревью|review|подтвержд)/iu,
    '2: the MR step must not imply merging or completed checks before the human reviews',
  );
};

const assertStageTwoMerge = (secondClose: LearnerStep, r2CloseVisible: string): void => {
  assert.match(
    prose(secondClose),
    /примите|Merge/iu,
    '2: merging into the personal base happens only after human reviews',
  );
  assert.match(
    r2CloseVisible,
    /После актуального одобрения по правилу приёмки[\s\S]{0,180}примите запрос в личную целевую ветку/iu,
    '2: merge to the personal base follows current human reviews',
  );
  assert.doesNotMatch(
    secondClose.advanced ?? '',
    /git push/u,
    '2: step 2 reaches its base through the reviewed MR, not a direct push',
  );
};

/** step 2: branch from step 1, save and push, the reviewed MR, closing. */
export const assertStageTwo = (guides: LearnerGuides): void => {
  const sample = assertStageTwoDraft(guides);
  assertStageTwoCorrections(guides, sample);
  assertStageTwoEntry(guides);
  const { secondClose, r2CloseVisible } = assertStageTwoClosing(guides);
  assertStageTwoReview(guides, secondClose);
  assertStageTwoMerge(secondClose, r2CloseVisible);
};
