import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import routeSteps from '../docs/pages/sdlc-development/guides/route-steps.json' with { type: 'json' };
import { resolveCourseNames } from './course-names.ts';
import { renderGuide } from './learner-guide-test-support.ts';
import {
  BARE_FORMS,
  PREPOSITION_FORMS,
  STEP_FORMS,
  caseContext,
  proseText,
  stepReferenceProblems,
  stepReferences,
  svgNodes,
  visibleText,
} from './learner-guide-step-reference-rules.ts';

/* TASK-571: runs of the «шаг N «Имя»» rule over the course. The tables and the checker live
   in learner-guide-step-reference-rules.ts; this file owns the sources, the floors that stop
   a green run on an empty scan, and the negative controls that prove each rule can fail.
   Out of scope, deliberately: a name registered under the same number in the other course
   (M10), removing a single reference (the floors are aggregate), and a case governed by a
   word outside the governor list in flattened page text (M11). */

const assertStepReferences = (html: string, page: string): void => {
  assert.deepEqual(
    stepReferenceProblems(visibleText(html), page),
    [],
    `${page}: the step word keeps the case the preposition requires`,
  );
  assert.deepEqual(
    stepReferenceProblems(proseText(html), page, { navigationForm: true }),
    [],
    `${page}: prose references quote the step name instead of the navigation form`,
  );
  for (const node of svgNodes(html))
    assert.deepEqual(
      stepReferenceProblems(node, `${page}: svg`, { genitiveGovernors: true }),
      [],
      `${page}: step references inside svg keep the case, the quotes and the range form`,
    );
};

const guideSources = async (): Promise<{ id: string; html: string }[]> => {
  const directory = resolve(import.meta.dirname, '../docs/pages/sdlc-development/guides');
  const sources = [
    { id: 'catalog', html: resolveCourseNames(await readFile(`${directory}/index.html`, 'utf8')) },
  ];
  for (const step of routeSteps) sources.push({ id: step.id, html: await renderGuide(step.id) });
  return sources;
};

await test('the case table decides every form and preposition deterministically', () => {
  for (const word of 'из от до для после у в на о при к по перед над за между вне внутри'.split(
    ' ',
  ))
    assert.ok(PREPOSITION_FORMS[word], `the table must know «${word}»`);
  for (const form of STEP_FORMS)
    assert.ok(
      BARE_FORMS.includes(form) ||
        Object.values(PREPOSITION_FORMS).some((forms) => forms.includes(form)),
      `${form} must be reachable: either bare or governed by a preposition`,
    );
  for (const [preposition, allowed] of Object.entries(PREPOSITION_FORMS))
    for (const form of STEP_FORMS) {
      const text = `${preposition} ${form} 2 «Проверяем и согласуем»`;
      assert.equal(
        stepReferences(text).length,
        1,
        `${text}: the scanner must find the reference, otherwise the matrix proves nothing`,
      );
      const expected = allowed.includes(form);
      assert.equal(
        stepReferenceProblems(text, 'synthetic').length === 0,
        expected,
        `${text}: ${expected ? 'must pass' : `must fail, «${preposition}» requires ${allowed.join(' / ')}`}`,
      );
    }
  for (const form of STEP_FORMS) {
    const bare = `${form} 2 «Проверяем и согласуем»`;
    assert.equal(stepReferences(bare).length, 1, `${bare}: the scanner must find the reference`);
    assert.equal(
      stepReferenceProblems(bare, 'synthetic').length === 0,
      BARE_FORMS.includes(form),
      `${bare}: ${BARE_FORMS.includes(form) ? 'must pass' : 'must fail: an oblique form needs a preposition'}`,
    );
    const governed = `результатом ${form} 2 «Проверяем и согласуем»`;
    assert.equal(stepReferences(governed).length, 1, `${governed}: must find the reference`);
    assert.equal(
      stepReferenceProblems(governed, 'synthetic', { genitiveGovernors: true }).length === 0,
      form === 'шага' || form === 'шагов',
      `${governed}: a genitive governor requires the genitive`,
    );
  }
});

await test('every guide and the catalog keep the case the preposition requires', async (t) => {
  const sources = await guideSources();
  const observed = new Set<string>();
  let references = 0;
  let named = 0;
  let svgReferences = 0;
  for (const { id, html } of sources) {
    await t.test(id, () => {
      const text = visibleText(html);
      const found = stepReferences(text);
      assert.ok(
        found.length > 0,
        `${id}: no step references found — the check must not pass on an empty scan`,
      );
      references += found.length;
      named += found.filter((reference) => reference.name).length;
      svgReferences += svgNodes(html).reduce(
        (count, node) => count + stepReferences(node).length,
        0,
      );
      for (const reference of found) {
        const { preposition } = caseContext(text, reference.index);
        if (preposition) observed.add(`${preposition}|${reference.form}`);
      }
      assertStepReferences(html, id);
    });
  }
  assert.ok(references >= 400, `the scan must see the real references, saw ${references}`);
  assert.ok(named >= 120, `the scan must see the quoted references, saw ${named}`);
  assert.ok(svgReferences >= 5, `the scan must read figure text, saw ${svgReferences} references`);
  const required =
    'из|шага от|шага до|шага для|шага после|шага после|шагов с|шага с|шагом в|шаг в|шаге в|шагах ' +
    'на|шаге на|шагах к|шагу по|шагу';
  for (const pair of required.split(' '))
    assert.ok(
      observed.has(pair),
      `real content must exercise «${pair.replace('|', ' ')}» — otherwise the rule is not proven`,
    );
  const ranges = stepReferences(sources.map(({ html }) => visibleText(html)).join('\n')).filter(
    (reference) => reference.separator,
  );
  assert.ok(ranges.length >= 10, `the scan must see the real ranges, saw ${ranges.length}`);
  assert.ok(
    ranges.some((reference) => reference.text.startsWith('шагов 1\u20133')),
    'the owner range «шагов 1–3» must be present',
  );
  assert.ok(
    ranges.some((reference) => /^[Шш]аги 1\u20137/u.test(reference.text)),
    'the owner range «шаги 1–7» must be present',
  );
});

await test('the checker rejects wrong case, a stray name, a bare range and the navigation form', async () => {
  for (const [prose, error] of [
    ['Откройте результат: из шаге 2 «Проверяем и согласуем» — дальше.', /case:/u],
    ['Откройте результат: в шага 2 «Проверяем и согласуем» — дальше.', /case:/u],
    ['Откройте результат: на шагом 2 «Проверяем и согласуем» — дальше.', /case:/u],
    ['Откройте результат: после шагу 2 «Проверяем и согласуем» — дальше.', /case:/u],
    ['Откройте результат: шагом 2 «Проверяем и согласуем» — дальше.', /case:/u],
    ['Откройте шага 2 «Контекст продукта».', /name:/u],
    ['Откройте шага 5 «Такого шага нет».', /name:/u],
    ['Откройте шаге 1–3 курса.', /range:/u],
    ['Откройте шагов 1-3 курса.', /range:/u],
    ['Откройте шагов 1–3 «Проверяем и согласуем».', /range:/u],
    ['Откройте шагу 5 «Жизнь одного изменения» в гайде «Markdown, Git, GitLab».', /guide:/u],
    ['Откройте шаг 2 · Проверяем и согласуем.', /navigation:/u],
  ] as const) {
    const html = await renderGuide('0a', (guides) => {
      guides['0a'].steps[0]!.actions.push(prose);
    });
    assert.throws(() => assertStepReferences(html, 'injected prose'), error, prose);
  }
});

await test('the checker rejects an unquoted step name and a case broken inside svg', async () => {
  const unquoted = await renderGuide('0a', (guides) => {
    guides['0a'].steps[0]!.actions.push(
      'Откройте шаг 2 Проверяем и согласуем и перенесите сценарии.',
    );
  });
  assert.throws(
    () => assertStepReferences(unquoted, 'unquoted name'),
    /quote:/u,
    'a registered step name must be wrapped in «ёлочки»',
  );
  const svg = await renderGuide('0a', (guides) => {
    guides['0a'].steps[0]!.actions.push(
      '<figure><svg viewBox="0 0 10 10" role="img"><desc id="probe">Восемь сценариев шаге 2 сопоставляются со спецификацией.</desc><text x="1" y="1">Шаг 2 «Проверяем и согласуем»</text></svg></figure>',
    );
  });
  assert.throws(
    () => assertStepReferences(svg, 'svg figure'),
    /: svg: case:/u,
    'the svg channel must read the figure text',
  );
});

await test('the checker rejects the owner wording without the comma and accepts it with one', async () => {
  const owner =
    'Если вы пришли из шага 2 «Проверяем и согласуем»{COMMA} продолжайте личную ветку без повторного копирования и переноса требований.';
  const render = (comma: string) =>
    renderGuide('0a', (guides) => {
      guides['0a'].steps[0]!.actions.push(owner.replace('{COMMA}', comma));
    });
  const withoutComma = await render('');
  const withComma = await render(',');
  assert.throws(
    () => assertStepReferences(withoutComma, 'owner wording'),
    /comma:/u,
    'a verb after the quoted step name closes the conditional clause: the comma is required',
  );
  assertStepReferences(withComma, 'owner wording with the comma');
});

await test('the checker accepts the valid reference forms', async () => {
  const prose =
    'Из шага 2 «Проверяем и согласуем» перенесите восемь сценариев. ' +
    'В шаге 2 «Проверяем и согласуем» проверьте форму. ' +
    'К шагу 2 «Проверяем и согласуем» вернитесь позже. ' +
    'Перед шагом 2 «Проверяем и согласуем» прочитайте правило. ' +
    'Шаг 2 «Проверяем и согласуем» — проверенная версия. ' +
    'Передача в шаг 5 «Контекст продукта» зафиксирована. ' +
    'Результатом шага 2 «Проверяем и согласуем» довольны. ' +
    'После шагов 1–3 курса продолжайте практику. ' +
    'На шагах 1–3 курса разбирается замысел.';
  const html = await renderGuide('0a', (guides) => {
    guides['0a'].steps[0]!.actions.push(prose);
  });
  assertStepReferences(html, 'valid synthetic prose');
});

await test('the catalog step tokens keep the case word before the token', async () => {
  const source = await readFile(
    resolve(import.meta.dirname, '../docs/pages/sdlc-development/guides/index.html'),
    'utf8',
  );
  const tokens = [...source.matchAll(/\{\{SHORT_STEP:([^}]+)\}\}/gu)];
  // A floor, not a count: the catalog names its steps by the token (29 after the withdrawn film's chapter left).
  assert.ok(tokens.length >= 25, `the catalog must use the short step token, saw ${tokens.length}`);
  // {{SHORT_STEP:N}} renders «N «Имя»» without a case word: a preposition before it dangles.
  const problems = [...source.matchAll(/([\p{L}]+)\s*\{\{SHORT_STEP:([^}]+)\}\}/gu)]
    .filter((match) => PREPOSITION_FORMS[match[1]!.toLowerCase()])
    .map((match) => `${match[1]} {{SHORT_STEP:${match[2]}}}`);
  assert.deepEqual(
    problems,
    [],
    'a preposition before {{SHORT_STEP}} needs the case word before the token',
  );
});
