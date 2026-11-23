import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { guideContent } from './guide-content.ts';
import {
  assertLearnerGuideContract,
  stepDisclosures,
  visibleStepText,
} from './learner-guide-contract.ts';
import { loadGuides, renderGuide, renderedStepHtml } from './learner-guide-test-support.ts';

await test('C13 preserves branch checks before creation and scopes the step 3 alternate entry', async () => {
  const guides = await loadGuides();
  const branch = guides['2'].steps[1];
  assert.ok(branch);
  const checkIndex = branch.actions.findIndex((action) =>
    /проверьте.*stage-1-error-result.*Source Control пуст/iu.test(action),
  );
  const createIndex = branch.actions.findIndex((action) => /Create new branch/u.test(action));
  assert.ok(
    checkIndex >= 0 && createIndex > checkIndex,
    'step 1 branch and clean-tree checks precede step 2 creation',
  );
  const closing = guides['3'].steps.find(
    (step) => step.title === 'Откройте запрос на слияние (MR) и соберите одобрение',
  );
  assert.ok(closing);
  assert.ok(!closing.actions.some((action) => /stage-3-base/u.test(action)));
  assert.match(
    closing.variantB ?? '',
    /учебный образец[\s\S]*stage-3-base[\s\S]*Не приписывайте[\s\S]*8\/8/u,
  );
});

await test('step 3 explains manual planning and the handoff at each action', async () => {
  const steps = (await loadGuides())['3'].steps;
  const actions = (index: number) => visibleStepText(steps[index]!);
  assert.match(actions(1), /после создания[^.]*stage-3-reset-years/iu);
  assert.match(actions(2), /Инструкции для модели.*?\.kilo\/skills/u);
  assert.match(actions(2), /README\.md.*?замените.*?шаг 3/iu);
  assert.match(actions(3), /status.*?состояние/u);
  assert.match(actions(3), /instructions.*?подсказк/u);
  assert.match(actions(3), /создайте[\s\S]*?specs[\s\S]*?design[\s\S]*?не нужен[\s\S]*?tasks/u);
  assert.match(actions(4), /openspec\/changes\/add-reset-and-years-term\/specs\/[^< ]+\/spec\.md/u);
  assert.match(actions(4), /tasks\.md.*?- \[ \]/u);
  assert.match(actions(4), /Результат шага 2 уже принят/u);
  assert.match(actions(5), /\| Сценарий шага 2 \|/u);
  assert.match(actions(6), /выбранные правки[\s\S]*Staged Changes/u);
  assert.match(actions(8), /комментарий.*?Jira/u);
  assert.match(actions(8), /7 требований.*?23 сценария.*?12 незавершённых задач.*?8\/8/u);
});

await test('step 3 defines its working copy and uses consistent entry names', async () => {
  const steps = (await loadGuides())['3'].steps;
  assert.match(steps[0]!.actions.join(' '), /рабочую копию[^.]*папку репозитория[^.]*компьютере/u);
  assert.match(steps[1]!.advanced ?? '', /HEAD[^.]*последн[^.]*сохранённ[^.]*верси[^.]*ветк/u);
  const routeText = steps
    .slice(1)
    .flatMap((step) => [
      ...step.actions,
      step.result,
      ...[step.example, ...(step.examples ?? [])].map((example) => example?.content ?? ''),
    ])
    .join(' ');
  assert.doesNotMatch(routeText, /сквозн|поздн[ийего]|сквозного/iu);
  assert.match(steps[1]!.entryMode?.b ?? '', /отдельный старт с учебного образца/u);
  assert.match(steps[1]!.variantB ?? '', /старт с учебного образца шага 3 курса[\s\S]*?git clone/u);
  const handoff = steps.at(-1)?.example?.content ?? '';
  assert.match(handoff, /Режим входа: основной маршрут/u);
  assert.match(handoff, /вход с\s*учебного образца с(?:о)? шага 3/u);
});

await test('step 3 explains planning without the Apply jargon', async () => {
  const guide = (await loadGuides())['3'];
  assert.match(guide.summary, /реализация по задачам относятся к этапу разработки/u);
  const visible = guide.steps
    .flatMap((step) => [
      step.title,
      step.why ?? '',
      ...step.actions,
      step.result,
      step.trouble,
      step.figure?.html ?? '',
    ])
    .join(' ')
    .replace(/<code>[\s\S]*?<\/code>/gu, '');
  assert.doesNotMatch(visible, /\bApply\b/u);
});

await test('step 3 puts the first cumulative contract in ADDED when main specs are empty', async () => {
  const contract = (await loadGuides())['3'].steps[4]!;
  assert.match(
    contract.actions[0]!,
    /Папка\s*<code>openspec\/specs\/<\/code>\s*пока пуста[\s\S]*?ADDED/iu,
  );
  assert.doesNotMatch(contract.actions[0]!, /MODIFIED/u);
  assert.match(
    contract.variantB ?? '',
    /учебном образце[\s\S]*?существующая главная спецификация[^.]*MODIFIED/iu,
  );
  assert.match(
    contract.actions.join(' '),
    /7 требований и 23 сценария \(8 из шага 2 и новые\)[\s\S]*12 незавершённых задач/u,
  );
  assert.match(contract.result, /пересчётом по фактическим файлам/u);
});

await test('step 3 init creates only the OpenSpec root; native .kilo skills ship with the checkout', async () => {
  const step = (await loadGuides())['3'].steps.find(
    (item) => item.title === 'Обновите правила и подготовьте OpenSpec',
  );
  assert.ok(step);
  const text = JSON.stringify(step);
  assert.match(
    step.example?.content ?? '',
    /openspec init --tools none/u,
    'the visible init command must not generate agent tooling',
  );
  assert.doesNotMatch(text, /--tools kilocode/u, 'the false kilocode init flag must not return');
  assert.doesNotMatch(
    text,
    /\.kilocode|opsx/iu,
    'init --tools none creates no .kilocode directory and no /opsx workflow',
  );
  assert.match(text, /openspec\/config\.yaml/u, 'the init config artifact must be named');
  assert.match(text, /openspec\/specs\/\.gitkeep/u, 'the init specs placeholder must be named');
  assert.match(
    text,
    /\.kilo\/skills/u,
    'the native .kilo skills already present in the checkout must be named',
  );
  assert.match(
    text,
    /init[^.]{0,160}(?:не созда\p{L}*|не (?:меня\p{L}*|трога\p{L}*|изменя\p{L}*))|(?:не созда\p{L}*|не (?:меня\p{L}*|трога\p{L}*|изменя\p{L}*))[^.]{0,80}init/iu,
    'the step must state that init does not create or modify the checkout skills',
  );
});

await test('step 3 completion requires acceptance; pending reviews stay in troubleshooting', async () => {
  const guide = (await loadGuides())['3'];
  const { output } = guide;
  assert.match(output, /личн\p{L}* запрос/u, 'the output keeps the personal MR as the result');
  assert.match(
    output,
    /Принятое изменение[\s\S]*одобрение последней версии[\s\S]*подтвержден[оы]/iu,
    'completion requires an accepted change with current human marks',
  );
  assert.doesNotMatch(
    output,
    /приёмка[^.]*ожидается/iu,
    'a pending review cannot count as the output',
  );
  assert.match(guide.steps[7]!.trouble, /приёмка ожидается[\s\S]*шаг 3 курса не завершён/u);
});

await test('step 3 model review stages new files before reading their diff and keeps a personal MR base', async () => {
  const checks = (await loadGuides())['3'].steps.at(-1)!.model!.check.join(' ');
  assert.match(checks, /новые файлы сначала добавьте[\s\S]*staged diff/iu);
  assert.match(
    checks,
    /source course\/your_login\/payment-summary → base course\/your_login\/stage-3-reset-years/u,
  );
  assert.match(checks, /Неполученные|неполученные|ожидающ(?:ими|им)/u);
});

await test('step 3 keeps the Store transition and includes the optional model exercise locally', async () => {
  const guide = (await loadGuides())['3'];
  assert.equal(guide.next, '4-team', 'step 3 leads to the team page, which leads on to step 5');
  assert.equal((await loadGuides())['4-team'].next, '3-star');
  const html = await renderGuide('3');
  assert.doesNotMatch(html, /href="stage-[123]-ai\.html"/u);
  assert.doesNotMatch(guide.steps[4]!.actions.join(' '), /add-payment-summary/u);
  assert.match(
    guide.steps[8]!.model!.does,
    /дополнительном продолжении шага 3[\s\S]*add-payment-summary/u,
  );
  assert.match(
    guide.steps[8]!.model!.check.join(' '),
    /необязательное продолжение[\s\S]*принятого результата ручной работы на шаге 3/u,
  );
});

await test('step 3 save commands include the existing AI request, not just prose about updating it', async () => {
  const guides = await loadGuides();
  const save = guides['3'].steps.find((step) =>
    step.title.startsWith('Проверьте выбранные правки'),
  )!;
  assert.match(
    save.advanced ?? '',
    /if \[ -f ai\/request\.md \]; then git add -- ai\/request\.md; fi/u,
    'step 3 must keep the conditional ai/request.md staging command in step.advanced',
  );
  save.advanced = (save.advanced ?? '').replace(
    '<pre><code>if [ -f ai/request.md ]; then git add -- ai/request.md; fi</code></pre>',
    '',
  );
  assert.throws(
    () => assertLearnerGuideContract(guides),
    /conditionally stage the existing updated AI request/,
  );
});

await test('partial Change confirmation must be in the copied model prompt', async () => {
  const prompt = (await loadGuides())['3'].steps.at(-1)!.model!.prompt;
  assert.match(prompt, /закончи ответ и ничего не меняй, пока я явно не подтвержу/iu);
  const guides = await loadGuides();
  guides['3'].steps.at(-1)!.model!.prompt = prompt.replace(
    'закончи ответ и ничего не меняй, пока я явно не подтвержу',
    'продолжай сразу',
  );
  assert.throws(() => assertLearnerGuideContract(guides), /partial Change must wait/);
});

await test('step 3 copied model prompt preserves the complete proposal and unrounded payment contract', async () => {
  const prompt = (await loadGuides())['3'].steps.at(-1)!.model!.prompt;
  assert.match(prompt, /^В режиме Code/u);
  for (const artifact of [
    'openspec-propose',
    'proposal.md',
    'design.md',
    'tasks.md',
    'openspec/changes/add-payment-summary/specs/credit-calculator/spec.md',
  ])
    assert.ok(prompt.includes(artifact));
  assert.match(
    prompt,
    /ровно 3 требования[\s\S]*неокруглённого платежа[\s\S]*ровно 10 содержательных сценариев[\s\S]*ровно 9 незавершённых задач/u,
  );
  assert.match(prompt, /не запускай Apply, archive, sync, commit или push/u);
});

await test('step 3 commit stages no generated agent directory; only an optional OpenCode one is conditional', async () => {
  const save = (await loadGuides())['3'].steps.find((step) =>
    step.title.startsWith('Проверьте выбранные правки'),
  )!;
  const text = save.advanced ?? '';
  assert.doesNotMatch(
    text,
    /\.kilocode/u,
    'init --tools none creates no .kilocode directory; nothing must stage it',
  );
  assert.match(
    text,
    /if \[ -d \.opencode \]; then git add -- \.opencode; fi/u,
    'the OpenCode-route init directory must be staged only when init actually created it',
  );
  assert.match(
    text,
    /фактически созданн\p{L}*/iu,
    'the step must tell the learner to stage the directory init actually created',
  );
  assert.doesNotMatch(
    text,
    /--tools opencode/u,
    'the OpenCode init flag stays out of the manual step 3 route',
  );
});

await test('step 3 manual Change route shows the ordered OpenSpec cycle and each manual document fill', async () => {
  const step = (await loadGuides())['3'].steps.find(
    (item) => item.title === 'Создайте папку изменения по инструкциям',
  );
  assert.ok(step, 'the step 3 manual-Change step exists');
  const block = renderedStepHtml(await renderGuide('3'), 4);
  assert.ok(block, 'the step 3 manual-Change step renders');
  const resultAt = block.indexOf('<p class="step-result">');
  assert.ok(resultAt > 0, 'the step result is present');
  const visible = block.slice(0, resultAt);
  assert.match(
    visible,
    /openspec new change[\s\S]*openspec status --change[\s\S]*instructions proposal --change[\s\S]*proposal\.md[\s\S]*instructions specs --change[\s\S]*delta-файл[\s\S]*instructions design --change[\s\S]*design\.md[\s\S]*instructions tasks --change[\s\S]*tasks\.md/iu,
    'the visible route orders status and each manual document fill between instructions',
  );
  assert.doesNotMatch(
    visible,
    /выполняйте по одной команде[^<]*весь блок целиком не вставляйте/iu,
    'the shared copy-paste block is gone: each command sits right after its own item',
  );
  assert.match(
    step.advanced ?? '',
    /--json/u,
    'the collapsed advanced route remains the optional precise JSON variant',
  );
});

await test('GitLab examples show Fork fields, personal Source/Target and one manager approval with reviewer comments', async () => {
  const guides = await loadGuides();
  const fork = guides['1'].steps.find((step) => step.mockup?.kind === 'gitlab-fork');
  const mr = guides['2'].steps[5];
  const review = guides['2'].steps.find((step) => step.mockup?.kind === 'gitlab-review');
  assert.ok(fork && mr && review);
  assert.equal(fork.mockup?.kind, 'gitlab-fork');
  assert.deepEqual(
    fork.mockup.fields?.map(([label]) => label),
    ['Project URL (выберите namespace)', 'Project name', 'Visibility level'],
  );
  assert.equal(mr.mockup?.kind, 'gitlab-new-mr');
  assert.equal(
    mr.mockup.source,
    'demo-learner/ai-pdlc-learning-stage-1 · course/demo-learner/stage-2-reset',
  );
  assert.equal(
    mr.mockup.base,
    'demo-learner/ai-pdlc-learning-stage-1 · course/demo-learner/stage-1-error-result',
  );
  assert.equal(review.mockup?.kind, 'gitlab-review');
  assert.equal(review.mockup.reviewers?.length, 3);
  assert.equal(new Set(review.mockup.reviewers?.map(({ role }) => role)).size, 3);
  assert.equal(
    review.mockup.reviewers?.filter(({ state }) => state === 'approved').length,
    1,
    'only the manager approves; the analyst and tech lead comment',
  );
  assert.match(
    review.mockup?.caption ?? '',
    /статус Approved — у владельца продукта[\s\S]*у аналитика и техлида — комментарии/u,
  );
  for (const [id, number, labels] of [
    [
      '1',
      3,
      ['Project URL (выберите namespace)', 'Project name', 'Visibility level', 'Fork project'],
    ],
    ['2', 6, ['Merge requests → New merge request', 'Source', 'Target']],
    ['2', 7, ['Марина Образцова', 'Лада Примерова', 'Илья Макетов', 'Approved by 1']],
  ] as const) {
    const block = renderedStepHtml(await renderGuide(id), number) ?? '';
    assert.match(block, /Учебный пример · вымышленные данные/u);
    for (const label of labels) assert.ok(block.includes(label), `${id}.${number}: ${label}`);
    assert.doesNotMatch(
      block,
      /<img\b|<input\b|<select\b|<button\b[^>]*mockup/u,
      'the example uses static text and does not shadow a genuine screenshot',
    );
  }
});

await test('C16 shows a complete step 2 specification with all eight scenarios in closed independent help', async () => {
  const step = (await loadGuides())['2'].steps[3];
  assert.ok(step);
  const reference = stepDisclosures(step).find((help) =>
    /Полный образец specification.md/u.test(help),
  );
  assert.ok(reference);
  assert.equal((reference.match(/^\| (?!Сценарий|---)[^\n]+ \|$/gmu) ?? []).length, 8);
  for (const scenario of [
    'Обычная ставка',
    'Нулевая ставка',
    'Недопустимая сумма',
    'Недопустимый срок',
    'Успешный расчёт → ошибочный ввод',
    'Сброс после расчёта',
    'Сброс после ошибки',
    'Повторный сброс',
  ])
    assert.ok(reference.includes(scenario));
  assert.match(reference, /На шагах 1–3 готовятся требования/u);
  assert.doesNotMatch(reference, /open="|<details[^>]+ open\b/u);
  const block = renderedStepHtml(await renderGuide('2'), 4) ?? '';
  assert.ok(
    block.indexOf('Полный образец specification.md') > block.indexOf('<p class="step-result">'),
  );
});

await test('SDD and step 5 pages use the five-part intent, named review and acceptance roles and complete CLI commands', async () => {
  const sdd = await renderGuide('sdd');
  assert.doesNotMatch(
    sdd,
    /openspec (?:init|new|instructions|validate) /u,
    'the preparation guide needs no CLI',
  );
  for (const cmd of ['proposal', 'specs', 'tasks'])
    assert.ok(
      (await renderGuide('3')).includes(
        `openspec instructions ${cmd} --change add-reset-and-years-term`,
      ),
      `step 3 gives the ${cmd} instructions command`,
    );
  assert.match(
    sdd,
    /ревью[\s\S]*владелец продукта, аналитик, техлид[\s\S]*принятие/iu,
    'human review and acceptance are named',
  );
  const r4 = await renderGuide('3-star');
  assert.match(
    r4,
    /id="r4map-pane-intents"[\s\S]*?шапка \(инициатор, владелец решения, состояние, источник\)[\s\S]*?открытые вопросы/u,
    'the intents pane describes the header and five parts',
  );
  assert.doesNotMatch(
    r4,
    /кто просит, что болит/iu,
    'the old three-question intent description is gone',
  );
  assert.match(
    await renderGuide('4-new'),
    /шапка \(инициатор, владелец решения, состояние, источник\) и пять частей/u,
    'the glossary names the header and five parts',
  );
  for (const id of ['0', '1', '2', '3', '4-new'] as const)
    assert.doesNotMatch(
      await renderGuide(id),
      /[Вв]ладелец продукта принимает/u,
      `guide ${id} does not let the product owner accept the intent`,
    );
});

await test('one acceptance rule on the course page distinguishes manager approval from reviewer comments and the five stage pages link to it', async () => {
  const index = await readFile(
    resolve(import.meta.dirname, '../docs/pages/sdlc-development/guides/index.html'),
    'utf8',
  );
  const rule = index.match(/<p id="acceptance-rule">([\s\S]*?)<\/p>/u)?.[1];
  assert.equal(index.match(/id="acceptance-rule"/gu)?.length, 1, 'one acceptance rule');
  assert.ok(rule);
  assert.match(rule, /одно одобрение владельца продукта/u);
  assert.match(rule, /комментарии аналитика[\s\S]*техлида[\s\S]*последней версии/u);
  assert.match(rule, /Архитектор[\s\S]*производительности/u, 'architect triggers remain explicit');
  for (const id of ['2', '3', '3-star', '4-new', '4-legacy'] as const) {
    const text = JSON.stringify(guideContent.stages[id]);
    assert.ok(
      text.includes('index.html#acceptance-rule'),
      `stage ${id} links to the acceptance rule`,
    );
    assert.ok(
      !text.includes('Три отметки — это ревью'),
      `stage ${id} does not repeat the full phrase`,
    );
  }
});
