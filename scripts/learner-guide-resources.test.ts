import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { guideContent, readGuideSource } from './guide-content.ts';

const assertKiloDefault = (kiloSetup: string) => {
  assert.match(
    kiloSetup,
    /шагах 1–2[^.]{0,100}Git и VS Code/u,
    'steps 1–2 must require only the Git and VS Code baseline',
  );
  assert.match(
    kiloSetup,
    /Node\.js 22\+ и OpenSpec CLI нужны начиная с шага 3/u,
    'Node.js 22+ and OpenSpec must begin with step 3',
  );
  assert.match(
    kiloSetup,
    /один маршрут/iu,
    'the resource must state the learner configures a single AI route',
  );
  assert.doesNotMatch(
    kiloSetup,
    /(?:установите|установить|настройте|настроить|поставьте|подготовьте)[^.\n]{0,100}(?:Kilo|OpenCode)[^.\n]{0,60}и[^.\n]{0,40}(?:Kilo|OpenCode)|(?:оба|обе)\s+(?:агента|инструмента|маршрута)/iu,
    'the resource must not instruct the learner to install both AI routes',
  );
  assert.match(
    kiloSetup,
    /VS Code \+ Kilo[^.]{0,160}основн\p{L}* инструмент/iu,
    'Kilo must be the visible default agent route',
  );
  assert.match(
    kiloSetup,
    /блоки «С моделью» внутри шагов 1–3[\s\S]{0,160}Шаг 5 выполняется только с моделью/u,
    'Kilo covers the optional step 1–3 blocks and the model-only step 5',
  );
  assert.match(
    kiloSetup,
    /OpenCode · необязательная продвинутая альтернатива Kilo[\s\S]{0,220}Для блоков «С моделью» в шагах 1–3 и для шага 5/u,
    'OpenCode stays an optional advanced alternative for model work',
  );
  assert.doesNotMatch(
    kiloSetup,
    /OpenCode[^.]{0,160}\bобязател\p{L}*|\bобязател\p{L}*[^.]{0,160}OpenCode/iu,
    'the retired "OpenCode mandatory" claim must not return',
  );
  assert.match(
    kiloSetup,
    /project skills[^.]{0,80}(?:для|в)\s*Kilo|Kilo[^.]{0,160}project skills/iu,
    'the resource must state where the Kilo project skills come from on each base',
  );
  assert.doesNotMatch(
    kiloSetup,
    /\.kilocode\//u,
    'the shared resource must not promise legacy .kilocode skills in Kilo',
  );
  assert.match(
    kiloSetup,
    /\.kilo\/skills/u,
    'native skills must arrive with both the continuous and standalone starters',
  );
  assert.doesNotMatch(
    kiloSetup,
    /не содерж\p{L}*[^.]{0,80}project skills[^.]{0,40}(?:для|в)\s+Kilo|пока не содержат project skills для Kilo/iu,
    'the retired "starters lack Kilo skills" claim must not return',
  );
  assert.match(
    kiloSetup,
    /локальн\p{L}* проверк\p{L}*/iu,
    'the confirmed local Kilo check stays as scoped maintainer evidence',
  );
  assert.doesNotMatch(
    kiloSetup,
    /пилот/iu,
    'the banned "пилот" wording must not return; the run is "локальная проверка"',
  );
  assert.match(
    kiloSetup,
    /<details class="resource-more">\s*<summary>[^<]*проверк\p{L}*[^<]*<\/summary>[\s\S]*?Store doctor[\s\S]*?<\/details>/iu,
    'maintainer check evidence belongs in collapsed help, after the learner route',
  );
  assert.doesNotMatch(
    kiloSetup,
    /Kilo[^.]{0,160}не проверен|не (?:проверен\p{L}*|поддержива\p{L}*)[^.]{0,80}Kilo|для ступени 4 не требуется|openspec init --tools kilocode/iu,
    'the unverified-Kilo claim, the false step 5 exemption and the hidden init workaround must not return',
  );
  assert.doesNotMatch(
    kiloSetup,
    /llm\.prod|apiKey\s*[=:]/iu,
    'the route card must not publish provider endpoints or credentials',
  );
};

await test('the canonical resource makes Kilo the course-wide default and scopes the collapsed OpenCode alternative', async () => {
  const resource = await readFile('docs/pages/sdlc-development/corporate-resources.html', 'utf8');
  const platformSetup =
    resource.match(/<dt>Windows \/ VDI<\/dt>[\s\S]*?<dt>Что ставит npm ci<\/dt>/u)?.[0] ?? '';
  assert.doesNotMatch(
    platformSetup,
    /<code>openspec init<\/code>/u,
    'platform installation guidance must not prescribe a bare init outside the stage route',
  );
  assert.doesNotMatch(
    platformSetup,
    /<code>npm ci<\/code>[^<]*и нужный <code>npm run check<\/code>/u,
    'steps 1–2 have no npm manifest, so installation guidance cannot require project checks everywhere',
  );
  const kiloSetup = resource.match(/<section id="kilo-vscode"[\s\S]*?<\/section>/u)?.[0] ?? '';
  assert.ok(kiloSetup, 'the canonical AI setup section is missing');
  assertKiloDefault(kiloSetup);

  const openCodeDetailsOpen = kiloSetup.match(/<details id="opencode-setup"([^>]*)>/u)?.[1] ?? '';
  assert.doesNotMatch(
    openCodeDetailsOpen,
    /\bopen\b/u,
    'the OpenCode bridge setup stays collapsed behind a summary',
  );
  const openCodeSummary =
    kiloSetup.match(/<details id="opencode-setup"[^>]*>\s*<summary>([^<]*)<\/summary>/u)?.[1] ?? '';
  assert.match(
    openCodeSummary,
    /альтернатива Kilo для работы с моделью/iu,
    'the collapsed OpenCode summary identifies its role',
  );
  assert.match(
    kiloSetup,
    /Для блоков «С моделью» в шагах 1–3 и для шага 5 вы можете выбрать OpenCode вместо Kilo/u,
    'the alternative applies to model work in steps 1–5',
  );
  assert.match(
    openCodeSummary,
    /необязательн/iu,
    'the OpenCode summary must mark this as optional',
  );
  assert.doesNotMatch(
    openCodeSummary,
    /(?:^|[^\p{L}])обязател\p{L}*/iu,
    'the OpenCode summary must not call this route mandatory',
  );

  const installWarning =
    resource.match(/<aside class="resource-warning"[^>]*>[\s\S]*?<\/aside>/u)?.[0] ?? '';
  assert.doesNotMatch(
    installWarning,
    /VS Code, WSL и onUI/u,
    'the shared machine warning must not list onUI inside the learner tool set',
  );
  assert.match(
    installWarning,
    /onUI[^.]{0,160}(?:автор|проверяющ)/iu,
    'onUI must be marked as author/reviewer tooling where it appears',
  );
  const requestTemplate =
    resource.match(/<pre id="installation-request-template"[^>]*>[\s\S]*?<\/pre>/u)?.[0] ?? '';
  assert.match(
    requestTemplate,
    /Kilo Code[^.\n]{0,160}основн\p{L}*/iu,
    'the installation request must name Kilo as the default route',
  );
  assert.match(
    requestTemplate,
    /OpenCode[^.\n]{0,160}(?:альтернатив|продвинут|резерв)/iu,
    'the installation request must scope OpenCode to the advanced-alternative stages',
  );
  assert.doesNotMatch(
    requestTemplate,
    /OpenCode[^.\n]{0,160}\bобязател\p{L}*/iu,
    'the installation request must not keep the retired mandatory-bridge claim',
  );
  assert.doesNotMatch(
    requestTemplate,
    /OpenCode[^.\n]{0,80}не требуется|для ступени 4 не требуется/iu,
    'the installation request must not keep the retired OpenCode exemption',
  );
  assert.match(
    requestTemplate,
    /onUI[^.\n]{0,160}(?:автор|проверяющ)[^.\n]{0,120}(?:не входит|не обязателен)/iu,
    'the installation request must mark onUI as non-learner author tooling',
  );
  assert.match(
    resource,
    /Для шагов 1–2 вам нужны Git и VS Code[\s\S]{0,240}Kilo Code потребуется для выбранных блоков «С моделью» в шагах 1–3 и для шага 5[\s\S]{0,160}Начиная с шага 3 также нужны Node\.js 22\+ и OpenSpec/u,
    'the request must distinguish learner requirements by stage and keep Kilo optional',
  );
});

await test('each guide reference card keeps one canonical resource link and one stage link', async () => {
  const source = await readGuideSource();
  const { guideReferences } = guideContent;
  const ids = [
    '0',
    '0a',
    '1',
    '2',
    '3',
    '3-star',
    '4-legacy',
    '4-new',
    '4-team',
    'delivery',
    'sdd',
  ];
  assert.deepEqual(
    Object.keys(guideReferences).sort(),
    [...ids].sort(),
    'every guide keeps its reference card',
  );
  for (const id of ids) {
    const links = guideReferences[id]!;
    assert.equal(
      links.length,
      2,
      `${id}: the reference card keeps exactly the canonical resources link and the stage route link`,
    );
    const [resources, route] = links;
    assert.equal(
      resources?.[2],
      'resources',
      `${id}: the first reference must be the canonical resources page`,
    );
    assert.match(
      resources?.[1] ?? '',
      /^\.\.\/corporate-resources\.html(?:#[a-z-]+)?$/u,
      `${id}: the canonical link must target the resources page`,
    );
    assert.equal(
      route?.[2],
      'reference',
      `${id}: the second reference must be the stage-specific route link`,
    );
    assert.ok(route?.[1], `${id}: the stage route link must not be empty`);
  }
  for (const id of ['3-star'] as const) {
    assert.match(
      guideReferences[id]![0]![1],
      /#kilo-vscode$/u,
      `${id}: the canonical link must anchor to the agent route section`,
    );
  }
  for (const id of ['1', '2', '3', 'sdd'] as const) {
    assert.equal(
      guideReferences[id]![0]![1],
      '../corporate-resources.html',
      `${id}: the manual stage links the resources page without an AI anchor`,
    );
  }
  assert.doesNotMatch(
    source,
    /Справка по синтаксису Markdown|Инструменты ступени|Справка Jira Data Center: создание задачи|Справка по работе с Jira/iu,
    'the generic per-stage reference set must be removed, not reworded',
  );
  assert.match(
    source,
    /<div class="practice-links">\$\{resources\}<\/div>/u,
    'the reference card must render only the deduplicated link pair, without a third auto link',
  );
});

await test('onUI stays out of learner prerequisites and preparation notes', async () => {
  await readGuideSource();
  const env = guideContent;
  for (const [id, items] of Object.entries(env.prerequisites)) {
    assert.doesNotMatch(
      items.join('\n'),
      /onUI/iu,
      `${id}: onUI is author/reviewer feedback tooling, not a learner prerequisite`,
    );
  }
  for (const [id, note] of Object.entries(env.accessPreparation)) {
    assert.doesNotMatch(note, /onUI/iu, `${id}: onUI must not appear in learner preparation notes`);
  }
  const catalog = await readFile('docs/pages/sdlc-development/guides/index.html', 'utf8');
  const machineWarning =
    catalog.match(
      /<aside class="warning machine-install-warning"[^>]*>([\s\S]*?)<\/aside>/u,
    )?.[1] ?? '';
  assert.ok(machineWarning, 'the shared machine-install warning must exist on the catalog');
  assert.doesNotMatch(
    machineWarning,
    /onUI/iu,
    'onUI is author/reviewer tooling, not a learner machine prerequisite',
  );
});
