import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertLearnerGuideContract,
  assertVsCodeCloneNames,
  stepDisclosures,
  type LearnerGuides,
} from './learner-guide-contract.ts';
import { loadGuides, renderGuide } from './learner-guide-test-support.ts';

await test('step 5 save step leads with the VS Code route and keeps the terminal sequence in step.advanced', async () => {
  const guides = await loadGuides();
  const save = guides['3-star'].steps.find((step) => step.title.startsWith('Сохраните запрос'))!;
  const isDetails = (action: string) => action.trimStart().startsWith('<details');
  const visible = save.actions.filter((action) => !isDetails(action)).join('\n');
  assert.match(visible, /Source Control/u);
  assert.match(visible, /openspec\/changes\/limit-credit-amount/u);
  assert.match(visible, /docs\/course\/requirements-traceability\.md/u);
  assert.match(visible, /origin[^.]{0,80}ваш\p{L}* форк\p{L}*|origin[^.]{0,40}for?k/iu);
  assert.match(visible, /IMPORT_BASE_BRANCH/u);
  assert.match(visible, /Поля запроса на слияние/u);
  assert.match(visible, /принудительную отправку[^.]{0,80}(?:не|останов)/iu);
  assert.match(
    visible,
    /Stage Changes[\s\S]*В терминале:<pre><code>git add openspec\/changes\/limit-credit-amount[\s\S]*Commit[\s\S]*git commit -m[\s\S]*Push[\s\S]*git push -u origin/u,
    'the visible VS Code actions carry their adjacent terminal commands in order',
  );
  const terminal = save.advanced ?? '';
  assert.ok(terminal, 'step 5 must keep the terminal commit/push sequence in step.advanced');
  assert.match(terminal, /git add openspec\/changes\/limit-credit-amount/u);
  assert.match(terminal, /git diff --cached/u);
  assert.match(terminal, /git push -u origin course\/&lt;LOGIN&gt;\/stage-4-amount-limits/u);
  const prFields = [save.example, ...(save.examples ?? [])].find(
    (example) => example && /^source:/mu.test(example.content),
  );
  assert.ok(prFields, 'step 5 must keep the explicit MR source/base pair');
  assert.match(prFields.content, /^source: course\/<LOGIN>\/stage-4-amount-limits$/mu);
  assert.match(
    prFields.content,
    /^base: <IMPORT_BASE_BRANCH>$/mu,
    'step 5 MR must target the organizer-issued base, not a login-derived name',
  );
  const exactChecks = stepDisclosures(save).find(
    (action) => isDetails(action) && /Точные команды проверок/u.test(action),
  );
  assert.match(
    exactChecks ?? '',
    /validate limit-credit-amount --strict --store sdd-credit-calculator-product-meta/u,
    'strict Store validation must remain available in collapsed help',
  );
  assert.match(
    save.example?.content ?? '',
    /strict OpenSpec validation/u,
    'the learner must still request the validation before committing',
  );
});

await test('step 5 Explore step routes OpenSpec documentation through the canonical resources anchor', async () => {
  const html = await renderGuide('3-star');
  assert.doesNotMatch(
    html,
    /href="https:\/\/openspec\.dev\/docs"/u,
    'the bare OpenSpec docs home duplicates the curated official-sources section',
  );
  assert.match(
    html,
    /href="\.\.\/corporate-resources\.html#external-resources"[^>]*>[^<]*OpenSpec/iu,
    'the Explore step must point at the canonical official-sources anchor',
  );
});

await test('step 5 keeps REVIEW_REFERENCE in exact-check help with its pending-review meaning', async () => {
  const firstStep = (await loadGuides())['3-star'].steps[1]!;
  assert.doesNotMatch(firstStep.why ?? '', /REVIEW_REFERENCE/u);
  assert.match(
    stepDisclosures(firstStep).join('\n'),
    /REVIEW_REFERENCE<\/code>[^<]{0,240}ссылку на проверку[^<]{0,240}ожидающая проверка не (?:является|считается) одобрением/iu,
    'the exact-check help explains the source review without treating pending review as acceptance',
  );
});

await test('step 5 entry selects the issued IMPORT_BASE_BRANCH through VS Code', async () => {
  const guides = await loadGuides();
  const entry = guides['3-star'].steps[1]!;
  const isDetails = (action: string) => action.trimStart().startsWith('<details');
  const visible = entry.actions.filter((action) => !isDetails(action)).join('\n');
  const allText = `${entry.actions.join('\n')}\n${entry.advanced ?? ''}\n${[entry.example, ...(entry.examples ?? [])].map((example) => example?.content ?? '').join('\n')}`;
  assertVsCodeCloneNames(visible, 'step 5 step 1 must clone the learner fork through VS Code');
  assert.match(
    visible,
    /IMPORT_BASE_BRANCH/u,
    'step 5 step 1 must tell the learner to select the organizer-issued IMPORT_BASE_BRANCH',
  );
  assert.doesNotMatch(
    allText,
    /git clone[^<&\n]*--branch/u,
    'step 5 step 1 must not clone with --branch onto a hardcoded base',
  );
  assert.doesNotMatch(
    visible,
    /stage-4-amount-limits/u,
    'step 5 step 1 must not create the analytical work branch before setup',
  );
});

await test('step 5 keeps only the current Store workflow without retired-base prose', async () => {
  const guides = await loadGuides();
  const r4Text = JSON.stringify(guides['3-star']);
  assert.doesNotMatch(
    r4Text,
    /уже проходили шаг 5|старой базе|старого поколения|stage-4-import-base|старая personal base|старой import-base/iu,
    'step 5 must not keep prose that exists only for the retired implementation',
  );
  assert.match(
    r4Text,
    /(?:собственн\p{L}*|ваш) принят\p{L}* результат шага 3/u,
    'step 5 must keep the learner-owned accepted step 3 result entry',
  );
  assert.match(
    r4Text,
    /выданный организатором проверенный учебный комплект/u,
    'step 5 must keep the organizer-verified kit entry',
  );
});

await test('step 5 keeps technical provenance in setup evidence instead of asking learners to transcribe SHA into Jira', async () => {
  const guides = await loadGuides();
  const r4 = guides['3-star'];
  const setup = r4.steps[2]!;
  const setupPrompt = [setup.example, ...(setup.examples ?? [])]
    .map((example) => example?.content ?? '')
    .join('\n');
  assert.match(setupPrompt, /IMPORT_BASE_BRANCH/u);
  assert.match(setupPrompt, /IMPORT_BASE_SHA/u);
  assert.match(setupPrompt, /PLANNING_SHA/u);
  assert.match(setupPrompt, /SERVICE_SHA/u);
  assert.match(setupPrompt, /сравни|сверь/iu);
  assert.match(
    setupPrompt,
    /итоговом отчёте[\s\S]{0,400}фактическ\p{L}* active Changes/iu,
    'the setup prompt must require the final report to enumerate the actual active Changes from the inventory',
  );

  const visible = (step: typeof setup): string =>
    [
      ...step.actions.filter((action) => !action.trimStart().startsWith('<details')),
      step.result,
      step.example?.content ?? '',
      ...(step.examples ?? []).map((example) => example.content),
    ].join('\n');
  const jira = r4.steps[4]!;
  assert.match(visible(jira), /отчёт подготовки/iu);
  assert.doesNotMatch(visible(jira), /полный SHA|<PLANNING_SHA>|<SERVICE_SHA>|service SHA/iu);
  const finish = r4.steps[9]!;
  assert.match(visible(finish), /Source Control/u);
  assert.match(visible(finish), /запрос на слияние/u);
  assert.doesNotMatch(
    visible(finish),
    /полный SHA|head SHA|rev-parse\s+HEAD/iu,
    'the visible handoff uses the reviewed MR commit link rather than manual SHA transcription',
  );
  assert.match(
    finish.advanced ?? '',
    /git diff --cached --check[\s\S]*git commit[\s\S]*git push -u origin/u,
    'the terminal commit/publish route stays in step.advanced and targets the learner fork',
  );
  const finishHandoff = finish.actions.join('\n');
  assert.doesNotMatch(
    finishHandoff,
    /точные версии[^.]{0,80}из отчёта/iu,
    'the handoff must not claim the setup report fixes the final step 5 version',
  );
  assert.match(
    finishHandoff,
    /номер версии планирования из рассмотренного коммита MR[\s\S]*номер версии сервиса из отчёта подготовки[\s\S]*исходные закреплённые версии[\s\S]*из отчёта[\s\S]*актуальным принятым MR/iu,
    'the handoff must take the source/base/planning/service pins from the setup report and the accepted step 5 result from the merged planning MR',
  );
  assert.match(
    stepDisclosures(finish).join('\n'),
    /validate limit-credit-amount --strict --store/u,
    'the strict Store validation remains available, even if the learner delegates it to the agent',
  );
});

await test('step 5 separates the learner route from collapsed organizer instructions and has an exact-SHA fallback', async () => {
  const guides = await loadGuides();
  const entry = guides['3-star'].steps[1]!;
  const actions = [...entry.actions, ...stepDisclosures(entry)].join('\n');
  const advanced = entry.actions.join('\n');
  assert.doesNotMatch(
    entry.advanced ?? '',
    /<pre><code>git /u,
    'help points to the paired route without duplicating its commands',
  );
  const isDetails = (action: string) => action.trimStart().startsWith('<details');
  const visible = entry.actions.filter((action) => !isDetails(action)).join('\n');
  assert.match(
    actions,
    /<summary>Для организатора · архитектор или разработчик, владелец метарепозитория<\/summary>/u,
  );
  assert.match(actions, /IMPORT_BASE_BRANCH.*(?:присутствует в fork|есть в вашем форке)/iu);
  assert.match(
    visible,
    /В VS Code:[\s\S]*Git: Clone[\s\S]*В терминале:[^<]*<pre><code>git clone &lt;FORK_REPOSITORY_URL&gt;/u,
    'the clone command is paired with its VS Code action, not relegated to advanced help',
  );
  assert.match(
    visible,
    /В VS Code:[\s\S]*В терминале:<pre><code>git switch &lt;IMPORT_BASE_BRANCH&gt;/u,
    'the issued branch is selected by adjacent UI/terminal alternatives',
  );
  assert.equal(
    advanced.match(/\bgit clone\b/gu)?.length ?? 0,
    1,
    'step 5 advanced must have one clone command',
  );
  assert.match(
    advanced,
    /git clone\s+(?:&lt;FORK_REPOSITORY_URL&gt;|https:\/\/gitlab\.example\.invalid\/your_login\/ai-pdlc-learning-stage-4-requirements\.git)/u,
    'step 5 may clone only the learner fork through the advanced route',
  );
  assert.doesNotMatch(
    advanced,
    /git push\b/u,
    'step 5 entry advanced route must not publish directly to any base',
  );
  assert.match(
    actions,
    /<summary>[^<]*Точная проверка[^<]*<\/summary>[\s\S]*git switch &lt;IMPORT_BASE_BRANCH&gt;[\s\S]*git rev-parse HEAD[\s\S]*&lt;IMPORT_BASE_SHA&gt;/u,
    'the exact SHA check must live in the collapsed «Точная проверка» block on the issued branch',
  );
  assert.match(actions, /IMPORT_BASE_SHA[\s\S]{0,240}PLANNING_SHA[\s\S]{0,100}происхожд/iu);
  assert.match(
    actions,
    /origin точно равен FORK_REPOSITORY_URL[\s\S]*upstream точно равен META_REPOSITORY_URL[\s\S]*IMPORT_BASE_BRANCH отсутствует в origin[\s\S]*FETCH_HEAD с IMPORT_BASE_SHA[\s\S]*Только при совпадении[\s\S]*публикует её в origin/u,
    'organizer recovery preserves exact remotes, absent destination and exact source SHA checks',
  );
  assert.match(
    actions,
    /Любая ошибка останавливает импорт[\s\S]*существующую ветку не перезаписывают[\s\S]*в upstream не отправляют/u,
    'moving recovery to the organizer must preserve fail-closed/no-overwrite/no-upstream-write safeguards',
  );
  assert.doesNotMatch(actions, /set -eu/u, 'the learner page must not carry a shell import script');
  const r4Instructions = guides['3-star'].steps
    .flatMap((step) => [...step.actions, step.advanced ?? ''])
    .join('\n');
  const r4Commands = [...r4Instructions.matchAll(/<code>([\s\S]*?)<\/code>/gu)]
    .map(([, command]) => command ?? '')
    .join('\n');
  assert.doesNotMatch(
    r4Commands,
    /git push[^\n]*\bupstream\b|git push[^\n]*--force|git push[^\n]*\s-f(?:\s|$)/iu,
    'step 5 must never push to the organizer base or force-push',
  );
  const fallbackAction =
    stepDisclosures(entry).find(
      (action) => isDetails(action) && /ветка не скопировалась в форк/u.test(action),
    ) ?? '';
  assert.doesNotMatch(
    fallbackAction,
    /git clone|\bcd ai-pdlc-learning/u,
    'the fallback must reuse the current requirements checkout without another clone or cd',
  );
  assert.match(actions, /если[^.]{0,160}ветка[^.]{0,100}другую версию[^.]{0,100}останов/iu);
  assert.doesNotMatch(actions, /force/iu);
  const shotSources = (entry.screenshots ?? []).map((shot) => shot.src);
  assert.ok(
    !shotSources.some((src) => /github/iu.test(src)),
    'step 5 entry must not show a GitHub capture',
  );
  assert.ok(
    !shotSources.includes('assets/route-r4-vscode-two-root.png'),
    'the two-root workspace capture belongs to the step 5 setup step, not the fork entry',
  );
});

await test('step 5 organizer orientir leaves publication to the linked organizer procedure', async () => {
  const html = await renderGuide('3-star');
  const organizer =
    html.match(
      /<section class="beginner-extra beginner-extra--secondary"><h4>Для организатора[\s\S]*?<\/section>/u,
    )?.[0] ?? '';
  assert.ok(organizer, 'the collapsed organizer orientir must render on the step 5 guide');
  assert.match(
    organizer,
    /docs\/organizer-stage-4\.md/u,
    'the orientir must keep the link to the full organizer procedure',
  );
  // Every organizer command is its own block: collect them all for the orientir check.
  const snippet = [...organizer.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/gu)]
    .map((match) => match[1] ?? '')
    .join('\n');
  assert.match(snippet, /prepare-course-import\.ts stage/u);
  assert.match(snippet, /prepare-course-import\.ts verify/u);
  assert.match(snippet, /git rev-parse HEAD/u);
  assert.doesNotMatch(
    snippet,
    /git push/u,
    'in the learner checkout origin is the fork, so publishing the issued base stays in docs/organizer-stage-4.md',
  );
  const fallback =
    html.match(
      /<section class="beginner-extra beginner-extra--secondary"><h4>Только если ветка не скопировалась в форк[\s\S]*?<\/section>/u,
    )?.[0] ?? '';
  assert.match(fallback, /передайте организатору[\s\S]*IMPORT_BASE_BRANCH[\s\S]*IMPORT_BASE_SHA/u);
  assert.doesNotMatch(
    fallback,
    /git push|git fetch|set -eu/u,
    'only the organizer restores the issued base',
  );
  assert.match(fallback, /новую папку[\s\S]*Прежнюю папку оставьте как есть/u);
});

await test('step 5 organizer recovery rejects removal of each original safeguard', async () => {
  for (const safeguard of [
    'origin точно равен FORK_REPOSITORY_URL',
    'upstream точно равен META_REPOSITORY_URL',
    'IMPORT_BASE_BRANCH отсутствует в origin',
    'FETCH_HEAD с IMPORT_BASE_SHA',
    'Любая ошибка останавливает импорт',
    'существующую ветку не перезаписывают',
    'в upstream не отправляют',
  ]) {
    const guides = await loadGuides();
    const entry = guides['3-star'].steps[1]!;
    assert.ok(entry.trouble.includes(safeguard), safeguard);
    entry.trouble = entry.trouble.replace(safeguard, 'проверка удалена');
    assert.throws(
      () => assertLearnerGuideContract(guides),
      /organizer recovery|fail-closed/u,
      safeguard,
    );
  }
});

await test('step 5 setup checks reject name-only and global skill resolution', async () => {
  const nameOnly = await loadGuides();
  const select = (guides: LearnerGuides) =>
    guides['3-star'].steps.find((step) =>
      step.title.startsWith('Подготовьте окружение навыком проекта'),
    )!.examples![0]!;
  select(nameOnly).content =
    'Нужна полная подготовка окружения шага 5. Выбери skill setup-analysis-workspace по имени.';
  assert.throws(() => assertLearnerGuideContract(nameOnly), /actual Git root|project skill file/);

  const global = await loadGuides();
  select(global).content = select(global)
    .content.replace('<ABSOLUTE-GIT-ROOT>/.agents/skills', '~/.agents/skills')
    .replace('Одноимённый глобальный skill не используй.', 'Используй найденный глобальный skill.');
  assert.throws(() => assertLearnerGuideContract(global), /must select the project skill file/);
});

await test('step 5 setup checks reject automatic Store overwrite on a different root', async () => {
  const guides = await loadGuides();
  const setup = guides['3-star'].steps.find((step) =>
    step.title.startsWith('Подготовьте окружение навыком проекта'),
  )!;
  const originalTrouble = setup.trouble;
  setup.trouble = setup.trouble.replace(
    /При другой папке[^.]+повторно\./u,
    'При другом root агент автоматически выполняет unregister и регистрирует новый путь.',
  );
  assert.notEqual(
    setup.trouble,
    originalTrouble,
    'the negative control must actually replace the Store conflict instruction',
  );
  assert.throws(() => assertLearnerGuideContract(guides), /exact old\/new root confirmation/);
});

await test('step 5 setup trouble covers a stopped run whose earlier Kilo output is lost', async () => {
  const setup = (await loadGuides())['3-star'].steps.find((step) =>
    step.title.startsWith('Подготовьте окружение навыком проекта'),
  )!;
  assert.match(
    setup.trouble,
    /не переходите к созданию ветки или изменения/iu,
    'step 5 recovery must stop the learner before the branch and Change steps',
  );
  assert.match(
    setup.trouble,
    /не повторяйте запуск вслепую/iu,
    'step 5 recovery must forbid a blind retry after the stop',
  );
  assert.match(
    setup.trouble,
    /перв\p{L}* неуспешн\p{L}* команд\p{L}* и её код завершения/iu,
    'step 5 recovery must capture the first failed command and its exit status while still visible',
  );
  assert.match(
    setup.trouble,
    /вывод[^.]{0,80}Kilo[^.]{0,80}потерян[^.]{0,200}организатор\p{L}* осмотреть неизменённ\p{L}* рабочую копию и выданн\p{L}* баз\p{L}*/iu,
    'step 5 recovery must hand the unchanged checkout and issued base to the organizer when the output is lost',
  );
  assert.doesNotMatch(
    setup.trouble,
    /rev-parse|ls-remote|git status/iu,
    'step 5 recovery must not demand SHA commands from the learner',
  );
});

await test('step 5 stops when the project skill is missing or incomplete and keeps OpenCode scoped to the equipped base', async () => {
  const setup = (await loadGuides())['3-star'].steps.find((step) =>
    step.title.startsWith('Подготовьте окружение навыком проекта'),
  )!;
  const text = [...setup.actions, setup.advanced ?? ''].join('\n');
  const openCode = setup.advanced ?? '';
  assert.ok(openCode, 'the collapsed OpenCode alternative stays available');
  assert.match(
    openCode,
    /\.agents\/skills/u,
    'the OpenCode fallback must stay scoped to a base that already carries the project skill',
  );
  assert.doesNotMatch(
    openCode,
    /(?:если|когда)[^.]{0,120}без <code>\.agents\/skills|без <code>\.agents\/skills[^.]{0,80}OpenCode/iu,
    'a base missing .agents/skills must not be offered as a reason to switch to OpenCode',
  );
  assert.match(
    text,
    /(?:skill|навык)[^.]{0,20}отсутствует или неполный/iu,
    'the step must name the fail-closed stop when the skill is absent or incomplete',
  );
  assert.match(
    text,
    /смена модели[^.]{0,160}не поможет/iu,
    'the step must state that switching agents does not restore the missing skill',
  );
  const prompt = setup.examples?.[0]?.content ?? '';
  assert.match(
    prompt,
    /SKILL\.md[^.]{0,160}(?:нет|отсутств)[^.]{0,120}останов|(?:нет|отсутств)[^.]{0,80}SKILL\.md[^.]{0,120}останов/iu,
    'the copied prompt must order the agent to stop when the project skill file is absent',
  );
});

await test('step 5 rendered setup stops when an existing project skill ends before Store bootstrap', async () => {
  const html = await renderGuide('3-star');
  const start = html.indexOf('id="step-03"');
  const end = html.indexOf('id="step-04"');
  assert.ok(start >= 0 && end > start, 'step 5 setup step must render');
  const rendered = html.slice(start, end);
  const renderedText = rendered.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ');
  const helpStart = rendered.indexOf('<h4>Стоп — навык отсутствует или неполный');
  const helpEnd = rendered.indexOf('</section>', helpStart);
  assert.ok(
    helpStart >= 0 && helpEnd > helpStart,
    'the collapsed fail-closed stop block must render',
  );
  const recovery = rendered
    .slice(helpStart, helpEnd)
    .replace(/<[^>]+>/gu, ' ')
    .replace(/\s+/gu, ' ');
  assert.match(
    recovery,
    /одноимённый навык заканчивается после npm ci\s*\/\s*npm run setup[^.]{0,100}хранилище[^.]{0,100}обе подготовки/iu,
    'the rendered guide must recognize the existing skill that stops before Store/bootstrap',
  );
  assert.match(
    recovery,
    /Не переходите к следующим шагам, не меняйте модель и не повторяйте запуск вслепую/u,
    'the rendered recovery must prevent continuing, switching agents or retrying blindly',
  );
  assert.match(
    recovery,
    /новую проверенную выдачу с шестью полями[^.]{0,100}шагу 2/iu,
    'the rendered recovery must request a new handoff and restart from step 2',
  );
  assert.match(
    renderedText,
    /Используйте OpenCode, если Kilo недоступен и выданная база содержит полный \.agents\/skills\/setup-analysis-workspace/iu,
    'the rendered OpenCode alternative must require the complete project skill',
  );
});
