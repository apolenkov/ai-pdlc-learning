import { guideContent } from './guide-content.ts';
import { type LearnerGuides } from './learner-guide-contract.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLearnerGuideContract, assertVsCodeCloneNames } from './learner-guide-contract.ts';
import { loadGuides } from './learner-guide-test-support.ts';

const replaceGuideText = (guide: LearnerGuides['3-star'], from: string, to: string) => {
  const copy = structuredClone(guide);
  const replace = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string') Reflect.set(value, key, item.replaceAll(from, to));
      else replace(item);
    }
  };
  replace(copy);
  return copy;
};

await test('instructional normalization preserves raw data, protected fields and code while normalizing prose and checks', async (t) => {
  const original = guideContent.stages;
  const raw = structuredClone(original);
  const guide = raw['1'];
  const step = guide.steps[0]!;
  step.title = 'Два\u00a0слова <pre>сырой\u00a0код</pre> <code>ещё\u202fкод</code>';
  guide.check = ['Проверка\u202fпрозы'];
  step.advanced = 'Продвинутый\u00a0вариант';
  step.example = { label: 'Пример', content: 'Сырой\u00a0документ' };
  step.model = { prompt: 'Сырой\u202fзапрос', does: 'Модель помогает', check: [] };
  guideContent.stages = raw;
  t.after(() => {
    guideContent.stages = original;
  });
  const snapshot = JSON.stringify(raw);
  const normalized = await loadGuides();
  assert.equal(JSON.stringify(raw), snapshot, 'normalization must not mutate raw browser data');
  assert.notEqual(normalized, raw);
  assert.equal(
    normalized['1'].steps[0]!.title,
    'Два слова <pre>сырой\u00a0код</pre> <code>ещё\u202fкод</code>',
  );
  assert.deepEqual(normalized['1'].check, ['Проверка прозы']);
  assert.deepEqual(
    [
      normalized['1'].steps[0]!.advanced,
      normalized['1'].steps[0]!.example?.content,
      normalized['1'].steps[0]!.model?.prompt,
    ],
    [step.advanced, step.example.content, step.model.prompt],
    'protected fields remain byte-for-byte unchanged',
  );
});

await test('all fifteen learner guides satisfy the continuous course contract', async () => {
  assertLearnerGuideContract(await loadGuides());
});

await test('step 2 acceptance rejects missing approval and review roles', async () => {
  for (const [from, to, expected] of [
    ['одно одобрение', 'три одобрения', /manager must give one approval/u],
    [
      'аналитик проверяет комментариями',
      'аналитик проверяет',
      /analyst and tech lead retain their separate review responsibilities/u,
    ],
    [
      'техлид — реализуемость',
      'техлид — оформление',
      /analyst and tech lead retain their separate review responsibilities/u,
    ],
    [
      'архитектор оставляет комментарий по признакам или при споре',
      'архитектор не участвует',
      /architect comments on triggers or a dispute/u,
    ],
  ] as const) {
    const guides = await loadGuides();
    assert.ok(guides['2'].summary.includes(from), 'mutation must hit the acceptance rule');
    guides['2'].summary = guides['2'].summary.replace(from, to);
    assert.throws(() => assertLearnerGuideContract(guides), expected);
  }
});

await test('step 2 teaching draft rejects damage to accepted step 1 and extra planted mistakes', async () => {
  for (const [from, to] of [
    ['Ежемесячный платёж 10 000 ₽', 'Ежемесячный платёж 11 000 ₽'],
    ['## Открытые вопросы', '## Неизвестное'],
    ['ставку 15%', 'ставку 14%'],
  ] as const) {
    const guides = await loadGuides();
    const example = guides['2'].steps[2]!.example!;
    assert.ok(
      example.content.includes(from),
      'negative control must change the intended draft text',
    );
    example.content = example.content.replace(from, to);
    assert.throws(
      () => assertLearnerGuideContract(guides),
      /step 2 draft must preserve|wrong rate/,
      'the complete shared teaching draft protects exactly the five planned mistakes',
    );
  }
});

await test('step 2 self-check rejects drift in its corrected sample and five answer rows', async () => {
  const cases = [
    ['lost accepted scenario', /\| Нулевая ставка \|[^\n]*\n/u, ''],
    ['changed accepted result', /Ежемесячный платёж 10 000 ₽/u, 'Ежемесячный платёж 11 000 ₽'],
    [
      'ninth scenario',
      /\n## Проектные замечания/u,
      '\n| Лишний сценарий | Вход | Результат |\n\n## Проектные замечания',
    ],
    ['lost answer row', /<tr><td>Пропущено<\/td>[\s\S]*?<\/tr>/u, ''],
    ['changed question', /<td>Принятое раньше<\/td>/u, '<td>Другое</td>'],
    ['lost rate correction', /Верните 16% из замысла/u, 'Верните ставку из замысла'],
    ['lost error reset', /Нет сценария сброса после ошибки/u, 'Нет сценария сброса'],
    [
      'lost accepted field correction',
      /Верните ошибку у поля срока в пятом сценарии шага 1/u,
      'Верните ошибку в пятом сценарии шага 1',
    ],
  ] as const;
  for (const [name, pattern, replacement] of cases) {
    const guides = await loadGuides();
    const step = guides['2'].steps[3]!;
    assert.match(step.trouble, pattern, `${name}: mutation must hit the intended self-check text`);
    step.trouble = step.trouble.replace(pattern, replacement);
    assert.throws(
      () => assertLearnerGuideContract(guides),
      /step 2 corrected sample|step 2 answer table/u,
      `${name}: the self-check must detect its own regression`,
    );
  }
});

await test('public guide examples do not embed a machine-specific home path', async () => {
  const guides = await loadGuides();
  guides['3-star'].steps[2]!.actions.push(
    'Прочитайте /Users/example/.agents/skills/setup-analysis-workspace/SKILL.md',
  );
  assert.throws(() => assertLearnerGuideContract(guides), /must not embed a personal home path/);
});

await test('instructional checks reject a mandatory replacement clone in step 2 or step 3', async () => {
  for (const id of ['2', '3'] as const) {
    const guides = await loadGuides();
    const entry = guides[id].steps[1]!;
    if (id === '2' && entry.example) {
      entry.example.content += '\ngit clone OTHER_STAGE_REPOSITORY';
    } else {
      assert.ok(
        entry.advanced,
        `${id}: continuous entry must keep an advanced terminal alternative`,
      );
      entry.advanced = `${entry.advanced}\ngit clone OTHER_STAGE_REPOSITORY`;
    }
    assert.throws(
      () => assertLearnerGuideContract(guides),
      /continuous entry must not require another clone/,
    );
  }
});

await test('instructional checks reject an step 3 entry that loses the VS Code route or the advanced alternative', async () => {
  const noTerminal = await loadGuides();
  const noTerminalEntry = noTerminal['3'].steps[1]!;
  noTerminalEntry.advanced = null;
  assert.throws(
    () => assertLearnerGuideContract(noTerminal),
    /advanced must carry a meaningful same-outcome alternative/,
  );

  const noVsCode = await loadGuides();
  const noVsCodeEntry = noVsCode['3'].steps[1]!;
  noVsCodeEntry.actions = noVsCodeEntry.actions.map((action) =>
    action.trimStart().startsWith('<details')
      ? action
      : action.replaceAll('VS Code', 'текстовом редакторе'),
  );
  assert.throws(() => assertLearnerGuideContract(noVsCode), /through VS Code/);

  const mainAllowed = await loadGuides();
  const mainEntry = mainAllowed['3'].steps[1]!;
  mainEntry.trouble = mainEntry.trouble.replace(
    'не подставляйте main вместо неё',
    'подставляйте main вместо неё',
  );
  assert.throws(() => assertLearnerGuideContract(mainAllowed), /substituting main/);
});

await test('instructional checks reject losing the second active Change at step 5', async () => {
  const guides = await loadGuides();
  guides['3-star'] = replaceGuideText(guides['3-star'], 'add-payment-summary', 'omitted-change');
  assert.throws(
    () => assertLearnerGuideContract(guides),
    /step 5 must preserve active add-payment-summary/,
  );
});

await test('instructional checks reject application Apply and fabricated human approvals', async () => {
  const apply = await loadGuides();
  apply['3'].steps.at(-1)!.model!.check.push('Запустите Apply');
  assert.throws(() => assertLearnerGuideContract(apply), /stop before application Apply/);
  const approval = await loadGuides();
  approval['2'].steps[6]!.model!.prompt += '\nСоздай два одобрения от имени рецензентов';
  assert.throws(() => assertLearnerGuideContract(approval), /must not fabricate human approval/);
});

await test('instructional checks reject replacing the model continuation personal MR base with main', async () => {
  const guides = await loadGuides();
  const block = guides['3'].steps.at(-1)!.model!;
  block.check = block.check.map((item) =>
    item.replace('→ base course/your_login/stage-3-reset-years', '→ base main'),
  );
  assert.throws(
    () => assertLearnerGuideContract(guides),
    /separate MR needs the personal step 3 base/,
  );
});

await test('MR checks reject changing only the actual base field', async () => {
  for (const id of ['2', '3', '3-star'] as const) {
    const guides = await loadGuides();
    const field = guides[id].steps
      .flatMap((step) => [step.example, ...(step.examples ?? [])])
      .find((example) => example && /^source(?: \(исходная ветка\))?:/mu.test(example.content));
    assert.ok(field);
    field.content = field.content.replace(/^base((?: \(целевая ветка\))?):.*$/mu, 'base$1: main');
    const expectedError =
      id === '2'
        ? /step 2 MR targets the previous personal branch inside the same fork/
        : /incorrect personal MR base field/;
    assert.throws(
      () => assertLearnerGuideContract(guides),
      expectedError,
      `${id}: changing only the base field to main must still be rejected`,
    );
  }
});

await test('instructional checks reject a visible or relocated OpenCode launch in the agent route', async () => {
  const extraLaunch = await loadGuides();
  extraLaunch['3-star'].steps[2]!.actions.push(
    'В терминале VS Code снова выполните <code>opencode</code>.',
  );
  assert.throws(
    () => assertLearnerGuideContract(extraLaunch),
    /executable OpenCode instructions live in step\.advanced|out of the visible route|collapsed advanced alternative/,
  );

  const offTerminal = await loadGuides();
  const r4OpenCode = offTerminal['3-star'].steps.find((step) =>
    step.advanced?.includes('<code>opencode</code>'),
  );
  assert.ok(r4OpenCode, 'step 5 must keep its OpenCode alternative in step.advanced');
  r4OpenCode.advanced =
    r4OpenCode.advanced?.replace('встроенный терминал', 'отдельное окно терминала') ?? null;
  assert.throws(() => assertLearnerGuideContract(offTerminal), /integrated terminal/);
});

await test('instructional checks reject terminal commands escaping the collapsed diagnostics', async () => {
  const expanded = await loadGuides();
  expanded['1'].steps[4]!.actions.push(
    '<details><summary>Через терминал</summary>' + expanded['1'].steps[4]!.advanced + '</details>',
  );
  assert.throws(
    () => assertLearnerGuideContract(expanded),
    /terminal and OpenCode variants live in advanced, not in actions/,
    'terminal diagnostics cannot be relocated from step.advanced into actions',
  );

  const inline = await loadGuides();
  inline['1'].steps[2]!.actions.push('Выполните <code>git clone example</code>.');
  assert.throws(
    () => assertLearnerGuideContract(inline),
    /clone must be paired with its VS Code action/,
    'a visible clone command needs its adjacent UI action and the learner fork URL',
  );
});

await test('step 5 checks keep clone before the project setup skill and confine OpenCode to collapsed help', async () => {
  const noOpenCode = await loadGuides();
  noOpenCode['3-star'] = replaceGuideText(noOpenCode['3-star'], 'opencode', 'missing-command');
  assert.throws(
    () => assertLearnerGuideContract(noOpenCode),
    /route entry step must contain executable OpenCode instructions in advanced|collapsed advanced alternative/,
  );

  const noSkillPrompt = await loadGuides();
  const setup = noSkillPrompt['3-star'].steps.find((step) =>
    step.title.startsWith('Подготовьте окружение навыком проекта'),
  )!;
  setup.examples = [];
  assert.throws(
    () => assertLearnerGuideContract(noSkillPrompt),
    /one full-setup prompt|project setup skill/,
  );

  const noClone = await loadGuides();
  noClone['3-star'].steps[1]!.actions = noClone['3-star'].steps[1]!.actions.map((action) =>
    action.replaceAll('Скопируйте свой форк', 'Откройте свою копию метарепозитория'),
  );
  assert.throws(() => assertLearnerGuideContract(noClone), /clone/iu);
});

await test('step 5 checks reject changed amount limits in any instruction carrying the contract', async () => {
  for (const title of [
    'Откройте задачу шага 5',
    'Обсудите требование с моделью вопросами',
    'Создайте изменение лимита суммы',
  ]) {
    const guides = await loadGuides();
    const step = guides['3-star'].steps.find((candidate) => candidate.title.startsWith(title))!;
    const carrier = [step.example, ...(step.examples ?? [])].find((example) =>
      example?.content.includes('100 000 000'),
    );
    assert.ok(carrier, `${title}: a visible message must carry the agreed amount bounds`);
    carrier.content = carrier.content.replaceAll('100 000 000', '200 000 000');
    assert.throws(() => assertLearnerGuideContract(guides), /agreed inclusive amount bounds/);
  }
});

await test('Apply prohibition applies inside ordinary sentences while explicit negation remains valid', async () => {
  for (const instruction of [
    'После проверки запусти Apply',
    'Когда всё готово, выполните Apply',
    'В терминальном окне запусти Apply',
  ]) {
    const guides = await loadGuides();
    guides['3'].steps.at(-1)!.model!.check.push(instruction);
    assert.throws(() => assertLearnerGuideContract(guides), /stop before application Apply/);
  }
  const safe = await loadGuides();
  safe['3'].steps
    .at(-1)!
    .model!.check.push(
      'После проверки не запускайте код. Не выполните Apply без отдельного разрешения.',
    );
  assert.doesNotThrow(() => assertLearnerGuideContract(safe));
});

await test('step 5 denominator uses explicit composition and does not hardcode fixed totals', async () => {
  const guides = await loadGuides();
  const fourthText = JSON.stringify(guides['3-star']);
  assert.match(
    fourthText,
    /неизменённ(?:ые|ых)\s*\+\s*заменённ(?:ые|ых)\s*\+\s*нов(?:ые|ых)\s+сценар/iu,
  );
  assert.match(
    fourthText,
    /незавершённы[ех] задач[аи]?[^.]{0,100}(?:во всех|каждого|active Changes)/iu,
  );
  assert.doesNotMatch(
    fourthText,
    /\d+\s+неизмен[а-яё]+[\s\S]{0,80}\+\s*\d+\s+замен[а-яё]+[\s\S]{0,80}\+\s*\d+\s+нов[а-яё]+[\s\S]{0,80}=\s*\d+\s+сценар/iu,
    'step 5 scenario inventory must not use a fixed quota',
  );

  for (const id of ['1', '2', '3'] as const) {
    const stageText = JSON.stringify(guides[id]);
    assert.doesNotMatch(
      stageText,
      /(\d+)\s+неизмен[а-яё]+[\s\S]{0,80}\+\s*(\d+)\s+замен[а-яё]+[\s\S]{0,80}\+\s*(\d+)\s+нов[а-яё]+[\s\S]{0,80}=\s*(\d+)\s+сценар/iu,
      `${id}: scenario composition is step 5-only`,
    );
  }
});

await test('VS Code clone names: exactly "Git: Clone" and "Clone Git Repository..." pass, near-misses fail', () => {
  const good =
    'Вызовите <strong>Git: Clone</strong> или нажмите <strong>Clone Git Repository...</strong> на стартовом экране';
  assert.doesNotThrow(() => assertVsCodeCloneNames(good, 'good'));
  const mutations = [
    good.replace('Git: Clone</strong>', 'Git: Clone Repository</strong>'),
    good.replace('Git: Clone</strong>', 'Git: Clone Git Repository</strong>'),
    good.replace('Git: Clone</strong>', 'Git: Clone (Recursive)</strong>'),
    good.replace('Clone Git Repository...', 'Clone Git Repository (Recursive)'),
    good.replace('Clone Git Repository...', 'Clone Repository'),
    good.replace('Clone Git Repository...', 'Git: Clone Git Repository'),
    good.replace('Clone Git Repository...', 'Clone Git Repository'),
    good.replace('Git: Clone</strong>', 'Git: Cloner</strong>'),
    good.replace('Git: Clone</strong>', 'Git: Clone...</strong>'),
    good.replace('Clone Git Repository...', 'Clone Git Repository...s'),
    good.replace('Clone Git Repository...', 'Re-Clone Git Repository...'),
  ];
  for (const mutation of mutations)
    assert.throws(() => assertVsCodeCloneNames(mutation, 'mutation'), Error, mutation);
});
