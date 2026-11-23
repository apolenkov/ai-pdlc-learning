import { type GuideId } from './learner-guide-contract.ts';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { readGuideSource } from './guide-content.ts';
import { loadGuides, renderGuide, renderedStepHtml } from './learner-guide-test-support.ts';
import { renderStrip, STEPS } from '../docs/pages/sdlc-development/route-strip/strip.ts';
import { crumbItems } from '../docs/pages/sdlc-development/route-strip/crumbs.ts';
import { routeState } from '../docs/pages/sdlc-development/route-strip/model.ts';

await test('the delivery practicum renders seven role-led steps after step 5 and an archive after merge', async () => {
  const guide = (await loadGuides()).delivery;
  const html = await renderGuide('delivery');
  assert.equal((html.match(/<li id="step-\d{2}">/gu) ?? []).length, 7);
  assert.equal((html.match(/<figure class="course-figure /gu) ?? []).length, 1);
  assert.match(renderedStepHtml(html, 1)!, /Вход —[\s\S]*Выход —/u);
  for (const step of guide.steps) {
    assert.ok(
      step.actions.every((action) => /^(Разработчик|Аналитик|Вместе) —/u.test(action)),
      `${step.title}: every action identifies its owner`,
    );
    assert.equal(step.model, undefined);
    assert.equal(step.screenshots, undefined);
  }
  const rail = renderStrip(STEPS, routeState(STEPS, 'delivery', new Set()), 'delivery');
  assert.match(
    rail,
    /course-route__edge--prev" href="s4-product\.html"/u,
    'the practicum leads back past the branch fork to step 5',
  );
  assert.match(
    rail,
    /<span class="course-route__edge course-route__edge--next" role="link" aria-disabled="true"/u,
    'the last step has no next arrow',
  );
  const crumbs = crumbItems({
    home: { label: 'Карта PDLC', href: '../../' },
    step: STEPS.find((step) => step.id === 'delivery'),
  });
  assert.equal(crumbs.at(-1)?.label, 'Разработка\u00a0· Шаг\u00a07\u00a0· Практикум разработки');
  assert.match(
    renderedStepHtml(html, 2)!,
    /course\/&lt;LOGIN&gt;\/stage-4-limit-credit-amount/u,
    'the personal branch placeholder remains visible in the result',
  );
  assert.equal(guide.next, null);
  assert.doesNotMatch(html, /id="implementation"|href="#implementation"/u);
  const review = renderedStepHtml(html, 4)!;
  assert.match(review, /новую задачу Kilo без истории реализации/u);
  assert.match(review, /Ничего не правь/u);
  assert.match(review, /файлом и строкой/u);
  assert.match(renderedStepHtml(html, 5)!, /Модель одобрение не даёт/u);
  assert.match(renderedStepHtml(html, 6)!, /два MR[\s\S]*main[\s\S]*форка/u);
  const archive = renderedStepHtml(html, 7)!;
  assert.match(archive, /после слияния[\s\S]*npm exec openspec -- archive limit-credit-amount/u);
  assert.match(archive, /--skip-specs<\/code> не используйте/u);
  assert.match(
    archive,
    /Аналитик —[\s\S]*specs\/credit-calculator\/spec\.md[\s\S]*changes\/archive\//u,
  );
  assert.match(archive, /p1-zachem\.html#step-05/u);
  const catalog = await readFile('docs/pages/sdlc-development/guides/index.html', 'utf8');
  const section = catalog.slice(
    catalog.indexOf('<section id="implementation"'),
    catalog.indexOf('<section class="route-outcome" aria-labelledby="route-outcome-title"'),
  );
  assert.match(section, /class="route-open" href="d1-delivery\.html"/u);
  assert.match(section, /Практикум · этап разработки/u);
});

await test('step 5 hands off to the practicum where code-folder commands live', async () => {
  const html = await renderGuide('3-star');
  const handoffStart = html.indexOf('id="implementation"');
  assert.ok(handoffStart > -1, 'step 5 must render the implementation handoff');
  const handoff = html.slice(handoffStart);
  assert.match(handoff, /href="d1-delivery\.html"/u);
  assert.doesNotMatch(
    html,
    /(?:npm exec openspec --|openspec) list --json/u,
    'step 5 must leave code-folder checks to the practicum',
  );
  assert.match(
    renderedStepHtml(await renderGuide('delivery'), 2)!,
    /<pre><code>npm exec openspec -- list --json<\/code><\/pre>/u,
    'the practicum preparation keeps the code-folder pointer check as one command',
  );
  const beforeHandoff = html.slice(0, handoffStart);
  assert.doesNotMatch(
    beforeHandoff,
    /Показать команды из папки кода без --store/u,
    'the workspace map must not keep a separate collapsed command toggle',
  );
});

await test('every openspec status command in the handoff names --all or --change', async () => {
  for (const id of ['3', '3-star']) {
    const html = await renderGuide(id);
    const handoffStart = html.indexOf('id="implementation"');
    assert.ok(handoffStart > -1, `${id}: the implementation handoff must render`);
    const invocations = [
      ...html.slice(handoffStart).matchAll(/openspec(?:\s+--)?\s+status\b[^<\n]*/gu),
    ].map((match) => match[0]);
    assert.ok(
      invocations.length > 0,
      `${id}: the handoff must keep an openspec status inventory check`,
    );
    for (const invocation of invocations) {
      assert.match(
        invocation,
        /--(?:all|change)\b/u,
        `${id}: openspec status exits 1 without --change or --all (pinned @fission-ai/openspec@1.12.0), got: ${invocation}`,
      );
    }
  }
});

await test('the practicum preserves copied implementation instructions and delivery safeguards', async () => {
  const source = await readGuideSource();
  const guide = (await loadGuides()).delivery;
  const r4 = [
    guide.summary,
    ...guide.steps.flatMap((step) => [
      ...step.actions,
      step.example?.content ?? '',
      ...(step.examples ?? []).map((example) => example.content),
    ]),
  ].join('\n');
  for (const name of ['add-reset-and-years-term', 'add-payment-summary', 'limit-credit-amount'])
    assert.ok(r4.includes(name));
  for (const placeholder of ['REQUIREMENTS_ROOT', 'CODE_ROOT', 'PLANNING_SHA', 'SERVICE_SHA'])
    assert.ok(r4.includes(`<${placeholder}>`));
  assert.match(r4, /Разрешаю реализацию согласованного плана через Apply/u);
  assert.match(
    r4,
    /не меняй остальные файлы планирования, закреплённую версию сервиса и снимки \.workspace/u,
  );
  assert.match(r4, /tasks\.md только после подтверждения соответствующих задач проверками/u);
  assert.match(r4, /Число автотестов не равно числу сценариев/u);
  assert.match(r4, /Одобрение в MR даёт только владелец продукта и только после подтверждения/u);
  const merge = renderedStepHtml(await renderGuide('delivery'), 6)!;
  const mergeCommands = guide.steps[5]!.actions.flatMap((action) =>
    [...action.matchAll(/<pre><code>([^<]+)<\/code><\/pre>/gu)].map(([, command]) => command),
  );
  assert.deepEqual(mergeCommands, [
    'git push -u fork course/&lt;LOGIN&gt;/stage-4-limit-credit-amount',
    'git push -u origin course/&lt;LOGIN&gt;/stage-4-amount-limits',
    'git status --short',
    'git switch main',
    'git pull --ff-only fork main',
    'git rev-parse main refs/remotes/fork/main',
    'git status --short',
    'git switch main',
    'git pull --ff-only origin main',
    'git rev-parse main refs/remotes/origin/main',
  ]);
  assert.match(
    merge,
    /В GitLab: в форке кода[\s\S]*course\/&lt;LOGIN&gt;\/stage-4-limit-credit-amount → main[\s\S]*в форке требований[\s\S]*course\/&lt;LOGIN&gt;\/stage-4-amount-limits → main/u,
  );
  assert.match(merge, /Вся ветка требований включает принятое изменение/u);
  assert.match(
    merge,
    /В GitLab:[\s\S]*техлид нажимает Merge[\s\S]*В терминале: команда Git для принятия MR не нужна/u,
  );
  assert.doesNotMatch(
    r4,
    /только подтверждённое одобрение|организатор сначала подготавливает main|не разрешает merge/u,
  );
  const archiveActions = guide.steps[6]!.actions.join('\n');
  assert.match(archiveActions, /только существующие реализованные и проверенные изменения/u);
  assert.match(archiveActions, /отсутствующие Changes не создавайте/u);
  assert.match(archiveActions, /Флаг <code>--skip-specs<\/code> не используйте/u);
  assert.match(
    archiveActions,
    /В GitLab:[\s\S]*MR[\s\S]*В терминале: команда Git для создания MR не нужна/u,
  );
  assert.match(r4, /отдельные коммиты/u);
  assert.match(r4, /полный SHA каждого коммита/u);
  assert.match(r4, /сравните локальные и удалённые SHA обоих репозиториев/u);
  assert.match(r4, /сохранности всех изменений вне удаляемых папок/u);
  assert.match(r4, /неопубликованные коммиты, untracked и нужные ignored-файлы/u);
  assert.match(r4, /git worktree remove/u);
  assert.match(r4, /без force/u);
  assert.match(
    await renderGuide('delivery'),
    /Разрешаю реализацию согласованного плана через Apply/u,
    'the copied prompt must render in the practicum',
  );
  assert.doesNotMatch(
    source,
    /(?:const|let|var) implementationContinuation =/u,
    'step 5 must not keep the migrated implementation block',
  );
  for (const id of ['1', '2', '3', '3-star'])
    assert.doesNotMatch(
      await renderGuide(id),
      /Разрешаю реализацию согласованного плана через Apply/u,
    );
});

await test('practicum preparation, merge and archive keep one command per action and UI before terminal', async () => {
  const guide = (await loadGuides()).delivery;
  for (const step of [guide.steps[1]!, guide.steps[5]!, guide.steps[6]!]) {
    for (const action of step.actions) {
      const commands = [...action.matchAll(/<pre><code>([^<]+)<\/code><\/pre>/gu)].map(
        ([, command]) => command!,
      );
      assert.ok(commands.length <= 1, `${step.title}: each action has at most one command`);
      assert.ok(
        commands.every((command) => !/[\r\n]/u.test(command)),
        `${step.title}: each command occupies a single line`,
      );
      if (/В (?:GitLab|VS Code):/u.test(action))
        assert.match(action, /В (?:GitLab|VS Code):[\s\S]*В терминале:/u);
    }
  }
});

await test('model assistance preserves personal branches, existing MR and current human reviews', async () => {
  const guides = await loadGuides();
  const r1 = JSON.stringify(guides['1'].steps[4]!.model);
  assert.match(r1, /той же ветке шага 1/u);
  assert.match(r1, /разница изменилась[\s\S]*актуальную версию/u);
  const r2 = JSON.stringify(guides['2'].steps[6]!.model);
  assert.match(r2, /той же ветке шага 2[\s\S]*существующий запрос/u);
  assert.match(
    r2,
    /владелец продукта заново ставит одобрение, аналитик и техлид — комментарии к актуальной версии/u,
  );
  assert.match(r2, /Модель одобрение не даёт/u);
  assert.match(r2, /неверной целевой ветке[\s\S]*остановитесь[\s\S]*запишите как «ожидает»/u);
  for (const id of ['1', '2'] as const)
    assert.doesNotMatch(
      JSON.stringify(guides[id].steps),
      /пустой коммит не нужен/u,
      `${id}: no negation without a risk`,
    );
});

await test('step 5 renders the optional developer handoff as a collapsed full-width card after self-check', async () => {
  const r4 = await renderGuide('3-star');
  const checklist =
    r4.match(
      /<section class="card"><h2(?: id="lesson-check")?>Финальная самопроверка<\/h2>[\s\S]*?<\/section>/u,
    )?.[0] ?? '';
  assert.ok(checklist, 'step 5 self-check card must exist');
  assert.doesNotMatch(
    checklist,
    /id="implementation"/u,
    'step 5 handoff must not be nested inside the self-check card',
  );
  assert.match(
    r4,
    /<details class="card card--wide beginner-extra" id="implementation"><summary>Передача разработчику после принятия изменения<\/summary>/u,
    'step 5 handoff must be a collapsed full-width card with the approved optional label',
  );
  assert.doesNotMatch(
    r4,
    /<details class="card card--wide beginner-extra" id="implementation"[^>]*\bopen\b/u,
    'step 5 handoff must stay collapsed',
  );
  assert.ok(
    r4.indexOf('Финальная самопроверка') < r4.indexOf('id="implementation"') &&
      r4.indexOf('id="implementation"') < r4.indexOf('Роли, ограничения и справки'),
    'step 5 handoff must sit between the self-check card and the roles reference card',
  );

  const base = await renderGuide('3');
  const baseChecklist =
    base.match(
      /<section class="card"><h2(?: id="lesson-check")?>Финальная самопроверка<\/h2>[\s\S]*?<\/section>/u,
    )?.[0] ?? '';
  assert.match(
    baseChecklist,
    /<details class="beginner-extra" id="implementation"><summary>Как передать в разработку · после принятия изменения<\/summary>/u,
    'other stages keep the handoff collapsed inside the self-check card',
  );
});

await test('step 5 keeps two kit folders and distinguishes its combined Store from the working model', async () => {
  const render = async (id: string): Promise<string> => {
    const page = await renderGuide(id);
    const start = page.indexOf('<section class="card card--wide workspace-map"');
    if (start < 0) return '';
    const end = page.indexOf('<nav class="step-toc"', start);
    assert.ok(end > start, 'workspace map must render before the step table of contents');
    return page.slice(start, end);
  };
  const html = await render('3-star');
  assert.match(html, /<figure class="workspace-map__figure">/u);
  assert.match(
    html,
    /<h3 id="planning-folder-title"><code>ai-pdlc-learning-stage-4-requirements<\/code><\/h3>/u,
  );
  assert.match(
    html,
    /<h3 id="code-folder-title"><code>ai-pdlc-learning-stage-4-code<\/code><\/h3>/u,
  );
  assert.doesNotMatch(html, />Папка (?:требований|кода)</u);
  assert.match(html, /ai-pdlc-learning-stage-4-requirements\//u);
  assert.match(html, /ai-pdlc-learning-stage-4-code\//u);
  assert.match(html, /снимки только для чтения/u);
  assert.match(
    html,
    /организатор — архитектор, техлид или разработчик/u,
    'the workspace map must name the organizer roles that prepare the kit',
  );
  assert.match(
    html,
    /редактируемый корень требований/u,
    'the visible map must define the requirements repository as the editable openspec/ root',
  );
  assert.equal((html.match(/class="workspace-map__folder"/gu) ?? []).length, 2);
  assert.match(html, /совмещённый учебный Store-пример/u);
  assert.match(html, /Третью папку для этого комплекта создавать не нужно/u);
  assert.match(
    html,
    /Историческое имя Store <code>sdd-credit-calculator-product-meta<\/code>[\s\S]*не объединяет meta-repo и Store в рабочей модели/u,
    'the combined kit is an explicit exception, not the definition of meta-repo',
  );
  assert.match(
    html,
    /строка <code>store:<\/code>[\s\S]*имя зарегистрированного Store; его корень — выданная рабочая копия требований с папкой <code>openspec\/<\/code>/iu,
    'the configured Store name resolves to the editable requirements checkout',
  );
  assert.match(
    html,
    /правите только (?:планирование|требования)/iu,
    'the visible map must limit the analyst to planning edits',
  );
  assert.match(
    html,
    /задачи реализации (?:остаются|не)\s*неотмечен|не отмечаем задачи реализации/iu,
    'the visible map must keep implementation tasks unchecked in step 5',
  );
  assert.match(
    html,
    /код[\s\S]{0,120}(?:читаете|как контекст)/iu,
    'the visible map must frame the pinned service code as read-only context',
  );
  assert.doesNotMatch(
    html,
    /<details/u,
    'the visible map must not keep a separate collapsed command block; commands belong to the handoff',
  );
  assert.doesNotMatch(
    html,
    /workspace-map__flow|Изменить код|Отметить выполненные задачи/iu,
    'the implementation cycle must not be visible in the analyst-facing map',
  );
  assert.match(
    html,
    /href="#implementation"/u,
    'the visible map must point at the collapsed implementation handoff',
  );
  const page = await renderGuide('3-star');
  assert.ok(
    page.indexOf('id="workspace-map"') < page.indexOf('<nav class="step-toc"') &&
      page.indexOf('<nav class="step-toc"') < page.indexOf('id="work-steps"'),
    'workspace map precedes the table of contents and work steps',
  );
  for (const id of ['1', '2', '3']) assert.equal(await render(id), '');
});

await test('step 5 workspace map explains the metarepository term before the first step uses it', async () => {
  const html = await renderGuide('3-star');
  const mapStart = html.indexOf('id="workspace-map"');
  const stepOne = html.indexOf('id="step-01"');
  assert.ok(mapStart > -1 && stepOne > mapStart, 'the workspace map must render before step 1');
  const visibleMap = html.slice(mapStart, stepOne);
  assert.doesNotMatch(visibleMap, /<details/u, 'the map carries no collapsed blocks');
  assert.match(
    visibleMap,
    /метарепозиторий/iu,
    'the visible map must explain метарепозиторий before step-01 names it',
  );
  assert.match(
    visibleMap,
    /метарепозиторий <code>product-meta<\/code> хранит контекст, ссылки и <code>services\.lock\.yaml<\/code>, а отдельный Store <code>product-specs<\/code> — требования и изменения OpenSpec/u,
    'the working model separates the context metarepository from the requirements Store',
  );
});

await test('step 5 keeps the map before its steps and moves the developer cycle to the practicum', async () => {
  const html = await renderGuide('3-star');
  const mapStart = html.indexOf('id="workspace-map"');
  const stepsStart = html.indexOf('id="work-steps"');
  assert.ok(
    mapStart > -1 && stepsStart > mapStart,
    'rendered step 5 must keep the map before the steps',
  );
  const visibleMap = html.slice(mapStart, stepsStart);
  assert.doesNotMatch(
    visibleMap,
    /Изменить код|Отметить выполненные задачи|workspace-map__flow|<details/iu,
    'the analyst-facing map must not carry the developer implementation flow or extra toggles',
  );

  const handoffStart = html.indexOf('id="implementation"');
  assert.ok(handoffStart > -1, 'step 5 must render the collapsed implementation handoff');
  assert.match(html.slice(handoffStart), /href="d1-delivery\.html"/u);
  assert.doesNotMatch(
    html.slice(handoffStart),
    /Как работает реализация|store: sdd-credit-calculator-product-meta/u,
  );
  const handoff = await renderGuide('delivery');
  assert.match(
    handoff,
    /Как работает реализация/u,
    'the implementation cycle must live in the practicum',
  );
  assert.match(
    handoff,
    /Прочитать требования[\s\S]*Изменить код[\s\S]*Отметить выполненные задачи/u,
    'the developer implementation flow must sit in the practicum',
  );
  assert.match(
    handoff,
    /сесси\p{L}* агента|сессию в папке кода/iu,
    'the developer session paragraph must sit in the practicum',
  );
  assert.match(handoff, /store: sdd-credit-calculator-product-meta/u);
  const preparation = (await loadGuides()).delivery.steps[1]!.actions;
  const pointerCommands = preparation.flatMap((action) =>
    [...action.matchAll(/<pre><code>(npm exec openspec -- [^<]+)<\/code><\/pre>/gu)].map(
      ([, command]) => command,
    ),
  );
  assert.deepEqual(
    pointerCommands,
    [
      'npm exec openspec -- list --json',
      'npm exec openspec -- status --change limit-credit-amount --json',
    ],
    'separate code-folder checks use the configured Store, without an explicit --store',
  );
  assert.match(handoff, /npm exec openspec/u);
  assert.doesNotMatch(handoff, /<pre><code>openspec /u, 'all CLI actions use project OpenSpec');
  assert.match(preparation.join('\n'), /Если изменение отсутствует, остановитесь/u);
  assert.match(handoff, /root\.source: declared/u);
  assert.match(handoff, /не запускает Apply/u);
  assert.match(handoff, /Переносить или удалять старые требования для нового комплекта не нужно/u);
  assert.match(
    handoff,
    /github\.com\/apolenkov\/ai-pdlc-learning-stage-4-code\/blob\/main\/docs\/developer-handoff\.md/u,
  );
  assert.doesNotMatch(handoff, /credit-calculator-developer/u);
});

await test('step 3 separates the working layout from the combined step 5 kit; 4-team links back to it', async () => {
  const guides = await loadGuides();
  const withNote = (id: GuideId) =>
    guides[id].steps.filter((step) => step.figure?.html.includes('Временная раскладка → целевая'));
  assert.equal(withNote('1').length, 0, 'step 1 does not show the step 5 layout');
  for (const id of ['3'] as const) {
    const steps = withNote(id);
    assert.equal(steps.length, 1, `${id}: exactly one step carries the layout note`);
    const html = steps[0]!.figure!.html;
    for (const path of [
      'specification.md',
      'intents/',
      'openspec/',
      'product-meta/',
      'services.lock.yaml',
      'product.yaml',
      'README.md',
      'product-specs/',
      'store: product-specs',
    ]) {
      assert.ok(html.includes(path), `${id}: the layout note names ${path}`);
    }
    const layouts = [
      ...html.matchAll(/<svg\b[^>]*aria-labelledby="lsn?-r3-t[^>]*>[\s\S]*?<\/svg>/gu),
    ];
    assert.equal(layouts.length, 2, 'both desktop and narrow diagrams retain the working model');
    for (const [layout] of layouts)
      assert.match(
        layout,
        /product-meta\/[\s\S]*product-specs\/[\s\S]*openspec\/specs\/[\s\S]*store: product-specs/u,
      );
    assert.doesNotMatch(html, /store: product-meta/u);
    assert.match(html, /meta-repo и Store — отдельные репозитории/u);
    assert.match(
      html,
      /совмещённый учебный Store-пример[\s\S]*ai-pdlc-learning-stage-4-requirements/u,
    );
    assert.match(html, /sdd-credit-calculator-product-meta[\s\S]*учебное исключение/u);
  }
  const link = guides['4-team'].steps
    .flatMap((step) => step.links ?? [])
    .find(([text]) => text.includes('куда переезжает учебная раскладка'));
  assert.ok(link, '4-team links to where the practice layout moves');
  assert.equal(link[1], 's3-openspec.html#step-03');
  const r1Index = guides['3'].steps.findIndex((step) =>
    step.figure?.html.includes('Временная раскладка → целевая'),
  );
  assert.equal(r1Index + 1, 3, 'the step 3 link points at the step that carries the note');
});
