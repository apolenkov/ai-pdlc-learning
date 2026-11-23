import assert from 'node:assert/strict';
import test from 'node:test';
import { type GuideId } from './learner-guide-contract.ts';
import {
  loadGuides,
  renderGuide,
  renderedStepHtml,
  supplementSections,
  disclosureText,
  GUIDE_IDS,
  leadThenClosedLazyScreenshots,
} from './learner-guide-test-support.ts';

await test('no route step shows a GitHub screenshot: the learner platform is the team GitLab group', async () => {
  const guides = await loadGuides();
  for (const [id, guide] of Object.entries(guides)) {
    for (const step of guide.steps) {
      for (const shot of step.screenshots ?? []) {
        assert.doesNotMatch(
          shot.src,
          /github/iu,
          `${id}: step "${step.title}" still shows a GitHub capture`,
        );
      }
    }
  }
  const step = guides['2'].steps.find(
    (item) =>
      item.title ===
      'Запрос на слияние из ветки шага 2 курса в ветку шага 1 курса и замечание к строке',
  );
  assert.ok(step, 'step 2 MR step must stay even without a platform capture');
});

await test('step 2 editing step shows the visible reset diff without claiming all scenarios are pictured', async () => {
  const step = (await loadGuides())['2'].steps.find(
    (item) => item.title === 'Проверьте черновик по пяти вопросам',
  );
  assert.ok(step);
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r2-vscode-specification-diff.png',
  );
  assert.ok(shot);
  assert.match(shot.caption, /правило сброса.*начало блока сценариев/iu);
  const saveStep = (await loadGuides())['2'].steps.find(
    (item) => item.title === 'Сохраните и отправьте результат шага 2 курса',
  );
  assert.ok(saveStep);
  assert.ok(
    !saveStep.screenshots?.some((item) => item.src === shot.src),
    'the uncommitted diff cannot also stand for a saved and pushed branch',
  );
});

await test('step 2 save step shows its own staged diff before commit', async () => {
  const step = (await loadGuides())['2'].steps.find(
    (item) => item.title === 'Сохраните и отправьте результат шага 2 курса',
  );
  assert.ok(step);
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r2-vscode-staged-diff.png',
  );
  assert.ok(shot);
  assert.match(shot.caption, /перед сохранением версии/iu);
  assert.doesNotMatch(shot.caption, /опубликован|отправлен/iu);
});

await test('step 2 names the step 1 result as published, not accepted — step 1 has no human review', async () => {
  const guide = (await loadGuides())['2'];
  const stageTwo = JSON.stringify({ summary: guide.summary, entry: guide.steps[1] });
  assert.doesNotMatch(
    stageTwo,
    /принят\p{L}*(?:\s+\p{L}+){0,2}\s+шага 1\b|шаг(?:а)? 4\b[^.\n"]{0,40}принят/iu,
    'step 1 ends at a published branch without human acceptance; step 2 must not call that result accepted',
  );
  assert.match(
    stageTwo,
    /опубликованн\p{L}*(?:\s+\p{L}+){0,2}\s+ветк\p{L}* шага 1\b/iu,
    'step 2 must name the published step 1 branch as the base it continues from',
  );
});

await test('step 3 MR steps stay without a platform capture', async () => {
  const guides = await loadGuides();
  assert.ok(
    guides['3'].steps.find(
      (item) => item.title === 'Откройте запрос на слияние (MR) и соберите одобрение',
    ),
  );
});

await test('step 3 entry step shows the VS Code branch creation over the accepted step 2 result', async () => {
  const step = (await loadGuides())['3'].steps.find(
    (item) => item.title === 'Создайте свою ветку от результата шага 2 курса',
  );
  assert.ok(step);
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r3-vscode-create-branch.png',
  );
  assert.ok(shot);
  assert.match(shot.caption, /course\/demo\/stage-3-reset-years/u);
  assert.match(shot.alt, /stage-2-reset/u);
});

await test('step 3 rules step shows the authentic --tools none init capture instead of the fictional mockup', async () => {
  const step = (await loadGuides())['3'].steps.find(
    (item) => item.title === 'Обновите правила и подготовьте OpenSpec',
  );
  assert.ok(step);
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r3-vscode-init-current.jpg',
  );
  assert.ok(shot, 'the authentic --tools none init capture must fill the step screenshot slot');
  assert.match(
    shot.caption,
    /\.kilo\/skills/u,
    'the caption must name the checkout-provided Kilo skills that init did not create',
  );
  assert.equal(
    step.mockup,
    undefined,
    'the fictional init-layout mockup is retired by the authentic capture',
  );
  assert.doesNotMatch(
    JSON.stringify(step),
    /route-r3-vscode-init\.png/u,
    'the OpenCode-init capture must not be presented as the current init result',
  );
});

await test('the collapsed pre-init environment check runs no openspec command before init', async () => {
  const guide = (await loadGuides())['3'];
  const step = guide.steps.find((item) => item.title === 'Обновите правила и подготовьте OpenSpec');
  assert.ok(step);
  const preInit = step.advanced ?? '';
  assert.ok(preInit, 'the collapsed pre-init environment check is missing');
  assert.match(
    preInit,
    /node --version[\s\S]*openspec --version[\s\S]*git status --short/u,
    'the pre-init check keeps the toolchain and clean-tree probes',
  );
  assert.doesNotMatch(
    preInit,
    /openspec\s+(?:status|validate|instructions|new|list|show)\b/iu,
    'on a clean step 2 checkout there is no OpenSpec root yet; openspec commands cannot run before init',
  );
  assert.doesNotMatch(
    step.actions.join('\n'),
    /openspec\s+(?:status|validate|instructions|new|list|show)\b/iu,
    'visible actions must not run OpenSpec commands before init either',
  );
  const rendered = renderedStepHtml(await renderGuide('3'), guide.steps.indexOf(step) + 1);
  assert.ok(rendered, 'the pre-init advanced route must render within its own step');
  const preInitDisclosures = supplementSections(rendered).filter(
    (disclosure) =>
      disclosure.html.startsWith('<section class="beginner-extra"><h4>Продвинутый вариант</h4>') &&
      disclosureText(disclosure.html).includes('node --version'),
  );
  assert.equal(
    preInitDisclosures.length,
    1,
    'pre-init commands render in one advanced section in the closed supplement',
  );
  assert.doesNotMatch(
    rendered.match(/<details class="step-additional"[^>]*>/u)![0],
    /\bopen\b/u,
    'the supplement starts closed',
  );
});

await test('step 3 traceability step shows the mapping and the staged specification.md removal', async () => {
  const step = (await loadGuides())['3'].steps.find(
    (item) => item.title === 'Проверьте перенос и удалите specification.md',
  );
  assert.ok(step);
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r3-vscode-traceability.png',
  );
  assert.ok(shot);
  assert.match(shot.caption, /requirements-traceability/u);
  assert.match(shot.caption, /specification\.md/u);
});

await test('step 3 commit step shows the staged planning diff before the commit', async () => {
  const step = (await loadGuides())['3'].steps.find(
    (item) => item.title === 'Проверьте выбранные правки и сохраните версию',
  );
  assert.ok(step);
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r3-vscode-staged-diff.png',
  );
  assert.ok(shot);
  assert.match(shot.caption, /выбранных правок/iu);
  assert.doesNotMatch(shot.caption, /опубликован|отправлен|влит/iu);
  const changeStep = (await loadGuides())['3'].steps.find(
    (item) => item.title === 'Создайте папку изменения по инструкциям',
  );
  assert.ok(changeStep);
  assert.ok(
    !changeStep.screenshots?.some((item) => item.src === shot.src),
    'the staged diff capture cannot stand for the created Change step',
  );
});

await test('step 3 contract step shows the active Change spec and tasks without claiming the counts are visible', async () => {
  const step = (await loadGuides())['3'].steps.find(
    (item) => item.title === 'Соберите накопительные требования и план',
  );
  assert.ok(step);
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r3-vscode-cumulative-contract.png',
  );
  assert.ok(shot);
  assert.match(shot.caption, /add-reset-and-years-term|spec\.md и tasks\.md/iu);
  assert.match(shot.caption, /пересчётом по файлам/u);
  assert.doesNotMatch(shot.caption, /видны все|показаны все|в кадре все/iu);
});

await test('step 1 publish step shows the Publish Branch button without claiming the push happened', async () => {
  const step = (await loadGuides())['1'].steps.find((item) =>
    item.title.startsWith('Сверьте с образцом'),
  );
  assert.ok(step);
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r1-vscode-publish-branch.png',
  );
  assert.ok(shot);
  assert.match(shot.caption, /Publish Branch/u);
  assert.match(shot.caption, /не нажата/u);
  assert.doesNotMatch(shot.caption, /отправлена|опубликована|push выполнен|ветка появилась/iu);
});

await test('step 5 branch step shows the create-branch palette over the issued base without claiming creation', async () => {
  const step = (await loadGuides())['3-star'].steps.find((item) =>
    item.title.startsWith('Создайте ветку для требований'),
  );
  assert.ok(step);
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r4-vscode-create-branch.png',
  );
  assert.ok(shot);
  assert.match(shot.caption, /course\/demo\/stage-4-amount-limits/u);
  assert.match(shot.caption, /course\/qa\/stage-4-new-code-base/u);
  assert.match(shot.caption, /IMPORT_BASE_BRANCH/u);
  assert.doesNotMatch(shot.caption, /ветка создана|подготовка завершена|bootstrap пройден/iu);
});

await test('step 5 Propose step shows a one-off VS Code outcome without implying approval', async () => {
  const step = (await loadGuides())['3-star'].steps.find(
    (item) => item.title === 'Создайте изменение лимита суммы',
  );
  assert.ok(step);
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r4-vscode-propose-result.png',
  );
  assert.ok(shot);
  assert.match(shot.caption, /одноразов/iu);
  assert.match(shot.caption, /не согласован/iu);
  assert.doesNotMatch(shot.caption, /MR принят|review пройден/iu);
});

await test('Jira entry steps 1.1, 2.1 and 3.1 describe the Create Issue form in text and show no corporate frame', async () => {
  /* The public edition carries no corporate Jira capture: the form fields are described in the action text. */
  for (const [id, title] of [
    ['1', 'Вход: замысел и личная задача'],
    ['2', 'Вход: ветка шага 1 «Требования в Git» и задача в Jira'],
    ['3', 'Откройте замысел и задачу шага 3 курса'],
  ] as const) {
    const guide = (await loadGuides())[id];
    const step = guide.steps.find((item) => item.title === title);
    assert.ok(step, `${id}: entry step is missing`);
    assert.equal(
      step.screenshots?.length ?? 0,
      0,
      `${id}: no corporate Jira capture in the public edition`,
    );
    assert.equal(step.mockup, undefined, `${id}: the fictional Jira card is retired`);
    const text = step.actions.join(' ');
    assert.match(text, /проекте вашей команды/u, `${id}: the project is named generically`);
    if (id !== '2')
      assert.match(
        text,
        /Create Issue\): тип Task, заполните Summary/u,
        `${id}: the form is described in text`,
      );
    const html = await renderGuide(id);
    const block = renderedStepHtml(html, guide.steps.indexOf(step) + 1) ?? '';
    assert.doesNotMatch(block, /route-jira-create-task-form/u);
    assert.doesNotMatch(block, /step-mockup/u, `${id}: the fictional Jira card is removed`);
  }
});

await test('handoff step 2.8 shows the real GitLab merge block and 3.9 carries no platform capture', async () => {
  const guides = await loadGuides();
  for (const [id, title] of [
    ['2', 'Примите запрос и зафиксируйте выход'],
    ['3', 'Зафиксируйте передачу в шаг 5 «Контекст продукта»'],
  ] as const) {
    const step = guides[id].steps.find((item) => item.title === title);
    assert.ok(step, `${id}: handoff step is missing`);
    assert.deepEqual(
      step.screenshots?.map((shot) => shot.src),
      id === '2' ? ['assets/gitlab-mr-before-merge.png'] : undefined,
      `${id}: only a real GitLab capture may illustrate the handoff; no GitHub capture`,
    );
    assert.equal(step.mockup, undefined, `${id}: the fictional checklist is retired`);
  }
});

await test('step 3 init step renders the authentic init capture after the actions', async () => {
  const step = (await loadGuides())['3'].steps.find(
    (item) => item.title === 'Обновите правила и подготовьте OpenSpec',
  );
  assert.ok(step, 'step 3 init step is missing');
  assert.equal(step.mockup, undefined, 'the authentic capture retires the fictional checklist');
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r3-vscode-init-current.jpg',
  );
  assert.ok(shot, 'the authentic --tools none init capture is referenced');
  assert.equal(shot.width, 1152);
  assert.equal(shot.height, 768);
  assert.match(
    shot.caption,
    /\.kilo\/skills/u,
    'the caption names the checkout-provided .kilo skills that init did not create',
  );
  assert.match(
    shot.caption,
    /course\/demo\/stage-3-reset-years/u,
    'the caption discloses the demo capture branch',
  );
  assert.match(
    shot.caption,
    /не подтвержда/iu,
    'the caption disclaims the states the frame cannot prove',
  );
  assert.doesNotMatch(
    JSON.stringify(shot),
    /\.kilocode|opsx|opencode|route-r3-vscode-init\.png/iu,
    'the capture stays on the default route and never shows the retired OpenCode init',
  );
  const html = await renderGuide('3');
  const stepStart = html.indexOf('id="step-03"');
  const stepEnd = html.indexOf('id="step-04"');
  assert.ok(stepStart >= 0 && stepEnd > stepStart, 'stage-3 rendered steps are missing');
  const block = html.slice(stepStart, stepEnd);
  assert.ok(
    leadThenClosedLazyScreenshots(block),
    'the real init capture sits open lead first, the rest (if any) in a closed lazy group before the result',
  );
  const figure = block.slice(
    block.indexOf('<figure class="step-reference'),
    block.indexOf('</figure>', block.indexOf('<figure class="step-reference')) + '</figure>'.length,
  );
  assert.match(
    figure,
    /<a[^>]+href="assets\/route-r3-vscode-init-current\.jpg"/u,
    'the figure renders the authentic init capture',
  );
  assert.match(figure, /<img[^>]+\balt="[^"]+"/u, 'the capture needs a descriptive alt');
  assert.doesNotMatch(
    figure,
    /Учебный пример · вымышленные данные/u,
    'a real capture must not carry the fictional-data label',
  );
  assert.equal(
    figure.match(/screenshot-marker/gu)?.length ?? 0,
    2,
    'the two markers point to the checkout skills tree and the init-created OpenSpec root',
  );
});

await test('step 5 Jira step describes the Create Issue form in text and shows no corporate frame', async () => {
  const guides = await loadGuides();
  const steps = guides['3-star'].steps;
  const html = await renderGuide('3-star');
  const step = steps.find(
    (item) => item.title === 'Откройте задачу шага 5 «Контекст продукта» в Jira',
  );
  assert.ok(step, '3-star: the Jira step is missing');
  assert.equal(
    step.screenshots?.length ?? 0,
    0,
    '3-star: no corporate Jira capture in the public edition',
  );
  assert.equal(step.mockup, undefined, '3-star: the fictional Jira mockup is retired');
  assert.match(step.actions.join(' '), /Create Issue\): тип Task, заполните Summary/u);
  assert.ok(step.figure, '3-star: the Jira step keeps its scheme');
  assert.doesNotMatch(html, /route-jira-create-task-form/u);
});

await test('procedural steps keep captures while steps 1–2 concept steps use figures or complete text references', async () => {
  /* The evidence rule covers the seven procedural guides; the intro block is a
     concept page whose required outputs are text, not captures. */
  const guides = await loadGuides();
  /* Team GitLab group captures cannot be taken without a corporate login, and the old GitHub captures
     were removed rather than replaced by fabricated frames. These steps wait for real GitLab
     screenshots from the course owner; the list must shrink as captures arrive and must never grow. */
  const awaitingGitLabCapture = ['3 step 9: Зафиксируйте передачу в шаг 5 «Контекст продукта»'];
  const diagramSteps = new Map<GuideId, readonly string[]>([
    ['1', ['Вход: замысел и личная задача', 'Шаблон спецификации и почему он такой']],
    [
      '2',
      [
        'Запрос на слияние из ветки шага 2 курса в ветку шага 1 курса и замечание к строке',
        'Одобрение; признаки или спор — архитектор',
      ],
    ],
  ]);
  for (const [id, titles] of diagramSteps) {
    for (const title of titles) {
      const step = guides[id].steps.find((item) => item.title === title);
      assert.ok(step?.figure, `${id}: explanatory step needs a figure: ${title}`);
      assert.match(step.figure.html, /<title\b/u);
      assert.match(step.figure.html, /<desc\b/u);
    }
  }
  /* The step 5 file-map step carries no tool capture: its own interactive scheme is the evidence. */
  const schemeOnlySteps = ['3-star step 1: Карта метарепозитория: где что лежит'];
  /* The public edition carries no corporate Jira or GitLab frame: these steps describe the form or button in text. */
  const jiraTextOnlySteps = [
    '2 step 1: Вход: ветка шага 1 «Требования в Git» и задача в Jira',
    '3 step 1: Откройте замысел и задачу шага 3 курса',
    '3-star step 5: Откройте задачу шага 5 «Контекст продукта» в Jira',
    '3-star step 2: Создайте форк метарепозитория и скопируйте его через VS Code',
  ];
  const missing = GUIDE_IDS.flatMap((id) =>
    guides[id].steps.flatMap((step, index) =>
      (step.screenshots?.length ?? 0) > 0 ||
      step.mockup ||
      diagramSteps.get(id)?.includes(step.title) ||
      (step.example?.label.includes('specification.md целиком') &&
        /^# Кредитный калькулятор/u.test(step.example.content))
        ? []
        : [`${id} step ${index + 1}: ${step.title}`],
    ),
  );
  assert.deepEqual(
    [...missing].sort(),
    [...awaitingGitLabCapture, ...schemeOnlySteps, ...jiraTextOnlySteps].sort(),
    'only the named steps may lack a visible screenshot reference or marked mockup',
  );
});
