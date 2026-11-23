import { type LearnerGuides } from './learner-guide-contract.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadGuides,
  renderGuide,
  leadThenClosedLazyScreenshots,
} from './learner-guide-test-support.ts';

const assertGrillAndExploreRendering = async () => {
  const html = await renderGuide('3-star');
  for (const anchor of ['step-06', 'step-07'] as const) {
    const stepStart = html.indexOf(`id="${anchor}"`);
    const nextStart = html.indexOf('id="step-', stepStart + 1);
    assert.ok(stepStart >= 0, `3-star: rendered step ${anchor} is missing`);
    const block = html.slice(stepStart, nextStart > stepStart ? nextStart : undefined);
    assert.ok(
      leadThenClosedLazyScreenshots(block),
      `3-star: the real capture sits open lead first, the rest (if any) in a closed lazy group after the result in ${anchor}`,
    );
    assert.equal(
      block.indexOf('<figure class="step-mockup"'),
      -1,
      `3-star: no fictional mockup renders beside the authentic capture in ${anchor}`,
    );
    const figureStart = block.indexOf('<figure class="step-reference');
    const figure = block.slice(
      figureStart,
      block.indexOf('</figure>', figureStart) + '</figure>'.length,
    );
    assert.match(
      figure,
      /<a[^>]+href="assets\/route-r4-kilo-grill-result-current\.jpg"/u,
      `3-star: the figure in ${anchor} renders the genuine grill result frame`,
    );
    assert.match(
      figure,
      /<img[^>]+\balt="[^"]+"/u,
      `3-star: the capture in ${anchor} needs a descriptive alt`,
    );
    assert.doesNotMatch(
      figure,
      /Учебный пример · вымышленные данные/u,
      `3-star: a real capture must not carry the fictional-data label in ${anchor}`,
    );
  }
};

const assertInterruptedGrillStopsRoute = (step: LearnerGuides['3-star']['steps'][number]) => {
  assert.match(
    step.trouble,
    /оборв\p{L}*|обрыв|no actionable output/iu,
    'the trouble covers a length-cut or empty Kilo reply',
  );
  assert.match(step.trouble, /незаверш/iu, 'the trouble marks the step unfinished');
  assert.match(
    step.trouble,
    /не переходите к разбору с моделью или созданию изменения/iu,
    'the trouble forbids moving on to Explore or Propose',
  );
  assert.match(step.trouble, /организатор/iu, 'the trouble routes to the organizer');
  assert.match(
    step.trouble,
    /лимит[^\n]{0,40}не повышайте|не повышайте лимит/iu,
    'the trouble forbids raising the limit alone',
  );
  assert.match(
    step.trouble,
    /ошибк\p{L}* и (?:название |имя )?модел/iu,
    'the trouble requires saving the visible error and model',
  );
};

await test('step 5 grill and conditional Explore steps share the genuine grill result frame', async () => {
  const guides = await loadGuides();
  const steps = guides['3-star'].steps;
  const grill = steps.find((item) => item.title === 'Обсудите требование с моделью вопросами');
  assert.ok(grill, '3-star: the grill step is missing');
  assert.equal(
    grill.mockup,
    undefined,
    'the genuine grill result retires the fictional Kilo panel for this step',
  );
  const grillShot = grill.screenshots?.find(
    (item) => item.src === 'assets/route-r4-kilo-grill-result-current.jpg',
  );
  assert.ok(grillShot, '3-star: the genuine grill result capture is referenced');
  assert.equal(grillShot.width, 1146);
  assert.equal(grillShot.height, 603);
  assert.match(grillShot.alt, /limit-credit-amount/u, 'the alt names the depicted Change');
  assert.match(
    grillShot.caption,
    /разговора с моделью по вопросам/u,
    'the caption names the depicted grill exchange',
  );
  assert.match(grillShot.caption, /limit-credit-amount/u, 'the caption names the depicted Change');
  assert.match(
    grillShot.caption,
    /временной рабочей копии/u,
    'the caption discloses the throwaway capture clone',
  );
  assert.match(
    grillShot.caption,
    /исправлен\p{L}* (?:\p{L}+ )?(?:подсчёт|арифметик)/iu,
    'the caption states the answer is the corrected-arithmetic result',
  );
  assert.match(
    grillShot.caption,
    /не подтвержда/iu,
    'the caption disclaims new decisions, changed files and human review',
  );
  const explore = steps.find(
    (item) => item.title === 'Разберите развилку, только если она осталась',
  );
  assert.ok(explore, '3-star: the conditional Explore step is missing');
  assert.equal(
    explore.mockup,
    undefined,
    'the skip-branch frame retires the fictional Kilo panel for this step',
  );
  const exploreShot = explore.screenshots?.find(
    (item) => item.src === 'assets/route-r4-kilo-grill-result-current.jpg',
  );
  assert.ok(
    exploreShot,
    'the same genuine frame intentionally depicts the skip branch of this adjacent conditional step',
  );
  assert.equal(exploreShot.width, 1146);
  assert.equal(exploreShot.height, 603);
  assert.match(
    exploreShot.caption,
    /пропуск|пропускается/iu,
    'the caption names the skip branch this frame actually shows',
  );
  assert.match(
    exploreShot.caption,
    /не демонстриру\p{L}*|не (?:показыва\p{L}*|доказыва\p{L}*)[^.]{0,80}Explore|без запуска Explore/iu,
    'the caption states no Explore session is demonstrated',
  );
  assert.match(
    JSON.stringify(explore),
    /развилк/iu,
    'the step keeps the material-fork condition for when Explore IS required',
  );
  assert.match(
    explore.example?.content ?? '',
    /развилк|нерешённ\p{L}* вопрос/iu,
    'the conditional Explore message example stays available for a real fork',
  );
  await assertGrillAndExploreRendering();
});

await test('step 5 grill step splits Kilo work into a read-only inventory and a bounded grill', async () => {
  const step = (await loadGuides())['3-star'].steps.find(
    (item) => item.title === 'Обсудите требование с моделью вопросами',
  );
  assert.ok(step, '3-star: the grill step is missing');
  const inventory = step.example;
  assert.ok(inventory, '3-star: the first Kilo message is the read-only inventory');
  assert.equal(
    step.examples?.length,
    1,
    '3-star: the grill step carries exactly one follow-up message',
  );
  const grill = step.examples?.[0];
  assert.ok(grill, '3-star: the second Kilo message is the grill');
  assert.doesNotMatch(
    inventory.content,
    /grill-with-docs/iu,
    'the read-only inventory must not invoke the grill skill',
  );
  for (const [pattern, missing] of [
    [/Store/u, 'the current Store'],
    [/active Changes/iu, 'the real active Changes'],
    [/пол\p{L}* результата/iu, 'the existing result fields'],
    [/ниже 10 000 ₽/u, 'the successful expectations below the new minimum'],
    [/ссылк\p{L}* на файлы/iu, 'file links in the short answer'],
    [/read-only|ничего не меняй/iu, 'the read-only guard'],
  ] as const) {
    assert.match(inventory.content, pattern, `the inventory message misses ${missing}`);
  }
  assert.match(
    grill.content,
    /original project skill grill-with-docs/iu,
    'the second message invokes the original project skill',
  );
  assert.match(
    grill.content,
    /10 000(?: до |\.\.)100 000 000 ₽ включительно/u,
    'the grill keeps the agreed inclusive amount bounds',
  );
  assert.match(
    grill.content,
    /не более 5 вопросов/iu,
    'the grill is bounded to at most five questions',
  );
  assert.match(
    grill.content,
    /не более 3 рекомендац/iu,
    'the grill is bounded to at most three recommendations',
  );
  assert.match(grill.content, /дробн\p{L}* сумм/iu, 'the grill keeps fractional amounts');
  assert.match(
    grill.content,
    /reset\/switch\/error recovery/iu,
    'the grill keeps reset/switch/error recovery',
  );
  assert.match(
    grill.content,
    /исходные Changes[^\n]{0,80}неизменн/iu,
    'the grill preserves the original Changes',
  );
  assert.match(
    grill.content,
    /add-payment-summary отсутствует/iu,
    'the grill keeps add-payment-summary conditional',
  );
  assert.match(
    grill.content,
    /найденн\p{L}* конфликт/iu,
    'the grill replaces only actually found conflicts',
  );
  assert.match(
    grill.content,
    /не меняй файлы|не создавай Change/iu,
    'the grill forbids file and Change edits',
  );
  assert.match(grill.content, /дождись|дождитесь/iu, 'the grill waits for the analyst answers');
  assert.match(
    step.actions[0] ?? '',
    /два (?:коротких )?сообщения/iu,
    'the step instructs two short messages in the same session',
  );
  assertInterruptedGrillStopsRoute(step);
});

await test('step 5 AI-review step shows the authentic bounded Kilo review after the result', async () => {
  const guides = await loadGuides();
  const steps = guides['3-star'].steps;
  const html = await renderGuide('3-star');
  for (const [title, anchor] of [
    ['Независимая проверка моделью, затем люди', 'step-09'],
  ] as const) {
    const step = steps.find((item) => item.title === title);
    assert.ok(step, `3-star: step "${title}" is missing`);
    assert.match(
      step.actions[0]!,
      /новую задачу Kilo/u,
      '3-star: review starts in a fresh Kilo task',
    );
    assert.doesNotMatch(
      step.example!.content,
      /grill/iu,
      '3-star: review prompt relies on files, not grill history',
    );
    assert.match(
      step.example!.content,
      /Ничего не исправляй/u,
      '3-star: the reviewing task is read-only',
    );
    assert.match(
      step.examples![0]!.label,
      /исходную задачу Kilo/u,
      '3-star: fixes go to the original task',
    );
    assert.doesNotMatch(
      JSON.stringify(guides['3-star']),
      /Где помогает модель/u,
      '3-star: no model-note asides',
    );
    assert.doesNotMatch(
      JSON.stringify(guides['3-star']),
      /втор(?:ая|ой) модель/iu,
      '3-star: the reviewer is a fresh Kilo task, not a "second model"',
    );
    assert.doesNotMatch(
      JSON.stringify(guides['3-star']),
      /другая (?:утверждённая )?модель или новая/iu,
      '3-star: the fresh Kilo task comes before another approved model',
    );
    assert.match(
      step.why!,
      /без истории черновика[\s\S]*Проверяйте замечания по файлам/u,
      '3-star: independent review requires fresh context and verification against files',
    );
    assert.doesNotMatch(
      step.figure!.html,
      /На узком экране|min-width: 900px/u,
      '3-star: the desktop-only figure drops the narrow-screen inline width',
    );
    assert.match(
      step.figure!.html,
      /новая задача Kilo без истории черновика \(или другая утверждённая модель\)/u,
      '3-star: the figure desc names the fresh Kilo task first',
    );
    const shot = step.screenshots?.find(
      (item) => item.src === 'assets/route-r4-kilo-review-result-current.jpg',
    );
    assert.ok(shot, `3-star: "${title}" uses the authentic Kilo review capture`);
    assert.equal(shot.width, 1152);
    assert.equal(shot.height, 604);
    assert.equal(step.mockup, undefined, `3-star: "${title}" retires the fictional panel`);
    assert.match(
      shot.caption,
      /связанный код здесь недоступен[\s\S]*не полная проверка требований и не одобрение человека/u,
    );
    const stepStart = html.indexOf(`id="${anchor}"`);
    const nextStart = html.indexOf('id="step-', stepStart + 1);
    assert.ok(stepStart >= 0, `3-star: rendered step ${anchor} is missing`);
    const block = html.slice(stepStart, nextStart > stepStart ? nextStart : undefined);
    assert.ok(
      leadThenClosedLazyScreenshots(block),
      `3-star: the real frame sits open lead first, the rest (if any) in a closed lazy group after the result in ${anchor}`,
    );
    assert.match(block, /<a[^>]+href="assets\/route-r4-kilo-review-result-current\.jpg"/u);
    assert.doesNotMatch(
      block,
      /step-mockup/u,
      `3-star: the fictional panel is removed in ${anchor}`,
    );
  }
});

await test('step 5 MR step shows the real staged diff as its single visual', async () => {
  const step = (await loadGuides())['3-star'].steps.find(
    (item) => item.title === 'Сохраните запрос и передайте хранилище одним сообщением',
  );
  assert.ok(step, '3-star: the MR/Store step is missing');
  const shot = step.screenshots?.find(
    (item) => item.src === 'assets/route-r4-vscode-staged-diff.jpg',
  );
  assert.ok(shot, '3-star: the staged-diff capture is referenced');
  assert.equal(shot.width, 1152);
  assert.equal(shot.height, 768);
  assert.match(shot.alt, /Source Control/iu);
  assert.match(shot.alt, /staged|Staged Changes/iu);
  assert.match(
    shot.caption,
    /Staged Changes|staged diff/iu,
    'the caption tells the learner where to read the staged diff',
  );
  assert.match(shot.caption, /учебн/iu, 'the caption marks the capture as a training example');
  assert.match(
    shot.caption,
    /не подтвержда/iu,
    'the caption disclaims the commit, MR and reviews it cannot prove',
  );
  assert.doesNotMatch(
    shot.caption,
    /коммит создан|коммит сохранён|MR (?:создан|открыт|принят)|review пройден|смёржен|влит|отправлен|опубликован/iu,
    'the caption must not claim a commit, MR, push or review happened',
  );
  assert.equal(
    step.mockup,
    undefined,
    'the authentic staged-diff capture is the step single visual; the fictional checklist is retired',
  );
  const html = await renderGuide('3-star');
  const stepStart = html.indexOf('id="step-10"');
  const nextStart = html.indexOf('id="step-', stepStart + 1);
  assert.ok(stepStart >= 0, '3-star: rendered step step-10 is missing');
  const block = html.slice(stepStart, nextStart > stepStart ? nextStart : undefined);
  assert.ok(
    leadThenClosedLazyScreenshots(block),
    'the real capture sits open lead first, the rest (if any) in a closed lazy group after the result',
  );
  assert.equal(
    block.indexOf('<figure class="step-mockup"'),
    -1,
    'no fictional mockup renders beside the authentic capture',
  );
});
