import assert from 'node:assert/strict';
import routeSteps from '../docs/pages/sdlc-development/guides/route-steps.json' with { type: 'json' };
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { renderStrip, STEPS } from '../docs/pages/sdlc-development/route-strip/strip.ts';
import { routeState } from '../docs/pages/sdlc-development/route-strip/model.ts';
import {
  loadGuides,
  renderGuide,
  renderedStepHtml,
  disclosureText,
} from './learner-guide-test-support.ts';

await test('legacy entry teaches the first Change, preserves the step 5 rail and separates archive from analysis', async () => {
  const html = await renderGuide('4-legacy');
  assert.equal((html.match(/<li id="step-\d+">/gu) ?? []).length, 7);
  assert.equal((html.match(/<figure class="course-figure /gu) ?? []).length, 1);
  assert.match(disclosureText(html), /Вход —[\s\S]*Выход —/u);
  const strip = renderStrip(STEPS, routeState(STEPS, '4-legacy', new Set()), '4-legacy');
  assert.match(strip, /is-current/u, 'the strip marks the current step');
  assert.match(
    strip,
    /course-route__edge--prev" href="s4-product\.html"/u,
    'the left arrow leaves the branch pair to the shared parent step 5',
  );
  assert.match(
    strip,
    /course-route__edge--next" href="d1-delivery\.html"/u,
    'the right arrow leaves the branch pair to the practicum',
  );
  const stepOne = renderedStepHtml(html, 1)!;
  assert.match(stepOne, /Главную спецификацию руками не правят — даже первую/u);
  assert.match(stepOne, /baseline-current-state[\s\S]*ADDED/u);
  const stepTwo = renderedStepHtml(html, 2)!;
  assert.match(stepTwo, /пустую[\s\S]*базу[\s\S]*OpenSpec уже подготовлен/u);
  assert.match(stepTwo, /Word[\s\S]*Сохранить как[\s\S]*обычный текст/u);
  assert.match(stepTwo, /s4-product\.html#step-02/u);
  assert.doesNotMatch(stepTwo, /openspec init/u);
  for (const component of ['payment-calculation', 'input-validation', 'calculator-screen']) {
    assert.ok(renderedStepHtml(html, 3)!.includes(component));
  }
  const archive =
    html.match(/<details class="beginner-extra" id="implementation">[\s\S]*?<\/details>/u)?.[0] ??
    '';
  assert.match(archive, /реализации нет/u);
  assert.match(
    archive,
    /разработчик или организатор[\s\S]*openspec archive baseline-current-state/u,
  );
  assert.match(archive, /не шаг курса/u);
  assert.doesNotMatch(archive, /npm run dev|архивации нет/u);
  assert.match(renderedStepHtml(html, 7)!, /href="s4-product\.html"/u);
});

await test('legacy discrepancy exercise hides six answers until troubleshooting and publishes the reviewed current state', async () => {
  const step = renderedStepHtml(await renderGuide('4-legacy'), 5)!;
  const actions = step.slice(0, step.indexOf('<details class="step-trouble">'));
  const trouble = step.slice(step.indexOf('<details class="step-trouble">'));
  const table = actions.match(/<table>[\s\S]*?<\/table>/u)?.[0] ?? '';
  assert.equal((table.match(/<tbody>[\s\S]*?<\/tbody>/u)?.[0]?.match(/<tr>/gu) ?? []).length, 6);
  assert.equal(
    (table.match(/<td>\?<\/td>/gu) ?? []).length,
    6,
    'each exercise row leaves its decision for the learner',
  );
  assert.doesNotMatch(actions, /legacy-answer-key|доработка не внедрена/u);
  const key = trouble.match(/<ol class="legacy-answer-key">[\s\S]*?<\/ol>/u)?.[0] ?? '';
  assert.equal((key.match(/<li>/gu) ?? []).length, 6);
  for (const field of ['ТЗ:', 'Confluence:', 'Наблюдения:', 'Пишем:', 'Почему:']) {
    assert.equal((key.match(new RegExp(`<strong>${field}<\\/strong>`, 'gu')) ?? []).length, 6);
  }
  assert.match(trouble, /последнее изменение страницы не показывает, когда приняли решение/u);
  assert.match(trouble, /известный дефект/u);
  assert.match(trouble, /ставк[\s\S]*100/u);
  assert.doesNotMatch(trouble, /Нулевой срок|Нулевая сумма|Замечание аналитика/u);
  assert.match(disclosureText(step), /проверьте наблюдения сами на учебном калькуляторе/iu);
  assert.match(
    step,
    /href="\.\.\/examples\/credit-calculator\.html"/u,
    'the validated 349.17 exception must link the matching baseline calculator',
  );
});

await test('legacy model review is read-only in a fresh task and human approvals apply to the current version', async () => {
  const html = await renderGuide('4-legacy');
  const draft = renderedStepHtml(html, 4)!;
  const review = renderedStepHtml(html, 6)!;
  assert.match(draft, /class="copy-example"/u);
  assert.match(draft, /только[\s\S]*openspec\/changes\/baseline-current-state/u);
  assert.match(draft, /proposal\.md/u);
  assert.match(review, /class="copy-example"/u);
  assert.match(review, /новую задачу Kilo без истории/u);
  assert.match(review, /ничего не правь/iu);
  assert.match(review, /требования без источника и источники без требований/u);
  assert.match(review, /файл[\s\S]*строк/iu);
  assert.match(review, /исходной задаче Kilo/u);
  assert.match(review, /владелец продукта[\s\S]*аналитик[\s\S]*техлид/iu);
  assert.match(review, /архитектор[\s\S]*по признакам или при споре/iu);
  assert.match(review, /Проверка моделью не считается одобрением человека/u);
  assert.doesNotMatch(html, /class="step-model"/u);
});

await test('new project entry initializes its environment and stays on the existing step 5 route', async () => {
  const html = await renderGuide('4-new');
  assert.equal((html.match(/<li id="step-\d+">/gu) ?? []).length, 6);
  assert.equal((html.match(/<figure class="course-figure /gu) ?? []).length, 1);
  assert.match(disclosureText(html), /Вход —[\s\S]*Выход —/u);
  const rail = renderStrip(STEPS, routeState(STEPS, '4-new', new Set()), '4-new');
  assert.match(rail, /course-route__edge--prev" href="s4-product\.html"/u);
  assert.match(rail, /course-route__edge--next" href="d1-delivery\.html"/u);
  assert.match(renderedStepHtml(html, 1)!, /Главную спецификацию руками не правят — даже первую/u);
  assert.match(renderedStepHtml(html, 2)!, /s4-product\.html#step-02/u);
  assert.match(disclosureText(renderedStepHtml(html, 2)!), /main[\s\S]*защищена/u);
  assert.match(
    disclosureText(renderedStepHtml(html, 2)!),
    /нужны только пункты про форк и копирование/u,
  );
  assert.match(renderedStepHtml(html, 2)!, /course\/&lt;LOGIN&gt;\/stage-4-new/u);
  const environment = renderedStepHtml(html, 3)!;
  assert.match(environment, /openspec init --tools kilocode --language ru --no-animation \./u);
  for (const file of [
    'README.md',
    'CONTEXT.md',
    'AGENTS.md',
    'intents/intent-template.md',
    'openspec/config.yaml',
  ]) {
    assert.ok(environment.includes(file), `the initialized environment exposes ${file}`);
  }
  assert.match(environment, /требований и кода не пиши/iu);
  assert.doesNotMatch(await renderGuide('4-legacy'), /openspec init/u);
  assert.doesNotMatch(
    html,
    /class="step-model"|href="[^"]*examples\/credit-calculator|\/opsx-|\/openspec-apply-change/u,
  );
});

await test('new project first Change keeps manager sources, ADDED requirements and implementation tasks open', async () => {
  const step = renderedStepHtml(await renderGuide('4-new'), 4)!;
  assert.match(step, /class="copy-example"/u);
  assert.match(step, /intents\/intent-0-monthly-payment\.md/u);
  for (const part of ['Проблема', 'Результат', 'Границы', 'Признаки успеха', 'Открытые вопросы'])
    assert.ok(step.includes(`## ${part}`), `intent 0 part ${part}`);
  const header = step.match(/# Замысел 0[\s\S]*?## Проблема/u)?.[0] ?? '';
  for (const field of ['Инициатор:', 'Владелец решения:', 'Состояние:', 'Источник:'])
    assert.ok(header.includes(field), `intent 0 header has ${field}`);
  const modelRequest =
    (await renderGuide('4-new')).match(/Подготовь окружение[\s\S]*?Покажи черновики/u)?.[0] ?? '';
  assert.ok(modelRequest, 'the copyable environment request is present');
  for (const part of ['Проблема', 'Результат', 'Границы', 'Признаки успеха', 'Открытые вопросы'])
    assert.ok(
      modelRequest.includes(`## ${part}`),
      `the environment request asks the model for ${part}`,
    );
  for (const field of ['Инициатор', 'Владелец решения', 'Состояние', 'Источник'])
    assert.ok(
      modelRequest.includes(field),
      `the environment request asks for the header field ${field}`,
    );
  assert.doesNotMatch(
    modelRequest,
    /кто просит|что болит сейчас|чего делать не будем/iu,
    'the request does not reproduce the old five questions',
  );
  assert.match(
    await renderGuide('4-new'),
    /href="p1-zachem\.html#step-04"/u,
    'the step links to the page that holds the current template',
  );
  assert.match(step, /openspec\/changes\/add-monthly-payment\//u);
  assert.match(step, /specs\/credit-calculator\/spec\.md[\s\S]*только ADDED/u);
  assert.match(step, /tasks\.md[\s\S]*открыт/iu);
  assert.match(step, /ничего вне папки изменения не меняй/iu);
  assert.match(step, /Ответы владельца продукта/u);
  for (const answer of [
    '3 000 000 ₽',
    '16%',
    '240',
    '120 000 ₽',
    '12',
    '10 000 ₽',
    '10 001 ₽',
    '5 001 ₽',
  ]) {
    assert.ok(
      disclosureText(step).includes(answer),
      `manager answer ${answer} is available to the learner`,
    );
  }
  assert.match(step, /целые рубли/u);
  assert.match(step, /ограничений суммы и срока пока нет/iu);
  assert.match(step, /ничего не хранится/iu);
  assert.match(step, /открыт[\s\S]*вопрос[\s\S]*proposal\.md/iu);
  assert.match(disclosureText(step), /design\.md не нужен[\s\S]*внешней системой/iu);
});

await test('new project review requires fresh model history and human marks before development and step 5 continuation', async () => {
  const html = await renderGuide('4-new');
  const review = renderedStepHtml(html, 5)!;
  assert.match(review, /новую задачу Kilo без истории/u);
  assert.match(review, /ADDED[\s\S]*intents\/intent-0-monthly-payment\.md[\s\S]*proposal\.md/u);
  assert.match(review, /требования без источника и вопросы без ответа/u);
  assert.match(review, /ничего не правь/iu);
  assert.match(review, /файл[\s\S]*строк/iu);
  assert.match(review, /исходной задаче Kilo/u);
  assert.match(
    review,
    /одно одобрение владельца продукта и комментарии аналитика и техлида на актуальной версии/iu,
  );
  assert.match(
    review,
    /одного Reviewer[\s\S]*Approve[\s\S]*@-упоминаниями[\s\S]*обязательные комментарии/iu,
  );
  assert.match(review, /архитектор[\s\S]*по признакам или при споре/iu);
  assert.match(review, /Проверка моделью не считается одобрением человека/u);
  const handoff =
    html.match(/<details class="beginner-extra" id="implementation">[\s\S]*?<\/details>/u)?.[0] ??
    '';
  assert.match(handoff, /После принятия · реализация и архив на этапе разработки/u);
  assert.match(handoff, /после принятия изменения[\s\S]*отдельное разрешение на код/iu);
  assert.match(handoff, /после реализации и приёмки кода[\s\S]*openspec archive/u);
  assert.doesNotMatch(html, /planning-provenance\.json|sdd-credit-calculator-product-meta/u);
  assert.match(handoff, /d1-delivery\.html/u);
  const continuation = renderedStepHtml(html, 6)!;
  assert.match(continuation, /href="s4-product\.html"/u);
  assert.match(continuation, /очистка результата при ошибке[\s\S]*лимит суммы/u);
  assert.match(continuation, /отличие от шага 5 курса только в старте/iu);
});

await test('step 2 names step 3 as course-names does, and the route has no optional branch left', async () => {
  const guides = await loadGuides();
  const plain = (text: string): string => text.replace(/[\u00a0\u202f]/gu, ' ');
  const why = guides['2'].steps.map(({ why: text }) => text ?? '').join(' ');
  const next = routeSteps.find((step) => step.id === '3')!;
  assert.ok(why.includes(`Дальше — шаг ${next.number} «${plain(next.title)}»`));
  assert.equal(
    guides['0a'].next,
    'sdd',
    'the Markdown and Git guide leads to the SDD and OpenSpec guide',
  );
  for (const [id, stage] of Object.entries(guides))
    assert.doesNotMatch(
      JSON.stringify(stage),
      /факультатив|шаг 3[^.<]{0,12}по желанию|шаг 3 выбирают/iu,
      `${id}: step 3 is no longer optional`,
    );
  for (const file of [
    'docs/pages/sdlc-development/guides/guide-data.ts',
    'docs/pages/sdlc-development/guides/examples/credit-calculator-intents/intents/clear-calculation-result.md',
  ]) {
    assert.doesNotMatch(
      await readFile(file, 'utf8'),
      /факультатив|шаг 3[^.<]{0,12}по желанию|шаг 3 выбирают/iu,
      `${file}: step 3 is no longer optional`,
    );
  }
});

await test('the team page is a five-step step 5 sub-page that does not promise paid GitLab features', async () => {
  const guides = await loadGuides();
  const team = guides['4-team'];
  assert.equal(team.steps.length, 5);
  assert.equal(guides['3'].next, '4-team');
  assert.equal(team.next, '3-star');
  const html = await renderGuide('4-team');
  const rail = renderStrip(STEPS, routeState(STEPS, '4-team', new Set()), '4-team');
  assert.match(rail, /course-route__edge--prev" href="s3-openspec\.html"/u);
  assert.match(rail, /course-route__edge--next" href="s4-product\.html"/u);
  const r4Rail = renderStrip(STEPS, routeState(STEPS, '3-star', new Set()), '3-star');
  assert.match(
    r4Rail,
    /course-route__edge--prev" href="s4-team\.html"/u,
    'step 5 leads back to the team page',
  );
  assert.match(
    r4Rail,
    /course-route__edge--next" href="s4a-new\.html"/u,
    'step 5 leads on to the first branch of the fork',
  );
  const text = html.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ');
  assert.match(text, /Maintainer и выше/u);
  assert.match(text, /в платной редакции[^.]*проверяется автоматически/iu);
  assert.match(text, /владелец продукта, аналитик, техлид/iu);
  assert.match(text, /аналитик, не автор запроса/iu);
  assert.doesNotMatch(
    text,
    /Premium|Ultimate|CODEOWNERS|тимлид/u,
    'the page names no paid tier and uses «техлид»',
  );
  const template = await readFile(
    'standards/sdlc-analysis-standard/templates/gitlab/merge_request_templates/Default.md',
    'utf8',
  );
  for (const role of ['Владелец продукта', 'Аналитик, не автор запроса', 'Техлид', 'Архитектор'])
    assert.match(template, new RegExp(role, 'u'));
  assert.match(
    template,
    /Правило ручное: GitLab CE 15\.10 не проверяет одобрение, автора и сброс одобрения — техлид сверяет перед слиянием\./u,
  );
  const example = team.steps[3]!.example?.content ?? '';
  assert.equal(
    example.trim(),
    template.trim(),
    'the template shown on the page is the file in the standard',
  );
  assert.match(html, /Default\.md/u);
  const index = await readFile('docs/pages/sdlc-development/guides/index.html', 'utf8');
  assert.match(index, /href="s4-team\.html"/u, 'the catalog links the team page');
  assert.match(
    await readFile('standards/sdlc-analysis-standard/tools/standard-cli.ts', 'utf8'),
    /merge_request_templates\/Default\.md/u,
    'doctor requires the template',
  );
});
