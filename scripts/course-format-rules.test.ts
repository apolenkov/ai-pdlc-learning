/**
 * Source-checks of docs/COURSE-RULES.md, rules 1–2: in the guide sources the interface action
 * and its terminal command go in pairs, and a reference «выше»/«ниже» must point to the side
 * of the page where its target really is. The wording rules are checked in scripts/course-rules.test.ts.
 * Helpers live in scripts/course-rules-test-support.ts; the negative controls below prove the checks.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { guideContent } from './guide-content.ts';
import type { LearnerGuide, LearnerStep } from './learner-guide-types.ts';
import { pairViolations, referenceViolations } from './course-rules-test-support.ts';

const step = (overrides: Partial<LearnerStep>): LearnerStep => ({
  title: 'Шаг',
  actions: [],
  links: [],
  result: 'Результат',
  nextUse: { label: 'Следующий раздел', href: '#step-02' },
  trouble: '',
  advanced: null,
  ...overrides,
});

const guide = (steps: readonly LearnerStep[]): LearnerGuide => ({
  title: 'Гайд',
  summary: 'Кратко',
  steps: [...steps],
  output: 'Итог',
  check: ['Проверено'],
});

await test('guide steps keep the interface line and the terminal line in pairs (COURSE-RULES rule 1)', () => {
  const violations: string[] = [];
  for (const [id, value] of Object.entries(guideContent.stages))
    violations.push(...pairViolations(value).map((violation) => `${id}: ${violation}`));
  assert.deepEqual(violations, []);
});

await test('the pair check catches injected violations (negative control)', () => {
  const command = ' В терминале:<pre><code>git add .</code></pre>';
  const ordered = guide([
    step({
      actions: [
        `В GitLab: нажмите Commit.${command}`,
        `В терминале:<pre><code>git push</code></pre>В GitLab: откройте запрос на слияние.`,
        `В GitLab: создайте ветку командой git switch -c demo.`,
        `В терминале:<pre><code>git status</code></pre>`,
        `В терминале: выполните проверку.`,
        `В терминале:<pre><code>git add .\ngit commit -m "demo"</code></pre>`,
      ],
      platformActions: {
        gitlab: [
          `В GitLab: нажмите Merge с сообщением Commit.${command}`,
          'В GitLab: отправьте ветку командой git push -u origin demo.',
        ],
      },
    }),
  ]);
  const found = pairViolations(ordered);
  assert.equal(found.length, 7, found.join('\n'));
  assert.ok(found.some((violation) => violation.includes('after the interface line')));
  assert.ok(found.some((violation) => violation.includes('misses «В терминале»')));
  assert.ok(found.some((violation) => violation.includes('misses the interface line')));
  assert.ok(found.some((violation) => violation.includes('without a command')));
  assert.ok(found.some((violation) => violation.includes('commands in one block')));
  assert.ok(
    found.some((violation) =>
      violation.includes('gitlab action 2: an interface action with a git command'),
    ),
    'platformActions.gitlab of a step is checked by the same rule',
  );
});

await test('guide references «выше»/«ниже» point to the claimed side of the page (COURSE-RULES rule 2)', () => {
  const violations: string[] = [];
  for (const [id, value] of Object.entries(guideContent.stages))
    violations.push(...referenceViolations(value).map((violation) => `${id}: ${violation}`));
  assert.deepEqual(violations, []);
});

await test('the reference check catches injected violations (negative control)', () => {
  const table = { html: '<figure><table><tr><td>1</td></tr></table></figure>' };
  const realTargetBelow = guide([step({ why: 'Смотрите таблицу ниже.', figure: table })]);
  assert.deepEqual(
    referenceViolations(realTargetBelow),
    [],
    'a real target on the claimed side passes',
  );

  const targetAboveOnly = guide([
    step({ actions: ['Сделайте шаг.'], figure: table }),
    step({ why: 'Смотрите таблицу ниже.' }),
  ]);
  const wrongSide = referenceViolations(targetAboveOnly);
  assert.equal(wrongSide.length, 1, wrongSide.join('\n'));
  assert.match(wrongSide[0] ?? '', /not on the claimed side/);

  const targetBelowOnly = guide([step({ why: 'Смотрите таблицу выше.' }), step({ figure: table })]);
  assert.match(
    referenceViolations(targetBelowOnly).join('\n'),
    /not on the claimed side/,
    'the check catches a wrong «выше» reference too',
  );

  const missing = guide([step({ why: 'Вернитесь к разделу «Признаки успеха» ниже.' })]);
  assert.match(referenceViolations(missing).join('\n'), /named block is not on the page/);

  const quotedOtherSide = guide([
    step({ why: 'Смотрите блок «Пять вопросов» выше.' }),
    step({ figure: { html: '<figure><dl><dt>Пять вопросов</dt></dl></figure>' } }),
  ]);
  assert.match(
    referenceViolations(quotedOtherSide).join('\n'),
    /named block is on the other side of the page/,
  );

  const unrelatedTag = guide([
    step({ why: 'Смотрите таблицу ниже. <a href="#example">Ссылка для примера</a>' }),
  ]);
  assert.match(
    referenceViolations(unrelatedTag).join('\n'),
    /not on the claimed side/,
    'any nearby tag does not satisfy a reference to a kind of block',
  );

  const acrossSteps = guide([
    step({ why: 'Смотрите таблицу ниже на этой странице.' }),
    step({ figure: table }),
  ]);
  assert.deepEqual(
    referenceViolations(acrossSteps),
    [],
    'a page-level reference may point across steps',
  );

  // Astra repro 1: a figure is not a table — the candidate field name alone must not prove the kind.
  const imageInsteadOfTable = guide([
    step({
      why: 'Смотрите таблицу ниже.',
      figure: { html: '<figure><img src="demo.png" alt="Схема"></figure>' },
    }),
  ]);
  assert.match(
    referenceViolations(imageInsteadOfTable).join('\n'),
    /not on the claimed side/,
    'a scheme image does not satisfy a reference to a table',
  );

  const plainTextInsteadOfTable = guide([
    step({ why: 'Смотрите таблицу ниже.', figure: { html: '<p>Таблицы здесь нет.</p>' } }),
  ]);
  assert.match(
    referenceViolations(plainTextInsteadOfTable).join('\n'),
    /not on the claimed side/,
    'a paragraph in the figure field does not satisfy a reference to a table',
  );
});

await test('the reference check follows the renderer order of platform actions (negative control)', () => {
  // Astra repro 2: platformActions.gitlab renders after the result, not with actions.
  const platformActionBelow = guide([
    step({
      result: 'Выполните команду ниже.',
      platformActions: {
        gitlab: ['В GitLab: проверьте статус. В терминале:<pre><code>git status</code></pre>'],
      },
    }),
  ]);
  assert.deepEqual(
    referenceViolations(platformActionBelow),
    [],
    'the GitLab alternative is below the result, as the renderer puts it',
  );

  const platformActionAbove = guide([
    step({
      result: 'Выполните команду выше.',
      platformActions: {
        gitlab: ['В GitLab: проверьте статус. В терминале:<pre><code>git status</code></pre>'],
      },
    }),
  ]);
  assert.match(
    referenceViolations(platformActionAbove).join('\n'),
    /not on the claimed side/,
    'a platform action below the result does not satisfy a reference «above»',
  );

  const detailsActionAbove = guide([
    step({
      result: 'Выполните команду выше.',
      actions: [
        '<details class="beginner-extra"><summary>Вариант</summary><pre><code>git status</code></pre></details>',
      ],
    }),
  ]);
  assert.match(
    referenceViolations(detailsActionAbove).join('\n'),
    /not on the claimed side/,
    'a details action renders in the siblings after the result, so it is not «above»',
  );

  const plain = guide([step({ why: 'Признаки успеха — ниже.' })]);
  assert.deepEqual(
    referenceViolations(plain),
    [],
    'a plain phrase without a position reference is not checked',
  );
});
