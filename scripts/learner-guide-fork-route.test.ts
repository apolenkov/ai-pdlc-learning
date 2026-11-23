import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { readGuideSource } from './guide-content.ts';
import {
  assertVsCodeCloneNames,
  stepDisclosures,
  visibleStepText,
  type LearnerGuides,
} from './learner-guide-contract.ts';
import { loadGuides, renderGuide } from './learner-guide-test-support.ts';

const assertForkSecondaryHelp = async (t: TestContext, guides: LearnerGuides) => {
  await t.test(
    'step 1 visible path leads with Fork and a VS Code clone of the learner fork',
    () => {
      const entry = guides['1'].steps.find((step) => step.mockup?.kind === 'gitlab-fork')!;
      const visible = entry.actions.filter((action) => !isDetails(action));
      const forkIndex = visible.findIndex((action) => /<strong>Fork<\/strong>/u.test(action));
      assert.ok(
        forkIndex >= 0 && forkIndex <= 1,
        'step 1 numbered route must start with the GitLab Fork',
      );
      assertVsCodeCloneNames(visible.join('\n'), 'the numbered route clones through VS Code');
      assert.match(
        entry.advanced ?? '',
        /git clone https:\/\/gitlab\.example\.invalid\/your_login\/ai-pdlc-learning-stage-1\.git/u,
        'the advanced terminal alternative must clone the learner fork',
      );
    },
  );

  await t.test(
    'step 1 visible actions carry no remote add, second remote or credential setup',
    () => {
      const visible = guides['1'].steps
        .find((step) => step.mockup?.kind === 'gitlab-fork')!
        .actions.filter((action) => !isDetails(action))
        .join('\n');
      assert.doesNotMatch(
        visible,
        /remote add|второй remote|Personal access tokens|Sign in with SAML|credential\.helper/u,
      );
    },
  );

  await t.test('step 1 requirements keep exactly five scenarios and the «Правила» label', () => {
    const edit = guides['1'].steps.find((step) => step.title.startsWith('Уточните правило'))!;
    assert.match(JSON.stringify(edit), /«ПРАВИЛА»/u);
    assert.match(JSON.stringify(edit), /всего пять сценариев/iu);
  });

  await t.test(
    'step 1 Git auth help is one collapsed secondary block linked to the canonical resource',
    () => {
      const help = stepDisclosures(
        guides['1'].steps.find((step) => step.mockup?.kind === 'gitlab-fork')!,
      ).filter((action) => isDetails(action) && /Если Git ещё не настроен/u.test(action));
      assert.equal(help.length, 1, 'step 1 entry must keep a single collapsed Git setup block');
      assert.match(
        help[0] ?? '',
        /<details class="beginner-extra beginner-extra--secondary"><summary>Если Git ещё не настроен<\/summary>/u,
      );
      assert.match(help[0] ?? '', /\.\.\/corporate-resources\.html#git/u);
      assert.match(help[0] ?? '', /останов/iu, 'unresolved Git setup must stop the learner');
      assert.doesNotMatch(
        help[0] ?? '',
        /Personal access tokens|credential\.helper|Sign in with SAML/u,
        'token and credential steps live in the canonical resource, not duplicated on the stage',
      );
    },
  );

  await t.test('step 1 fork policy stays as secondary help, not a copyable code example', () => {
    const push = guides['1'].steps.find((step) => step.title.startsWith('Сверьте с образцом'))!;
    for (const example of [push.example, ...(push.examples ?? [])]) {
      if (!example) continue;
      assert.ok(
        example.content
          .split('\n')
          .some((line) => line.trim() && !line.trimStart().startsWith('#')),
        `"${example.label}" is a comment-only block and must not be a copyable example`,
      );
    }
    const policy = stepDisclosures(push).find(
      (action) => isDetails(action) && /Остановитесь и сообщите организатору/u.test(action),
    );
    assert.ok(
      policy && /beginner-extra--secondary/u.test(policy),
      'fork-policy fallback must be collapsed secondary help',
    );
  });
};

const isDetails = (action: string) => action.trimStart().startsWith('<details');

await test('stage 1 forks first, clones the learner fork and pushes to origin', async () => {
  const guides = await loadGuides();
  const stageOne = JSON.stringify(guides['1']);
  const stageOneEntryStep = guides['1'].steps.find((step) => step.mockup?.kind === 'gitlab-fork')!;
  const stageOneEntry = stageOneEntryStep.advanced ?? '';
  const stageOnePushStep = guides['1'].steps.find((step) =>
    step.title.startsWith('Сверьте с образцом'),
  )!;
  const stageOnePush = stageOnePushStep.advanced ?? '';
  const stageOneFallback = stepDisclosures(stageOnePushStep).join('\n');
  const source = await readGuideSource();
  assert.match(stageOne, /центральн\S* учебн\S* репозитор/iu);
  assert.match(stageOne, /корпоративн\S* форк/iu);
  assert.match(stageOne, /main[^.]{0,80}защищ/iu);
  assert.match(stageOne, /course\/your_login\/\.\.\./u);
  assert.match(stageOnePush, /git push -u origin course\/your_login\/stage-1-error-result/u);
  assert.match(
    stageOne,
    /На шаге 1 курса сохраните спецификацию в своей ветке; запрос на слияние(?: \(Merge Request, MR\))? и одобрение появ(?:ится|ятся) на шаге 2 курса/u,
  );
  assert.doesNotMatch(
    stageOne,
    /запросите у автора[^.]{0,120}доступ Write|Когда Write выдан|403 Permission denied/iu,
  );
  assert.doesNotMatch(stageOne, /администратор\S*[^.]{0,120}Поленков/iu);
  assert.doesNotMatch(source, /текст обращения/iu);
  assert.doesNotMatch(stageOne, /замените origin/iu);
  assert.equal(Object.hasOwn(guides['1'], 'optionalPractice'), false);
  assert.doesNotMatch(stageOne, /New repository|git init -b main|remote add origin/u);
  assert.doesNotMatch(
    JSON.stringify(guides['1'], (key, value: unknown) => (key === 'mockup' ? undefined : value)),
    /Private/u,
    'the fictional visibility stays inside the labelled mockup and is not prescribed to the learner',
  );
  assert.match(
    stageOneEntry,
    /git clone https:\/\/gitlab\.example\.invalid\/your_login\/ai-pdlc-learning-stage-1\.git/u,
  );
  assert.doesNotMatch(stageOneEntry, /apolenkov/u);
  assert.match(stageOnePush, /git push -u origin course\/your_login\/stage-1-error-result/u);
  assert.match(
    stageOnePush,
    /git rev-parse HEAD[\s\S]*git status --short[\s\S]*git push -u origin/u,
    'the advanced route keeps the optional exact-SHA/clean-tree check and pushes only to the learner fork',
  );
  assert.doesNotMatch(
    stageOne + (await renderGuide('1')),
    /CORPORATE_FORK_URL|push_remote|fork_url|remote add fork/u,
  );
  assert.match(stageOneFallback, /Остановитесь и сообщите организатору/iu);
  assert.match(
    stageOneFallback,
    /beginner-extra--secondary/u,
    'the fork-policy fallback must render as subdued secondary help, not a copyable example',
  );
});

await test('later stages keep personal branches in one fork and push directly to origin', async () => {
  const guides = await loadGuides();
  const laterStages = JSON.stringify([guides['2'], guides['3']]);
  assert.match(laterStages, /обе личные ветки[^.]{0,160}одном корпоративном (?:fork|форке)/iu);
  assert.match(
    laterStages,
    /(?:MR|запрос\S* на слияние)[^.]{0,160}внутри[^.]{0,80}(?:fork|форка)/iu,
  );
  assert.match(laterStages, /ссылк\S*[^.]{0,80}организатор/iu);
  assert.doesNotMatch(laterStages, /Когда Write выдан/iu);
  assert.match(laterStages, /(?:force|принудительн\S* отправк\S*)[^.]{0,80}не использ/iu);
  for (const branch of ['stage-2-reset', 'stage-3-reset-years']) {
    assert.match(laterStages, new RegExp(`git push -u origin course/your_login/${branch}`, 'u'));
  }
  assert.match(laterStages, /git push -u origin course\/your_login\/stage-3-base/u);
  assert.match(
    laterStages,
    /git clone https:\/\/gitlab\.example\.invalid\/your_login\/ai-pdlc-learning-stage-2\.git/u,
  );
  assert.match(
    laterStages,
    /git clone https:\/\/gitlab\.example\.invalid\/your_login\/ai-pdlc-learning-stage-3\.git/u,
  );
  assert.doesNotMatch(
    laterStages + (await renderGuide('2')) + (await renderGuide('3')),
    /CORPORATE_FORK_URL|push_remote|fork_url|remote add fork/u,
  );
});

await test('step 1 editing names RULES, keeps five scenarios and commits through Source Control', async () => {
  const guides = await loadGuides();
  const edit = guides['1'].steps.find((step) => step.title.startsWith('Уточните правило'))!;
  const save = guides['1'].steps.find((step) => step.title.startsWith('Сверьте с образцом'))!;
  assert.match(edit.actions.join(' '), /подраздел[^.]{0,40}«ПРАВИЛА»/iu);
  assert.match(JSON.stringify(edit), /всего пять сценариев/iu);
  const isDetails = (action: string) => action.trimStart().startsWith('<details');
  const saveVisible = save.actions.filter((action) => !isDetails(action)).join('\n');
  for (const ui of ['Source Control', 'Stage Changes', 'Commit']) {
    assert.ok(saveVisible.includes(ui), `step 1 save visible route must name ${ui}`);
  }
  assert.match(
    save.advanced ?? '',
    /git add[\s\S]*git diff --cached --check[\s\S]*git commit -m/u,
    'step 1 terminal commit commands must live in the explicit advanced route',
  );
});

await test('step 2 defines repeated reset as idempotent before the learner writes scenarios', async () => {
  const guides = await loadGuides();
  const reset = guides['2'].steps.find((step) => step.title.startsWith('Проверьте черновик'))!;
  assert.match(
    JSON.stringify(reset),
    /повторный сброс[^.]{0,120}не меняет состояние[^.]{0,120}не запускает расчёт[^.]{0,120}не показывает ошибк/iu,
  );
});

await test('step 1 and step 2 keep one visible route with collapsed secondary help', async (t) => {
  const guides = await loadGuides();

  await assertForkSecondaryHelp(t, guides);

  await t.test('step 2 states repeated reset as unchanged state, no calculation, no error', () => {
    const reset = guides['2'].steps.find((step) => step.title.startsWith('Проверьте черновик'))!;
    assert.match(
      JSON.stringify(reset),
      /повторный сброс[^.]{0,120}не меняет состояние[^.]{0,120}не запускает расчёт[^.]{0,120}не показывает ошибк/iu,
    );
  });

  await t.test('step 2 separate start appears once in a collapsed secondary details block', () => {
    const entry = guides['2'].steps[1]!;
    const separate = stepDisclosures(entry).filter(
      (action) => isDetails(action) && /Отдельный старт/u.test(action),
    );
    assert.equal(separate.length, 1, 'exactly one collapsed separate-start block');
    assert.match(
      separate[0] ?? '',
      /<details class="beginner-extra beginner-extra--secondary"><summary>Отдельный старт — без результата шага 1 курса<\/summary>/u,
    );
    assert.match(
      separate[0] ?? '',
      /git clone https:\/\/gitlab\.example\.invalid\/your_login\/ai-pdlc-learning-stage-2\.git/u,
    );
    assert.match(separate[0] ?? '', /transfer\.md/u);
    const visible = entry.actions.filter((action) => !isDetails(action)).join('\n');
    assert.doesNotMatch(
      visible,
      /Отдельный старт|начинаете сразу с шага 2|эталон шага 2/iu,
      'numbered actions must not repeat the separate-start explanation',
    );
  });
});

await test('step 2 handoff keeps the learner on the accepted step 2 branch and step 3 branches from it', async () => {
  const guides = await loadGuides();
  const isDetails = (action: string) => action.trimStart().startsWith('<details');

  const close = guides['2'].steps.at(-1)!;
  const closeText = close.actions.join('\n');
  const closeVisible = close.actions.filter((action) => !isDetails(action)).join('\n');
  assert.match(
    closeVisible,
    /в той же (?:папке|checkout)/iu,
    'the visible handoff must keep the same checkout for the step 3 entry',
  );
  assert.match(
    closeVisible,
    /оставайтесь на[^.]{0,160}stage-2-reset|stage-2-reset[^.]{0,160}(?:основа|результат)[^.]{0,80}шага 3/iu,
    'the visible handoff must keep the learner on the accepted step 2 branch',
  );
  assert.match(
    closeText,
    /правки шага 2 курса приняты в личную ветку шага 1 курса <code>course\/your_login\/stage-1-error-result<\/code>/u,
    'the reviewed step 2 → step 1 merge direction stays recorded',
  );
  assert.match(
    closeText,
    /примите|Merge/iu,
    'the merge into the personal base stays gated on human reviews',
  );
  assert.doesNotMatch(
    closeText,
    /(?:git\s+(?:switch|checkout)|переключ\p{L}*)[^.\n]{0,120}stage-1-error-result|\bpull\b(?!\s*request)/iu,
    'the handoff must not switch to or pull the step 1 branch after the step 2 merge',
  );

  const entry = guides['3'].steps[1]!;
  const terminal = entry.advanced ?? '';
  assert.ok(terminal, 'step 3 entry keeps its explicit advanced alternative');
  assert.match(
    terminal,
    /git status --short --branch[\s\S]*git switch -c course\/your_login\/stage-3-reset-years[ \t]*(?:\n|<|#|$)[\s\S]*git status --short --branch/u,
    'the advanced alternative creates step 3 from the current accepted step 2 branch',
  );
  assert.doesNotMatch(
    terminal,
    /FULL_R2_SHA|\br2_sha\b|git cat-file|stage-1-error-result/u,
    'the advanced alternative drops the manual SHA ceremony and never detours through step 1',
  );
});

await test('step 2 review example covers the manager and conditional architect', async () => {
  const step = (await loadGuides())['2'].steps.find(
    (item) => item.title === 'Одобрение; признаки или спор — архитектор',
  );
  assert.ok(step, 'step 2 human-review step is missing');
  assert.equal(step.mockup?.kind, 'gitlab-review');
  assert.equal(
    step.screenshots?.length ?? 0,
    0,
    'the marked example does not shadow a real capture',
  );
  assert.match(
    step.actions.join('\n'),
    /владелец продукта одобряет последнюю версию, аналитик и техлид оставляют замечания/iu,
    'the instructions require the manager approval plus analyst and tech lead comments',
  );
  assert.match(
    visibleStepText(step),
    /бот\S*[\s\S]*предыдущ\S* версии не засчитыва/iu,
    'bot comments and approvals for an earlier diff do not count',
  );
  const html = await renderGuide('2');
  assert.match(
    html,
    /Approved by 1/u,
    'the marked GitLab example shows the single manager approval for intent 1',
  );
  assert.doesNotMatch(html, /github[^"]*\.png/iu);
});
