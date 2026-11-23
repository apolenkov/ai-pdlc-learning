import assert from 'node:assert/strict';
import test from 'node:test';
import { visibleStepText } from './learner-guide-contract.ts';
import { loadGuides, renderGuide, renderedStepHtml } from './learner-guide-test-support.ts';
import { renderStrip, STEPS } from '../docs/pages/sdlc-development/route-strip/strip.ts';
import { routeState } from '../docs/pages/sdlc-development/route-strip/model.ts';

await test('the SDD and OpenSpec guide renders six sections with results and no practice or developer handoff', async () => {
  const html = await renderGuide('sdd');
  assert.equal(
    (html.match(/<li id="step-\d{2}">/gu) ?? []).length,
    6,
    'sdd: the preparation guide must render its six sequential sections',
  );
  for (const number of [1, 2, 3, 4, 5, 6]) {
    const block = renderedStepHtml(html, number);
    assert.ok(block, `sdd: section ${number} is missing`);
    assert.ok(
      block.includes('<p class="step-result">'),
      `sdd: section ${number} must show its required result`,
    );
  }
  assert.doesNotMatch(
    html,
    /id="implementation"/u,
    'sdd: the preparation guide has no developer handoff',
  );
  assert.match(
    html,
    /href="s3-openspec\.html">шаге 3 «Изменение в OpenSpec»/u,
    'sdd: points at the step 3 practice',
  );
  assert.match(html, /Презентация целиком \(7 слайдов\)/u, 'sdd: links the full deck');
  assert.match(html, /p1-zachem\.html#step-05/u, 'sdd: lifecycle is linked, not retold');
  assert.doesNotMatch(html, /<img\b/u, 'sdd: the concept page ships no fabricated captures');
});

await test('the OpenSpec artifact map shows authors and readers before optional details', async () => {
  const html = await renderGuide('sdd');
  const map = renderedStepHtml(html, 2);
  assert.ok(map, 'sdd: artifact map is missing');
  const visible = map.split('<details')[0] ?? '';
  assert.match(
    visible,
    /proposal\.md[\s\S]*автор изменения[\s\S]*перед согласованием[\s\S]*ревью[\s\S]*техлид/iu,
  );
  assert.match(visible, /specs\/[\s\S]*аналитик[\s\S]*до реализации[\s\S]*ревью[\s\S]*техлид/iu);
  assert.match(
    visible,
    /tasks\.md[\s\S]*владелец решения[\s\S]*принимает сделанное/iu,
    'acceptance goes to the decision owner, not a nameless acceptor',
  );
  assert.doesNotMatch(visible, /Рецензент|Принимающий/u, 'no nameless roles in the file map');
  assert.match(
    visible,
    /design\.md[\s\S]*Архитектор[\s\S]*перед кодом[\s\S]*черновик может готовить модель/iu,
  );
  assert.match(visible, /tasks\.md[\s\S]*исполнитель[\s\S]*после проверки/iu);
});

await test('block 0 intent step has a third level for the reviewer and a five-point readiness list', async () => {
  const html = await renderGuide('0');
  const step = renderedStepHtml(html, 4)!;
  const reviewer = [
    ...step.matchAll(
      /<details name="level-4" class="beginner-extra beginner-extra--secondary step-level step-level--reviewer"><summary>Если вы проверяете чужой замысел<\/summary>([\s\S]*?)<\/details>/gu,
    ),
  ];
  assert.equal(reviewer.length, 1, 'one closed reviewer block in the intent step');
  assert.equal(
    [...reviewer[0]![1]!.matchAll(/<li>/gu)].length,
    5,
    'five questions, one per part of the intent',
  );
  assert.ok(
    step.indexOf('step-level--reviewer') < step.indexOf('class="step-instructions'),
    'the reviewer option precedes the actions',
  );
  assert.match(
    step,
    /Замысел готов, если:[\s\S]*<li>[\s\S]*<li>[\s\S]*<li>[\s\S]*<li>[\s\S]*<li>/u,
    'readiness list in the working level',
  );
  const reviewerPlain = reviewer[0]![1]!.replace(/<[^>]+>/gu, ' ');
  assert.match(
    reviewerPlain,
    /Результат[\s\S]*(?:пуста|только технику)/u,
    'the reviewer checks the Result part, including an empty or purely technical one',
  );
  assert.match(
    reviewerPlain,
    /Шапка полная[\s\S]*владелец решения[\s\S]*состояние/u,
    'the header check covers owner and state',
  );
  const stageOutput = (await loadGuides())['0'].output;
  assert.ok(
    html.split(stageOutput.replace(/&/gu, '&amp;')).length - 1 <= 1,
    'the working result is not repeated on the page',
  );
  assert.doesNotMatch(
    html,
    /владелец продукта принимает замысел/u,
    'the process panel names the decision owner',
  );
  assert.equal(
    html.split('step-level--reviewer"').length - 1,
    1,
    'no reviewer level in other steps',
  );
  for (const other of ['0a', '1'] as const)
    assert.doesNotMatch(
      await renderGuide(other),
      /step-level--reviewer/u,
      `guide ${other} has no reviewer level`,
    );
});

await test('introductory blocks lead with open figures and omit implementation', async () => {
  const guides = await loadGuides();
  assert.equal(guides['0'].steps.length, 7);
  const standalone = guides['0a'].steps;
  assert.ok(
    standalone[0]?.anchor === 'step-01' &&
      standalone[2]?.anchor === 'step-03' &&
      /Markdown/u.test(standalone[0].title) &&
      /Git/u.test(standalone[2].title),
    'Markdown is explained before saving the document in Git',
  );
  for (const id of ['0', '0a'] as const) {
    const html = await renderGuide(id);
    for (const [index] of guides[id].steps.entries()) {
      const step = renderedStepHtml(html, index + 1) ?? '';
      const figureAt = step.indexOf('<figure class="course-figure');
      assert.ok(
        figureAt > step.indexOf('</h3>'),
        `${id}.${index + 1}: diagram follows the heading`,
      );
      assert.ok(
        step.indexOf('<div class="step-why">') < figureAt,
        `${id}.${index + 1}: purpose precedes the diagram`,
      );
      assert.ok(figureAt < step.indexOf('<div class="step-instructions">'));
      const figure =
        step.match(/<figure class="course-figure\b[^>]*>[\s\S]*?<\/figure>/u)?.[0] ?? '';
      assert.doesNotMatch(
        figure,
        /\bhidden\b|display:\s*none/iu,
        'unenhanced panels remain visible',
      );
    }
    if (id === '0a') {
      const figure = guides[id].steps[0]!.figure!.html;
      assert.match(figure, /Файл intent\.md/u);
      assert.match(figure, /Предпросмотр/u);
      assert.doesNotMatch(figure, /data-pane=/u, 'source and preview remain visible together');
    }
    assert.doesNotMatch(html, /id="implementation"|class="platform-card/u);
    assert.doesNotMatch(html, /undefined/u, 'all new maps supply reader-facing values');
    const rail = renderStrip(STEPS, routeState(STEPS, id, new Set()), id);
    assert.match(
      rail,
      id === '0a'
        ? /course-route__edge--prev" href="p1-zachem\.html"/u
        : /course-route__edge--next" href="p2-git\.html"/u,
    );
  }
  const overview = guides['0'].steps[0]!.figure!.html;
  assert.equal((overview.match(/<svg\b/gu) ?? []).length, 1, 'one global process diagram');
  for (const label of [
    'Намерение и план',
    'Анализ требований',
    'Архитектура и дизайн',
    'Реализация',
    'Тестирование',
    'Выпуск',
    'Наблюдение',
  ])
    assert.ok(overview.includes(label));
  assert.doesNotMatch(
    overview,
    /6 передач|3 передачи|совпадают с кодом/u,
    'no unsupported efficiency or freshness promise',
  );
  assert.doesNotMatch(
    overview,
    /data-figure-pick|data-pane=/u,
    'the comparison never hides a lane',
  );
  const roles = guides['0'].steps[1]!.figure!.html;
  assert.match(roles, /data-figure-pick/u);
  assert.equal((roles.match(/data-pane=/gu) ?? []).length, 4);
  const life = guides['0'].steps[4]!.figure!.html;
  assert.match(life, /data-figure-stepper/u);
  assert.equal((life.match(/data-pane=/gu) ?? []).length, 5);
  assert.match(
    renderStrip(STEPS, routeState(STEPS, '1', new Set()), '1'),
    /course-route__edge--prev" href="p4-metarepository\.html"/u,
  );
});

await test('SDD and step 3 lead every step with a scheme and retain the human acceptance boundary', async () => {
  const guides = await loadGuides();
  for (const id of ['sdd', '3'] as const) {
    const html = await renderGuide(id);
    assert.equal(guides[id].steps.length, id === 'sdd' ? 6 : 9);
    for (const [index] of guides[id].steps.entries()) {
      const block = renderedStepHtml(html, index + 1)!;
      const diagramAt = block.indexOf('<figure class="course-figure');
      assert.ok(
        diagramAt > block.indexOf('</h3>') && diagramAt < block.indexOf('class="step-instructions'),
        `${id} step ${index + 1}: scheme precedes the action list`,
      );
    }
  }
  const life = guides['3'].steps[3]!.figure!.html;
  assert.deepEqual(
    [...life.matchAll(/data-pane="(\d+)"/gu)].map((match) => match[1]),
    ['1', '2', '3', '4', '5'],
  );
  assert.match(life, /Архивирование на шаге 3 курса запрещено/u);
  const acceptancePane = life.match(/<section[^>]*data-pane="3"[\s\S]*?<\/section>/u)?.[0] ?? '';
  for (const role of ['Владелец продукта', 'Аналитик', 'Техлид', 'Архитектор']) {
    assert.ok(acceptancePane.includes(role), `life cycle shows ${role}'s mark`);
    assert.ok(guides['3'].steps[7]!.figure!.html.includes(role), `acceptance shows ${role}'s mark`);
  }
  const acceptance = visibleStepText(guides['3'].steps[7]!);
  assert.match(
    acceptance,
    /После одобрения последней версии по правилу приёмки[\s\S]*примите правки/u,
  );
  assert.match(
    (guides['3'].roles ?? []).join(' '),
    /Нужно одобрение владельца продукта и комментарии аналитика и техлида[\s\S]*архитектор комментирует по признакам[\s\S]*или при споре/u,
  );
  assert.match(
    acceptance,
    /После каждой правки[\s\S]*одобрение владельца продукта заново на последней версии/u,
  );
  assert.match(
    guides['3'].steps[8]!.example!.content,
    /одно одобрение владельца продукта и комментарии аналитика и техлида[\s\S]*комментарий архитектора[\s\S]*приёмка ожидается/u,
  );
  const design =
    guides['3'].steps[2]!.figure!.html.match(
      /<svg[^>]*aria-labelledby="r3-design-t[\s\S]*?<\/svg>/u,
    )?.[0] ?? '';
  assert.equal((design.match(/<rect /gu) ?? []).length, 4);
  assert.doesNotMatch(design, /<path|<marker/u, 'the four independent checks have no arrows');
  for (const id of ['sdd', '3'] as const) {
    assert.doesNotMatch(await renderGuide(id), /href="stage-[123]-ai\.html"/u);
  }
  assert.match(guides['3'].steps[2]!.figure!.html, /design\.md не нужен/u);
  assert.doesNotMatch(
    JSON.stringify(guides['3']),
    /календарн|Даты учебные|r3-days/u,
    '3: days are not compared (owner decision 07.10)',
  );
  assert.ok(guides['3'].steps[8]!.model, 'the continuation is a step disclosure');
  assert.match(guides['3'].summary, /intents\/clear-calculation-result\.html/u);
  assert.doesNotMatch(
    JSON.stringify(guides),
    /intent-copy\.md|неизменяемая копия (?:интента|замысла)/u,
  );
});

await test('feedback rules for the introduction, Markdown/Git and SDD guides: words before practice, application after it', async () => {
  for (const id of ['0', '0a', 'sdd'] as const) {
    const rendered = await renderGuide(id);
    const terms = rendered.indexOf('id="course-terms"');
    const steps = rendered.indexOf('id="work-steps"');
    const application = rendered.indexOf('class="course-application"');
    const goal = rendered.slice(
      rendered.indexOf('class="lesson-goal"'),
      rendered.indexOf('class="lesson-goal__links"'),
    );
    assert.ok(terms > 0 && terms < steps, `${id}: short glossary stands before the steps`);
    assert.ok(application > steps, `${id}: where to apply it stands after the practice`);
    assert.doesNotMatch(
      goal,
      /Используйте|Где применять/u,
      `${id}: the goals block does not carry the application advice`,
    );
  }
});

await test('feedback J1–J3: own-project path in 0a, SDD rationale and validate/review/acceptance goal', async () => {
  const zeroA = await renderGuide('0a');
  assert.match(
    zeroA,
    /Create blank project[\s\S]*Project name[\s\S]*Project URL[\s\S]*Visibility level[\s\S]*Private[\s\S]*Initialize repository/u,
  );
  const sdd = await renderGuide('sdd');
  assert.match(
    sdd,
    /id="course-why"[\s\S]*proposal[\s\S]*specs[\s\S]*tasks[\s\S]*validate[\s\S]*archive/u,
  );
  assert.match(
    sdd,
    /проверяет validate[^<]*форму[^<]*ревью[^<]*владелец продукта, аналитик, техлид[^<]*принимает[^<]*владелец решения/u,
  );
  assert.match(sdd, /ревью — по <a href="index\.html#acceptance-rule">правилу приёмки<\/a>/u);
  assert.doesNotMatch(sdd, /другой аналитик/u, 'review retains all three human roles');
});

await test('feedback F1–F2: every route guide opens with a page-level «Зачем это нужно», and the intent example names the decision owner', async () => {
  const routeIds = ['1', '2', '3', '3-star', 'delivery', '4-new', '4-legacy'] as const;
  for (const id of [...routeIds, 'sdd'] as const) {
    const html = await renderGuide(id);
    const why =
      (['3-star', '4-new', '4-legacy'].includes(id)
        ? html.match(/<div id="course-why">([\s\S]*?)<\/div>[\s\S]*?<\/header>/u)
        : html.match(
            /<details class="prep-fold" id="course-why"><summary>Зачем это нужно<\/summary>([\s\S]*?)<\/details>/u,
          ))?.[1] ?? '';
    assert.match(why, /Проблема[\s\S]*Цель/u, `guide ${id}: проблема → цель`);
    assert.doesNotMatch(why, /Раньше/u, `guide ${id}: no Раньше frame`);
    if (id === 'sdd') continue; // у SDD рационал длиннее и без упоминания Git
    assert.match(why, /Git/u, `guide ${id}: why this format`);
    assert.ok(
      (why.replace(/<[^>]+>/gu, '').match(/[.!?](?:\s|$)/gu) ?? []).length <= 4,
      `guide ${id}: at most four sentences`,
    );
  }
  const stageZero = (await loadGuides())['0'];
  assert.doesNotMatch(stageZero.summary, /Раньше/u, 'guide 0: no Раньше frame in the summary');
  assert.match(
    stageZero.summary,
    /Проблема[\s\S]*Цель/u,
    'guide 0: problem and goal in the summary',
  );
  assert.doesNotMatch(
    (await loadGuides())['0a'].steps[0]!.example!.content,
    /владельцем продукта/u,
    'the introductory Markdown sample is a Git exercise, not product acceptance; later conflict resolution may name the product owner',
  );
});

await test('a resource link in the hero rationale receives the same publication markup as in the body', async () => {
  const link = '<a href="../corporate-resources.html#tools">Проверить инструменты</a>';
  const body = await renderGuide('1', (guides) => {
    guides['1'].rationale = link;
  });
  const published = body.match(/<a [^>]*>Проверить инструменты[\s\S]*?<\/a>/u)?.[0];
  assert.ok(published);
  assert.match(published, /target="_blank" rel="noopener noreferrer"/u);
  assert.match(published, /в новой вкладке/u);
  for (const id of ['3-star', '4-team', '4-new', '4-legacy'] as const) {
    const html = await renderGuide(id, (guides) => {
      guides[id].rationale = link;
    });
    assert.ok(html.split('</header>')[0]!.includes(`<div id="course-why">${published}</div>`), id);
  }
});
