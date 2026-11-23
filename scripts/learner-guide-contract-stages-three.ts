import assert from 'node:assert/strict';
import { prose, examples, collapsedAction } from './learner-guide-contract-common.ts';
import type { LearnerGuides, LearnerStep } from './learner-guide-types.ts';

const assertStageThreeEntry = (guides: LearnerGuides): { id: string; entry: LearnerStep } => {
  const id = '3';
  // UI and CLI share each action; both branch from the reviewed step 2 checkout.
  // Exact-SHA output stays secondary diagnostics, never a required manual input.
  const entry = guides[id].steps[1];
  assert.ok(entry, `${id}: missing entry step`);
  const visibleEntry = entry.actions.filter((action) => !collapsedAction(action)).join('\n');
  assert.match(
    visibleEntry,
    /VS Code/iu,
    `${id}: the happy path creates the branch through VS Code`,
  );
  assert.match(
    visibleEntry,
    /ту же папку|той же папке|той же рабочей копии/iu,
    `${id}: continuous entry must keep the same learner checkout`,
  );
  assert.match(
    visibleEntry,
    /course\/your_login\/stage-2-reset/u,
    `${id}: continuous entry must branch from the accepted step 2 branch`,
  );
  assert.match(
    visibleEntry,
    /course\/your_login\/stage-3-reset-years/u,
    `${id}: continuous entry must name the personal step 3 branch`,
  );
  assert.doesNotMatch(
    visibleEntry,
    /git (?:clone|checkout|cat-file)|FULL_R2_SHA|\br2_sha\b|stage-1-error-result|stage-3-import-base/iu,
    `${id}: another clone, a manual SHA and the retired step 1 detour stay out of the visible route`,
  );
  const creation = entry.actions.find((action) => action.includes('git switch -c'));
  assert.match(
    creation ?? '',
    /В VS Code:[\s\S]*Create new branch[\s\S]*В терминале:<pre><code>git switch -c course\/your_login\/stage-3-reset-years/u,
  );
  assert.doesNotMatch(
    examples(entry),
    /git clone|git switch -c|git cat-file|stage-[23]-import-base/iu,
    `${id}: continuous entry must not require another clone or import base`,
  );
  return { id, entry };
};

const assertStageThreeTerminal = (id: string, entry: LearnerStep): void => {
  const terminal = entry.advanced ?? '';
  assert.match(
    terminal,
    /git status --short --branch/u,
    `${id}: the advanced variant must verify the current learner checkout`,
  );
  assert.match(
    terminal,
    /git switch -c course\/your_login\/stage-3-reset-years[ \t]*(?:\n|<|#|$)/u,
    `${id}: the advanced variant creates step 3 from the current reviewed step 2 branch, without a start-point ref`,
  );
  assert.doesNotMatch(
    terminal,
    /\br2_sha\b|FULL_R2_SHA|git cat-file|stage-1-error-result/iu,
    `${id}: the advanced variant drops the SHA/cat-file ceremony and never detours through step 1`,
  );
  assert.doesNotMatch(
    terminal,
    /git clone|stage-[23]-import-base/iu,
    `${id}: continuous entry must not require another clone or import base`,
  );
  assert.match(
    prose(entry),
    /не (?:используйте|подставляйте) main/iu,
    `${id}: recovery must forbid substituting main`,
  );
};

const assertStageThreeChanges = (guides: LearnerGuides): void => {
  const third = prose(guides['3']);
  assert.match(
    third,
    /openspec init/u,
    'manual step 3 must prepare the existing Markdown checkout',
  );
  assert.match(
    third,
    /openspec init --tools none/u,
    'manual step 3 init creates only the OpenSpec root and generates no agent tooling',
  );
  assert.doesNotMatch(third, /--tools kilocode/u, 'the false kilocode init flag must not return');
  assert.doesNotMatch(
    third,
    /--tools opencode/u,
    'the OpenCode init flag stays out of stage 3; only the .opencode artifact is named',
  );
  assert.doesNotMatch(
    third,
    /\.kilocode|opsx/iu,
    'init --tools none creates no .kilocode directory and no /opsx workflow',
  );
  assert.match(
    third,
    /\.kilo\/skills/u,
    'step 3 must name the native .kilo skills already present in the checkout',
  );
  assert.match(
    third,
    /отдельн\p{L}*[^.]{0,120}учебн\p{L}* образ\p{L}*/iu,
    'step 3 must keep the standalone reference distinct from the continuous checkout',
  );
  assert.match(
    third,
    /openspec new change add-reset-and-years-term/u,
    'manual step 3 must explain initial Change creation',
  );
  assert.match(third, /AGENTS\.md/u, 'step 3 must replace stage-1 rules explicitly');
  assert.match(
    third,
    /8\s*\/\s*8|восемь сценариев/iu,
    'step 3 must account for inherited step 2 scenarios',
  );
  const thirdSave = guides['3'].steps.find((step) =>
    step.title.startsWith('Проверьте выбранные правки'),
  );
  assert.ok(thirdSave, 'step 3 save step is missing');
  assert.match(
    thirdSave.advanced ?? '',
    /if \[ -f ai\/request\.md \]; then git add -- ai\/request\.md; fi/u,
    'step 3 must conditionally stage the existing updated AI request',
  );
};

/** step 3: entry route, OpenSpec init, Changes, saving. */
export const assertStageThree = (guides: LearnerGuides): void => {
  const { id, entry } = assertStageThreeEntry(guides);
  assertStageThreeTerminal(id, entry);
  assertStageThreeChanges(guides);
};

/** Each MR example names exactly one source and personal base branch. */
export const assertMrSourceAndBase = (guides: LearnerGuides): void => {
  for (const [id, source, base] of [
    ['2', 'course/your_login/stage-2-reset', 'course/your_login/stage-1-error-result'],
    ['3', 'course/your_login/stage-3-reset-years', 'course/your_login/stage-2-reset'],
    ['3-star', 'course/<LOGIN>/stage-4-amount-limits', '<IMPORT_BASE_BRANCH>'],
  ] as const) {
    const fields = guides[id].steps
      .flatMap((step) => [step.example, ...(step.examples ?? [])])
      .map((example) => example?.content ?? '')
      .filter((content) => /^source(?: \(исходная ветка\))?:/mu.test(content));
    assert.equal(fields.length, 1, `${id}: exactly one explicit MR source/base pair is required`);
    assert.equal(
      fields[0]!.match(/^source(?: \(исходная ветка\))?:\s*(\S+)\s*$/mu)?.[1],
      source,
      `${id}: incorrect MR source field`,
    );
    assert.equal(
      fields[0]!.match(/^base(?: \(целевая ветка\))?:\s*(\S+)\s*$/mu)?.[1],
      base,
      `${id}: incorrect personal MR base field`,
    );
  }
};
