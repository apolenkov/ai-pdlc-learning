import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { guideContent } from './guide-content.ts';
import {
  assertVsCodeCloneNames,
  type GuideId,
  type LearnerGuides,
} from './learner-guide-contract.ts';
import { loadGuides, renderGuide } from './learner-guide-test-support.ts';

const assertPublishedBranchesAndExactEvidence = (guides: LearnerGuides) => {
  const r1Push = guides['1'].steps.find((step) => step.title.startsWith('Сверьте с образцом'))!;
  const r1Exact = r1Push.advanced ?? '';
  assert.match(
    r1Exact,
    /git rev-parse HEAD[\s\S]*git status --short/u,
    'step 1 keeps exact-SHA diagnostics in its advanced route',
  );
  assert.equal(
    r1Exact.match(/git rev-parse HEAD/gu)?.length ?? 0,
    1,
    'step 1 keeps exactly one exact-SHA command in the advanced route',
  );

  const r2Close = guides['2'].steps.at(-1)!;
  const r2Exact = r2Close.advanced ?? '';
  assert.match(
    r2Exact,
    /git rev-parse HEAD[\s\S]*git status --short[\s\S]*git ls-remote/u,
    'step 2 keeps exact-SHA and clean-tree diagnostics in its advanced route',
  );
  assert.equal(
    r2Exact.match(/git rev-parse HEAD/gu)?.length ?? 0,
    1,
    'step 2 keeps exactly one exact-SHA command in the advanced route',
  );

  const r1PushVisible = r1Push.actions.filter((action) => !isDetails(action)).join('\n');
  assert.match(
    r1PushVisible,
    /Publish Branch|Push/u,
    'step 1 visible route still publishes the personal branch',
  );
  assert.match(
    r1PushVisible,
    /Source Control/u,
    'step 1 visible route still checks a clean Source Control state',
  );
  assert.match(
    r1PushVisible,
    /Jira/iu,
    'step 1 visible route still records the branch link in Jira',
  );

  const r2Pr = guides['2'].steps.find((step) =>
    step.title.startsWith('Запрос на слияние из ветки шага 2'),
  )!;
  const r2PrVisible = r2Pr.actions.filter((action) => !isDetails(action)).join('\n');
  assert.match(
    r2PrVisible,
    /course\/your_login\/stage-2-reset/u,
    'step 2 MR keeps the personal step 2 source branch',
  );
  assert.match(
    r2PrVisible,
    /course\/your_login\/stage-1-error-result/u,
    'step 2 MR keeps the personal step 1 base branch',
  );
};

const assertVsCodeBranchAndReview = async (t: TestContext, guides: LearnerGuides) => {
  await t.test('step 1 clones through VS Code Clone Repository and branches through the UI', () => {
    const r1Entry = guides['1'].steps.find((step) => step.mockup?.kind === 'gitlab-fork')!;
    const r1EntryVisible = r1Entry.actions.filter((action) => !isDetails(action)).join('\n');
    assertVsCodeCloneNames(
      r1EntryVisible,
      'step 1 entry must clone the learner fork through VS Code',
    );
    assert.match(
      r1EntryVisible,
      /Create new branch|Create Branch|новую ветку/iu,
      'step 1 entry must create the personal branch through VS Code',
    );
    for (const step of guides['1'].steps) {
      assert.doesNotMatch(
        examplesText(step),
        /^git (?:clone|switch|add|commit|push|diff|status|rev-parse)\b/mu,
        `step 1 «${step.title}»: terminal commands belong in step.advanced, not a visible example`,
      );
    }
    assert.match(
      r1Entry.advanced ?? '',
      /git clone https:\/\/gitlab\.example\.invalid\/your_login\/ai-pdlc-learning-stage-1\.git/u,
      'step 1 entry must keep the terminal clone in its advanced variant',
    );
  });

  await t.test(
    'step 2 branches from the accepted step 1 result in VS Code without a manual SHA',
    () => {
      const r2Entry = guides['2'].steps[1]!;
      const r2EntryVisible = r2Entry.actions.filter((action) => !isDetails(action)).join('\n');
      assert.doesNotMatch(
        r2EntryVisible,
        /FULL_R1_SHA/u,
        'step 2 happy path must not demand a manual full SHA variable',
      );
      assert.match(
        r2EntryVisible,
        /VS Code/iu,
        'step 2 entry must create the branch through VS Code',
      );
      assert.doesNotMatch(
        examplesText(r2Entry),
        /git switch -c/u,
        'step 2 entry must not show a visible terminal branch command',
      );
    },
  );

  await t.test(
    'step 2 handoff keeps Jira and branch state visible and SHA evidence collapsed',
    () => {
      const r2Close = guides['2'].steps.at(-1)!;
      const r2CloseVisible = r2Close.actions.filter((action) => !isDetails(action)).join('\n');
      assert.match(
        r2CloseVisible,
        /Jira[\s\S]{0,240}запрос[\s\S]{0,240}проверенная исходная ветка шага 2 курса сохранена как основа шага 3 курса/iu,
        'the visible handoff logs the MR and branch state for step 3',
      );
      assert.doesNotMatch(
        r2CloseVisible,
        /git (?:rev-parse|status|ls-remote)/u,
        'SHA evidence commands must not be visible in the handoff',
      );
      const r2CloseTerminal = r2Close.advanced ?? '';
      assert.ok(r2CloseTerminal, 'exact-SHA evidence stays in the explicit advanced route');
      assert.match(
        r2CloseTerminal,
        /git rev-parse HEAD[\s\S]*git status --short[\s\S]*git ls-remote/u,
      );
    },
  );

  await t.test('step 2 opens the MR before reviews and merges only afterwards', () => {
    const steps = guides['2'].steps;
    const pr = steps.findIndex((step) =>
      step.title.startsWith('Запрос на слияние из ветки шага 2'),
    );
    const review = steps.findIndex((step) => step.title.startsWith('Одобрение;'));
    assert.ok(pr >= 0 && review > pr, 'the MR step must precede human review and approval');
    assert.doesNotMatch(
      steps[pr]!.actions.join('\n'),
      /смёрж|смерж|\bmerge\b(?!\s+Request)|после двух (?:проверок|ревью|review|подтвержд)/iu,
      'the MR step must not imply a merge or completed checks before review',
    );
    assert.match(
      steps.at(-1)!.actions.join('\n'),
      /примите|Merge/iu,
      'the closing step merges into the personal base after reviews',
    );
  });
};

const examplesText = (step: { example?: { content: string }; examples?: { content: string }[] }) =>
  [step.example, ...(step.examples ?? [])].map((example) => example?.content ?? '').join('\n');

const isDetails = (action: string) => action.trimStart().startsWith('<details');

await test('step 1 and step 2 run VS Code-first: no visible terminal route or mandatory SHA entry', async (t) => {
  const guides = await loadGuides();

  await assertVsCodeBranchAndReview(t, guides);

  await t.test(
    'visible route carries no full-SHA demand; collapsed diagnostics stay available',
    async () => {
      const visibleText = (id: GuideId): string => {
        const guide = guides[id];
        return [
          guide.title,
          guide.summary,
          guide.output,
          ...guide.check,
          ...guide.steps.flatMap((step) => [
            step.title,
            step.result,
            ...step.actions.filter((action) => !isDetails(action)),
            examplesText(step),
          ]),
        ].join('\n');
      };
      for (const id of ['1', '2'] as const) {
        assert.doesNotMatch(
          visibleText(id),
          /\bSHA\b|rev-parse\s+HEAD|ls-remote/iu,
          `${id}: visible actions, results, output and check must not demand a manual full SHA`,
        );
      }

      assertPublishedBranchesAndExactEvidence(guides);

      const env = guideContent;
      for (const id of ['1', '2'] as const) {
        assert.doesNotMatch(
          (env.prerequisites[id] ?? []).join('\n'),
          /\bSHA\b|rev-parse\s+HEAD/iu,
          `${id}: visible prerequisites must not demand a stored full SHA`,
        );
      }
      const notes: Record<string, string> = {};
      for (const id of ['1', '2'] as const) {
        notes[id] =
          (await renderGuide(id)).match(/<p class="submission-note">([\s\S]*?)<\/p>/u)?.[1] ?? '';
      }
      assert.ok(Object.values(notes).every(Boolean), 'submissionNotes block must exist');
      for (const id of ['1', '2'] as const) {
        assert.ok(notes[id], `${id}: submission note must exist`);
        assert.doesNotMatch(
          notes[id],
          /\bSHA\b|rev-parse\s+HEAD/iu,
          `${id}: the visible submission note must not demand a manual full SHA`,
        );
      }
    },
  );
});

await test('step 3 continues the accepted step 2 result VS Code-first without a manual SHA', async (t) => {
  const guides = await loadGuides();
  const isDetails = (action: string) => action.trimStart().startsWith('<details');
  const examplesText = (step: {
    example?: { content: string };
    examples?: { content: string }[];
  }) =>
    [step.example, ...(step.examples ?? [])].map((example) => example?.content ?? '').join('\n');

  await t.test(
    'step 3 entry branches from the accepted step 2 branch in VS Code, SHA only in collapsed check',
    () => {
      const entry = guides['3'].steps[1]!;
      const visible = entry.actions.filter((action) => !isDetails(action)).join('\n');
      assert.match(visible, /VS Code/iu, 'step 3 entry must create the branch through VS Code');
      assert.match(
        visible,
        /stage-2-reset/u,
        'step 3 entry must start from the accepted step 2 branch',
      );
      assert.match(
        visible,
        /stage-3-reset-years/u,
        'step 3 entry must name the next personal branch',
      );
      assert.doesNotMatch(
        visible,
        /FULL_R2_SHA/u,
        'step 3 happy path must not demand a manual full SHA variable',
      );
      assert.doesNotMatch(
        examplesText(entry),
        /git switch -c|git cat-file|git show --stat/u,
        'step 3 entry must not show a visible terminal branch or SHA command',
      );
      assert.match(
        entry.advanced ?? '',
        /git switch -c course\/your_login\/stage-3-reset-years[ \t]*(?:\n|<|#|$)/u,
        'step 3 terminal branch alternative must live in step.advanced',
      );
    },
  );

  await t.test(
    'step 3 model prompt names the installed project skill, not a nonexistent slash command',
    () => {
      const prompt = guides['3'].steps.at(-1)!.model!.prompt;
      assert.doesNotMatch(
        prompt,
        /^\/[a-z-]+/imu,
        'the copied prompt must not start with a slash command the 1.12-generated project lacks',
      );
      assert.match(
        prompt,
        /skill[\s\S]{0,80}openspec-propose|openspec-propose[\s\S]{0,80}skill/iu,
        'the prompt must invoke the installed openspec-propose project skill by name',
      );
    },
  );

  await t.test('step 3 hands off via MR and branch, without visible SHA ceremony', () => {
    for (const id of ['3'] as const) {
      const guide = guides[id];
      const visible = [
        guide.summary,
        guide.output,
        ...guide.check,
        ...guide.steps.flatMap((step) => [
          step.title,
          step.result,
          step.trouble,
          ...step.actions.filter((action) => !isDetails(action)),
          examplesText(step),
        ]),
      ].join('\n');
      assert.doesNotMatch(
        visible,
        /SHA/u,
        `${id}: the visible route must hand off via MR and personal branch, not a manual SHA`,
      );
      assert.match(
        JSON.stringify(guide),
        /git rev-parse HEAD/u,
        `${id}: the exact commit check must stay available in collapsed help`,
      );
    }
    const handoff = guides['3'].steps.at(-1)!;
    assert.match(
      examplesText(handoff),
      /запрос <ССЫЛКА_НА_ЗАПРОС_ШАГА_3>/iu,
      'step 3 handoff receipt must name the planning request in plain Russian',
    );
    assert.match(
      JSON.stringify(handoff),
      /организатор[\s\S]{0,120}точн\p{L}* сохранённ\p{L}* верси/iu,
      'step 3 handoff must retain the organizer-requested exact saved version check',
    );
  });
});

await test('step 3 prerequisites and submission notes accept the branch and MR without a stored SHA', async () => {
  const { prerequisites } = guideContent;
  const notes: Record<string, string> = {};
  for (const id of ['3'] as const) {
    notes[id] =
      (await renderGuide(id)).match(/<p class="submission-note">([\s\S]*?)<\/p>/u)?.[1] ?? '';
  }
  assert.ok(Object.values(notes).every(Boolean), 'submissionNotes block must exist');

  for (const id of ['3'] as const) {
    const prerequisitesText = (prerequisites[id] ?? []).join('\n');
    assert.doesNotMatch(
      prerequisitesText,
      /\bSHA\b|rev-parse|полный чистый/iu,
      `${id}: visible prerequisites must not demand a stored full SHA`,
    );
    assert.match(
      prerequisitesText,
      id === '3' ? /принятый запрос/u : /MR/u,
      `${id}: prerequisites keep the accepted MR link as entry evidence`,
    );
    assert.match(
      prerequisitesText,
      /ветк/iu,
      `${id}: prerequisites keep the personal branch as entry evidence`,
    );
    assert.ok(notes[id], `${id}: submission note must exist`);
    assert.doesNotMatch(
      notes[id],
      /\bSHA\b|rev-parse/iu,
      `${id}: the submission note must not demand a manual full SHA`,
    );
  }
  assert.match(
    notes['3']!,
    /запрос в личную ветку назначения/iu,
    'step 3 submission keeps the MR into the personal base branch',
  );
  assert.match(
    notes['3']!,
    /актуальной версии — одно одобрение владельца продукта и комментарии аналитика и техлида[\s\S]*архитектор оставляет комментарий по признакам или при споре[\s\S]*приёмка ожидается/iu,
    'step 3 submission records one manager approval, reviewer comments and the conditional architect comment',
  );
  assert.match(
    notes['3']!,
    /организатор|из MR|по ссылке/iu,
    'step 3 submission leaves the exact commit to the MR link or the organizer',
  );
});
