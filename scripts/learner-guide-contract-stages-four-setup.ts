import assert from 'node:assert/strict';
import {
  prose,
  examples,
  collapsedAction,
  stepDisclosures,
} from './learner-guide-contract-common.ts';
import type { LearnerGuide, LearnerStep } from './learner-guide-types.ts';

const assertStageFourSetupPrompt = (fourth: LearnerGuide): LearnerStep => {
  const setup = fourth.steps.find((step) =>
    step.title.startsWith('Подготовьте окружение навыком проекта'),
  );
  assert.ok(setup, 'step 5 setup step is missing');
  const setupPrompt = setup.examples?.[0]?.content ?? '';
  assert.equal(
    setup.examples?.length,
    2,
    'step 5 preparation must use one full-setup prompt and one sample of a successful report',
  );
  assert.match(
    setup.examples?.[1]?.label ?? '',
    /Образец успешного отчёта/u,
    'step 5 preparation must show what success looks like before the run',
  );
  assert.match(
    setupPrompt,
    /полная подготовка окружения шага 5/iu,
    'step 5 prompt must explicitly request the full preparation scope',
  );
  assert.match(
    setupPrompt,
    /git rev-parse --show-toplevel/u,
    'step 5 setup prompt must resolve the actual Git root',
  );
  assert.match(
    setupPrompt,
    /<ABSOLUTE-GIT-ROOT>\/\.agents\/skills\/setup-analysis-workspace\/SKILL\.md/u,
    'step 5 setup prompt must select the project skill file, not only its name',
  );
  assert.match(
    setupPrompt,
    /прочитай целиком только/u,
    'step 5 setup prompt must reject name-only or ambiguous skill resolution',
  );
  assert.match(
    setupPrompt,
    /Одноимённый глобальный skill не используй/u,
    'step 5 setup must reject a global skill source',
  );
  return setup;
};

const assertStageFourStore = (setup: LearnerStep): void => {
  const setupText = prose(setup);
  assert.match(
    setupText,
    /закреплённой версии сервиса[\s\S]*до настройки хранилища/iu,
    'step 5 full setup must prepare the exact pinned code checkout before Store',
  );
  assert.match(
    setupText,
    /записи хранилища нет[^.]{0,100}зарегистрировать/iu,
    'step 5 full setup may register a missing local Store mapping',
  );
  assert.match(
    setupText,
    /другой папке[\s\S]*точные старый и новый пути[\s\S]*останавливается[\s\S]*подтверждени/iu,
    'step 5 Store conflict must stop for exact old/new root confirmation',
  );
  assert.match(
    setupText,
    /до него удаление привязки запрещено[\s\S]*повторно/iu,
    'step 5 Store switch must recheck after confirmation and before unregister',
  );
  assert.match(
    setupText,
    /Имя хранилища[\s\S]*файлах проекта и сохраняется в версии[\s\S]*локальна только привязка/iu,
    'step 5 must distinguish the committed Store ID from its local path mapping',
  );
  assert.match(
    setupText,
    /два отдельных <code>bootstrap: PASS<\/code>/iu,
    'step 5 must require two real bootstrap results through the project skill',
  );
  assert.doesNotMatch(
    examples(setup),
    /^npm exec openspec -- store |^npm run bootstrap$/mu,
    'step 5 learner guide must not duplicate Store/bootstrap commands outside the project skill',
  );
};

const assertStageFourSkillDisclosures = (setup: LearnerStep): void => {
  const setupVisible = setup.actions.filter((action) => !collapsedAction(action));
  assert.equal(
    setupVisible.length,
    3,
    'step 5 preparation must show exactly three learner actions',
  );
  const skillGuarantees = stepDisclosures(setup).filter(
    (action) =>
      collapsedAction(action) && /<summary>[^<]*Что проверяет навык[^<]*<\/summary>/u.test(action),
  );
  assert.equal(
    skillGuarantees.length,
    1,
    'step 5 must keep skill guarantees in one collapsed «Что проверяет skill» block',
  );
  assert.match(
    skillGuarantees[0] ?? '',
    /beginner-extra--secondary/u,
    'step 5 «Что проверяет skill» must stay subdued secondary help',
  );
  for (const guarantee of [
    /закреплённой версии сервиса[\s\S]{0,200}services\.lock\.yaml[\s\S]{0,200}до настройки хранилища/iu,
    /записи хранилища нет[\s\S]{0,200}зарегистрировать/iu,
    /точные старый и новый пути[\s\S]{0,200}останавливается[\s\S]{0,100}подтверждени/iu,
    /удаление привязки запрещено[\s\S]{0,200}повторно/iu,
    /Имя хранилища[\s\S]{0,200}сохраняется в версии[\s\S]{0,200}локальна только привязка/iu,
    /два отдельных <code>bootstrap: PASS<\/code>/u,
    /не запускает реализацию/iu,
    /пустом наборе основных спецификаций/iu,
  ]) {
    assert.match(
      skillGuarantees[0] ?? '',
      guarantee,
      'step 5 «Что проверяет skill» must keep the preserved Store safety guarantees',
    );
  }
};

export const assertStageFourSetup = (fourth: LearnerGuide): void => {
  const setup = assertStageFourSetupPrompt(fourth);
  assertStageFourStore(setup);
  assertStageFourSkillDisclosures(setup);
};
