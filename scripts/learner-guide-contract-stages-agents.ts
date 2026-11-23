import assert from 'node:assert/strict';
import { prose } from './learner-guide-contract-common.ts';
import type { LearnerGuides } from './learner-guide-types.ts';

/** step 5 agent route: Kilo as the canonical route, OpenCode as the collapsed alternative. */
const assertAgentResource = (guides: LearnerGuides): void => {
  for (const id of ['3-star'] as const) {
    const text = prose(guides[id]);
    assert.match(
      text,
      /\.\.\/corporate-resources\.html#kilo-vscode/u,
      `${id}: shared agent setup must stay in the canonical resource, not be duplicated on stage pages`,
    );
    assert.match(
      text,
      /Kilo/iu,
      `${id}: Kilo stays named as the canonical agent route (pilot-scoped on step 5)`,
    );
    assert.doesNotMatch(
      text,
      /llm\.prod|ID провайдера|Настройки → Провайдеры|opencode-web-provider|opencode-web-model|opencode-web-connection/iu,
      `${id}: provider endpoints, keys and setup steps stay in the canonical resource`,
    );
  }
};

const assertAgentAlternative = (guides: LearnerGuides): void => {
  for (const id of ['3-star'] as const) {
    const guide = guides[id];
    const text = prose(guide);
    assert.match(
      text,
      /Kilo[^.]{0,160}проверен|проверен[^.]{0,120}Kilo/iu,
      `${id}: the confirmed local Kilo route must be named, not denied`,
    );
    assert.doesNotMatch(
      text,
      /техническ\p{L}*\s+пилот/iu,
      `${id}: the banned "technical pilot" wording must not return; the route is "проверен локально"`,
    );
    assert.match(
      text,
      /Kilo[^.]{0,160}project skill|project skill[^.]{0,160}Kilo/iu,
      `${id}: the prepared bases provide the project skills for the Kilo route`,
    );
    assert.doesNotMatch(
      text,
      /стартер\p{L}*[^.]{0,80}не содерж\p{L}*[^.]{0,80}project skills[^.]{0,40}(?:для|в)\s+Kilo|не содержат project skills для Kilo/iu,
      `${id}: the retired "starters lack Kilo skills" claim must not return`,
    );
    assert.doesNotMatch(
      text,
      /Kilo[^.]{0,160}не проверен|не (?:проверен\p{L}*|поддержива\p{L}*)[^.]{0,80}Kilo|project skills и Store через Kilo не проверены/iu,
      `${id}: the retired "Kilo unverified" claim must not return`,
    );
    assert.doesNotMatch(
      text,
      /openspec init --tools kilocode/iu,
      `${id}: the agent-route guide must not send a hidden Kilo init; init belongs to the manual step 3 step`,
    );
    assert.doesNotMatch(
      text,
      /OpenCode[^.]{0,120}обязател\p{L}*|обязател\p{L}*[^.]{0,120}OpenCode/iu,
      `${id}: OpenCode is an optional advanced alternative, not a mandatory bridge`,
    );
    const actionOpenCode = guide.steps.flatMap((step) =>
      step.actions.filter((action) => /<code>opencode(?:\s|<\/code>)/u.test(action)),
    );
    assert.equal(
      actionOpenCode.length,
      0,
      `${id}: executable OpenCode instructions live in step.advanced`,
    );
    const bridgeEntryTitle = 'Подготовьте окружение навыком проекта';
    const bridgeEntry = guide.steps.find((step) => step.title.startsWith(bridgeEntryTitle));
    assert.ok(bridgeEntry, `${id}: the OpenCode route entry step is missing`);
    const bridgeEntryAdvanced = bridgeEntry.advanced ?? '';
    assert.match(
      bridgeEntryAdvanced,
      /<code>opencode(?:\s|<\/code>)/u,
      `${id}: the route entry step must contain executable OpenCode instructions in advanced`,
    );
    assert.match(
      bridgeEntryAdvanced,
      /встроенн\p{L}* терминал\p{L}*/iu,
      `${id}: the OpenCode alternative runs from the VS Code integrated terminal`,
    );
    assert.match(
      bridgeEntryAdvanced,
      /opencode --continue|\/sessions/u,
      `${id}: the OpenCode alternative keeps the session-resume commands`,
    );
    assert.match(
      bridgeEntryAdvanced,
      /setup-analysis-workspace/u,
      'step 5 OpenCode must run the issued project setup skill',
    );
    assert.match(
      bridgeEntryAdvanced,
      /требования к полному отч[её]ту указаны выше/iu,
      'step 5 OpenCode must preserve the same full setup report requirements',
    );
  }
};

const assertAgentPrimaryRoute = (guides: LearnerGuides): void => {
  for (const id of ['3-star'] as const) {
    assert.match(
      prose(guides[id]),
      /Kilo[^.]{0,160}project skill|project skill[^.]{0,160}Kilo|основн\p{L}*[^.]{0,160}Kilo|Kilo[^.]{0,120}основн\p{L}*/iu,
      `${id}: VS Code + Kilo is the primary agent route on the prepared bases`,
    );
    assert.match(
      prose(guides[id]),
      /альтернатив\p{L}*[^.]{0,160}OpenCode|OpenCode[^.]{0,80}альтернатив|продвинут\p{L}*[^.]{0,80}OpenCode|OpenCode[^.]{0,80}продвинут/iu,
      `${id}: OpenCode stays named as the advanced alternative`,
    );
  }
};

export const assertAgentRoutes = (guides: LearnerGuides): void => {
  assertAgentResource(guides);
  assertAgentAlternative(guides);
  assertAgentPrimaryRoute(guides);
};

/** Optional model assistance keeps its decisions and acceptance with people. */
export const assertStepModels = (guides: LearnerGuides): void => {
  assert.doesNotMatch(
    JSON.stringify(guides),
    /stage-[123]-ai\.html|[123]-ИИ/u,
    'guide data must not name or link the retired AI stages',
  );
  for (const id of ['1', '2', '3'] as const) {
    const blocks = guides[id].steps.flatMap((step) => (step.model ? [step.model] : []));
    assert.ok(blocks.length, `${id}: model assistance belongs inside steps`);
    for (const block of blocks) {
      assert.ok(
        block.prompt.trim() &&
          block.does.trim() &&
          block.check.length &&
          block.check.every((item) => item.trim()),
        `${id}: model assistance needs prompt, does and human checks`,
      );
      assert.doesNotMatch(
        prose(block),
        /llm\.prod|ID провайдера|Настройки → Провайдеры|две проверки|два review|обоих людей|агент/iu,
        `${id}: model blocks keep shared setup and current human terminology`,
      );
    }
    const text = prose(blocks);
    for (const role of [/владел\p{L}*\s+продукта/iu, /аналитик/iu, /техлид/iu]) {
      assert.match(
        text,
        role,
        `${id}: each human role must check the current result (${role.source})`,
      );
    }
    assert.match(
      text,
      /архитектор[\s\S]*по признакам или при споре/iu,
      `${id}: architect is conditional`,
    );
    assert.match(text, /той же[\s\S]*ветк/iu, `${id}: assistance preserves the personal branch`);
  }
  for (const id of [
    '0',
    '0a',
    'sdd',
    '3-star',
    '4-legacy',
    '4-new',
    '4-team',
    'delivery',
  ] as const) {
    assert.ok(
      guides[id].steps.every((step) => !step.model),
      `${id}: optional model blocks belong only to steps 1–3`,
    );
  }
  const continuation = guides['3'].steps.at(-1)!.model!;
  assert.match(
    continuation.prompt,
    /закончи ответ и ничего не меняй, пока я явно не подтвержу/iu,
    'step 3 model: partial Change must wait for explicit confirmation in the copied prompt',
  );
  for (const value of [
    'openspec-propose',
    'openspec-update-change',
    'add-payment-summary',
    'add-reset-and-years-term',
    'неокруглённого',
  ]) {
    assert.ok(
      continuation.prompt.includes(value),
      `step 3 model: copied prompt must preserve ${value}`,
    );
  }
  assert.match(
    continuation.check.join('\n'),
    /source course\/your_login\/payment-summary → base course\/your_login\/stage-3-reset-years/u,
    'step 3 model: the separate MR needs the personal step 3 base',
  );
  assert.match(
    continuation.check.join('\n'),
    /staged diff/u,
    'step 3 model: review must include new untracked planning files',
  );
  assert.doesNotMatch(
    `${continuation.prompt}\n${continuation.check.join('\n')}`,
    /\.kilocode|opsx/iu,
    'step 3 model: the generated .kilocode path and /opsx commands stay out of the copied prompt and human checks',
  );
  assert.match(
    continuation.check.join('\n'),
    /openspec validate add-payment-summary --strict/u,
    'step 3 model: the human re-check keeps strict OpenSpec validation',
  );
};
