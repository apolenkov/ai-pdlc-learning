import { guideContent } from './guide-content.ts';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import routeSteps from '../docs/pages/sdlc-development/guides/route-steps.json' with { type: 'json' };
import { resolveCourseNames } from './course-names.ts';
import { renderGuide } from './learner-guide-test-support.ts';

const names: Record<string, { title: string; short: string; file: string }> = courseNames.guides;
const normalize = (value: string): string => value.replace(/\s+/gu, ' ').trim();
const stepCourse = (step: { id: string; course?: string }): string =>
  step.id.startsWith('i') || step.course === 'intent' ? 'intent' : 'analysis';
const titles = new Map(
  routeSteps.map((step) => [`${stepCourse(step)}|${step.number}`, normalize(step.title)]),
);
const hasNumber = (number: string): boolean =>
  titles.has(`analysis|${number}`) || titles.has(`intent|${number}`);
// Navigation keeps its existing wording under Q-0030; its route contract has separate coverage.
const guideProse = (html: string): string =>
  html
    .replace(/<head\b[^>]*>[^]*?<\/head>/giu, '')
    .replace(/<span class="route-kind">[^]*?<\/span>/gu, '')
    .replace(/<nav\b[^>]*>[^]*?<\/nav>|<h1\b[^>]*>[^]*?<\/h1>/giu, '');

const visibleText = (html: string, includeExamples = false): string =>
  html
    .replace(/<!--[^]*?-->/gu, '')
    .replace(
      includeExamples
        ? /<(script|style|head)\b[^>]*>[^]*?<\/\1>/giu
        : /<(svg|code|pre|script|style|head)\b[^>]*>[^]*?<\/\1>/giu,
      ' ',
    )
    .split(/(<[^>]*>)/gu)
    .map((part) => {
      if (!part.startsWith('<')) return part.replace(/\s+/gu, ' ');
      if (includeExamples) return ' ';
      // Step links are separate flex buttons with a visible gap, even though anchors are inline.
      const linkClasses = part.match(/^<a\b[^>]*\bclass=["']([^"']*)/iu)?.[1];
      if (linkClasses?.split(/\s+/u).includes('step-link')) return '\n';
      return /^<\/?(?:address|article|aside|blockquote|br|caption|dd|details|dialog|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hgroup|hr|li|main|nav|ol|p|section|summary|table|tbody|td|tfoot|th|thead|tr|ul)\b/iu.test(
        part,
      )
        ? '\n'
        : '';
    })
    .join('')
    .replace(
      /&(nbsp|amp|lt|gt|quot|apos);|&#(\d+);|&#x([\da-f]+);/giu,
      (_, entity: string, decimal: string, hex: string) =>
        entity
          ? ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[
              entity.toLowerCase()
            ] ?? '')
          : String.fromCodePoint(Number.parseInt(decimal || hex, decimal ? 10 : 16)),
    );

await test('course pages use seven analysis steps, four intent steps and unnumbered preparation', async (t) => {
  assert.deepEqual(
    routeSteps.map(({ id, number, branchOf }) => [id, number, branchOf]),
    [
      ['0', '', null],
      ['0a', '', null],
      ['sdd', '', null],
      ['metarepo', '', null],
      ['1', '1', null],
      ['2', '2', null],
      ['3', '3', null],
      ['4-team', '4', null],
      ['3-star', '5', null],
      ['4-new', '6а', '6'],
      ['4-legacy', '6б', '6'],
      ['delivery', '7', null],
      ['i1', '1', null],
      ['i2', '2', null],
      ['i3', '3', null],
      ['i4', '4', null],
    ],
    'RENUMBER-MAP: preparation has no number; branches share step 6; delivery is step 7; intent steps follow the analysis route with their own course',
  );
  for (const step of routeSteps) {
    await t.test(step.id, async () => {
      const html = await renderGuide(step.id);
      const text = visibleText(html, true);
      assert.doesNotMatch(
        text,
        /шаг(?:а|е|и|у|ов|ах)?\s+(?:8|9[аб]?|10)(?=\s*(?:курса|·))/iu,
        `${step.href}: retired course numbers must not appear in prose or examples`,
      );
      assert.doesNotMatch(text, /подготовка[^.]{0,30}шаг(?:и|ах)\s+1–3\s+курса/iu);
      if (step.group === 'prep') {
        assert.equal(step.number, '', `${step.href}: preparation has no number`);
        assert.match(html, /<h1[^>]*>Подготовка\s+·/u);
      }
    });
  }
});

await test('course catalog uses seven steps and conditional preparation', async () => {
  const catalog = resolveCourseNames(
    await readFile(
      resolve(import.meta.dirname, '../docs/pages/sdlc-development/guides/index.html'),
      'utf8',
    ),
  );
  const text = visibleText(catalog, true);
  assert.doesNotMatch(text, /шаг(?:а|е|и|у|ов|ах)?\s+(?:8|9[аб]?|10)(?=\s*(?:курса|·))/iu);
  assert.doesNotMatch(text, /(?:10|десять)\s+шагов|из\s+(?:10|десяти)/iu);
  assert.match(text, /Подготовка — если ещё не работали с Markdown, Git и SDD/u);
});

const assertRouteLabels = (html: string, page: string): void => {
  const text = visibleText(guideProse(html));
  const problems: string[] = [];
  for (const match of text.matchAll(
    /[Шш]аг(?:а|е|и|у|ов|ам|ах|ами|ом)?\s+(\d+[аб]?)\s*·\s*([^\n.!?;:()—→·«»]*)/gu,
  )) {
    // TASK-571: the "N · Title" form is navigation-only (route strip, position rail,
    // catalog menu, page header); prose references quote the step name instead.
    problems.push(`${match[1]} · ${normalize(match[2] ?? '')}`);
  }
  assert.deepEqual(
    problems,
    [],
    `${page}: prose step references use the quoted step name; the "N · Title" form is navigation-only`,
  );
  const readerAttributes = [...html.matchAll(/\b(?:alt|title|aria-label)=["']([^"']*)["']/gu)]
    .map((match) => match[1])
    .join(' ');
  // JavaScript \b does not recognize Cyrillic letters as word characters.
  const retiredCodes = [
    ...visibleText(`${html} ${readerAttributes}`, true).matchAll(
      /(?<![\p{L}\p{N}])(?:[СC][1-4][аб]?|П[1-3]|Д1)(?![\p{L}\p{N}])/gu,
    ),
  ].map((match) => match[0]);
  assert.deepEqual(
    retiredCodes,
    [],
    `${page}: retired route codes must not appear in reader-facing text, SVG or copied examples`,
  );
};

const assertInnerStepLabels = (html: string, page: string): void => {
  const count = [...html.matchAll(/class="step-number"/gu)].length;
  assert.match(html, /id="work-steps"><h2>Шаги<\/h2>/u, `${page}: steps section title`);
  assert.match(html, /id="step-toc-title">Шаги инструкции<\/h2>/u, `${page}: steps TOC title`);
  if (html.includes('id="level-choice-title"')) {
    assert.match(
      html,
      /id="level-choice-title">Выберите, как проходить шаги<\/h2>/u,
      `${page}: step mode choice title`,
    );
  }
  assert.doesNotMatch(
    visibleText(html) +
      [...html.matchAll(/aria-label="([^"]*)"/gu)].map((match) => match[1]).join('\n'),
    /[Дд]ействи(?:е|я|ю|ем|и|й|ям|ями|ях)\s+\d/u,
    `${page}: numbered guide sections must be called steps`,
  );
  const text = visibleText(guideProse(html));
  for (const match of text.matchAll(
    /(?<!\p{L})[Шш]аг(?:а|е|и|у|ов|ам|ах|ами|ом)?[^\S\r\n]+(\d+[аб]?)(?:[^\S\r\n]*[–—-][^\S\r\n]*(\d+[аб]?))?(?:[^\S\r\n]+и[^\S\r\n]+(\d+[аб]?))?/gu,
  )) {
    const suffix = text.slice(match.index + match[0].length);
    if (/^[^\S\r\n]*·/u.test(suffix)) {
      assert.ok(
        !match[2] && !match[3] && hasNumber(match[1]!),
        `${page}: a named route label must identify one registered course step`,
      );
      continue; // The complete title is checked against the registry below.
    }
    for (const number of [match[1], match[2], match[3]].filter((value) => value !== undefined)) {
      if (/^\s+курса(?!\p{L})/u.test(suffix)) {
        assert.ok(hasNumber(number), `${page}: ${match[0]} курса is not in the route registry`);
      } else if (hasNumber(number) && /^[^\S\r\n]*«/u.test(suffix)) {
        continue; // a quoted course reference, not an internal guide step
      } else {
        assert.match(
          number,
          /^[1-9]\d*$/u,
          `${page}: internal steps have no leading zero or suffix`,
        );
        assert.ok(
          Number(number) <= count,
          `${page}: ${match[0]} exceeds guide ${page}'s ${count} cards`,
        );
      }
    }
  }
  assertRouteLabels(html, page);
};

await test('rendered guides name internal steps and reference only existing cards', async (t) => {
  const rendered = new Map<string, string>();
  for (const id of Object.keys(guideContent.stages)) rendered.set(id, await renderGuide(id));
  for (const [id, html] of rendered) {
    await t.test(id, () => assertInnerStepLabels(html, id));
  }
  await t.test(
    'rejects injected section names, internal numbers, course numbers and titles',
    async () => {
      for (const [prose, error] of [
        ['Повторите действие 2.', /must be called steps/u],
        ['Откройте шаг 15.', /exceeds guide 0a/u],
        ['Откройте шаг 100.', /exceeds guide 0a/u],
        ['Повторите шаги 1–15.', /exceeds guide 0a/u],
        ['Повторите шаг 09.', /no leading zero/u],
        ['Откройте шаг 11 курса.', /not in the route registry/u],
        ['Откройте шаги 4–11 курса.', /not in the route registry/u],
        ['Откройте шаг 3 · Неверное имя.', /navigation-only/u],
        ['Откройте шаг 3 · .', /navigation-only/u],
        ['Откройте шаги 15–16 · Требования в Git.', /one registered course step/u],
        ['После шага 3 · Требования в Git.', /navigation-only/u],
        ['Откройте <a href="p1-zachem.html#step-01">шаг 15</a>.', /exceeds guide 0a/u],
      ] as const) {
        const html = await renderGuide('0a', (guides) => {
          guides['0a'].steps[0]!.actions.push(prose);
        });
        assert.throws(() => assertInnerStepLabels(html, '0a'), error, prose);
      }
      assert.throws(
        () =>
          assertInnerStepLabels(
            rendered.get('0a')!.replace('<h2>Шаги</h2>', '<h2>Действия</h2>'),
            '0a',
          ),
        /steps section title/u,
      );
    },
  );
  await t.test(
    'accepts course numbers beyond the local cards and unpadded internal ranges',
    async () => {
      const html = await renderGuide('0', (guides) => {
        guides['0'].steps[0]!.actions.push(
          'Повторите шаги 1–7. Затем откройте шаг 7 курса или шаг 6а курса. После шага 3 «Изменение в OpenSpec» — продолжайте.',
        );
      });
      assertInnerStepLabels(html, '0');
    },
  );
});

await test('hero prose rejects invalid internal steps, course numbers and route titles', async () => {
  for (const [field, prose, error] of [
    ['summary', 'Откройте шаг 15.', /exceeds guide 0a/u],
    ['output', 'Откройте шаг 11 курса.', /not in the route registry/u],
    ['summary', 'Откройте шаг 3 · Неверное имя.', /navigation-only/u],
  ] as const) {
    const html = await renderGuide('0a', (guides) => {
      guides['0a'][field] = prose;
    });
    assert.throws(() => assertInnerStepLabels(html, '0a'), error, `${field}: ${prose}`);
  }
});

await test('published guide prose and catalog use registered route numbers and titles without retired codes', async (t) => {
  const directory = resolve(import.meta.dirname, '../docs/pages/sdlc-development/guides');
  await t.test('catalog', async () => {
    const html = resolveCourseNames(await readFile(resolve(directory, 'index.html'), 'utf8'));
    assertRouteLabels(html, 'catalog');
  });
  for (const step of routeSteps) {
    await t.test(step.id, async () => {
      assertRouteLabels(await renderGuide(step.id), `${step.id}: rendered guide`);
      const html = resolveCourseNames(
        step.id === 'metarepo'
          ? await renderGuide(step.id)
          : await readFile(resolve(directory, names[step.id]!.file), 'utf8'),
      );
      assertRouteLabels(html, `${step.id}: static guide`);
    });
  }
});

await test('route contract rejects a wrong number, a title extension and a retired code in rendered prose', async () => {
  for (const prose of [
    'шаг 4 · SDD и OpenSpec',
    'шаг 1 · Требования в GitLab',
    'шаг 1 · Требования в Git<strong>Lab</strong>',
    'Откройте С2 перед продолжением.',
    '<svg><text>С1</text><title>C2</title><desc>П1</desc></svg>',
    '<pre>После С3 — С4.</pre>',
    '<code>П2, П3, Д1, C1, C3, C4</code>',
    '<img alt="С4" title="С3" aria-label="П1">',
    '<code>&#x421;1, &lt;ВЕРСИЯ_С3&gt;</code>',
  ]) {
    const html = await renderGuide('0a', (guides) => {
      guides['0a'].steps[0]!.actions.push(prose);
    });
    assert.throws(
      () => assertRouteLabels(html, 'injected prose'),
      prose.startsWith('шаг ') ? /navigation-only/u : /retired route codes/u,
      `the rendered mutation must be rejected: ${prose}`,
    );
  }
  const unquoted = await renderGuide('0a', (guides) => {
    guides['0a'].steps[0]!.actions.push(
      '<span id="С1" class="С2" data-source="С3"><a href="С4">шаг <strong>1</strong> · Требования в <em>Git</em></a></span>',
    );
  });
  assert.throws(
    () => assertRouteLabels(unquoted, 'unquoted prose reference'),
    /navigation-only/u,
    'the unquoted "N · Title" form is navigation-only',
  );
  const html = await renderGuide('0a', (guides) => {
    guides['0a'].steps[0]!.actions.push(
      '<a href="s1-git.html">шаг <strong>1</strong> «Требования в <em>Git</em>»</a>',
    );
  });
  assert.match(visibleText(html), /шаг 1 «Требования в Git»/u);
  assertRouteLabels(html, 'quoted inline reference');
});

await test('prose has zero unquoted "шаг N ·" references in every guide and the catalog', async (t) => {
  const catalog = resolveCourseNames(
    await readFile(
      resolve(import.meta.dirname, '../docs/pages/sdlc-development/guides/index.html'),
      'utf8',
    ),
  );
  await t.test('catalog', () => assertRouteLabels(catalog, 'catalog'));
  for (const step of routeSteps) {
    await t.test(step.id, async () => {
      assertRouteLabels(await renderGuide(step.id), `${step.id}`);
    });
  }
});

await test('real course prose uses the quoted step reference form', async () => {
  const rendered: string[] = [];
  for (const step of routeSteps) rendered.push(visibleText(guideProse(await renderGuide(step.id))));
  const text = rendered.join('\n');
  const contexts: [string, RegExp][] = [
    ['п.1: папка пуста на основном маршруте', /Папка\s+пока пуста — так и должно быть/u],
    ['п.3: результат шага 2 принят', /Результат шага 2 уже принят/u],
    ['заполните таблицу 8/8', /Заполните таблицу 8\/8 в\s+/u],
    ['выполните строгую проверку', /Выполните строгую проверку формы во встроенном терминале/u],
    ['12 задач без запятой', /Все 12 задач реализации остаются незавершёнными/u],
    [
      'вход требований шага 1',
      /станет входом требований шага 1 «Требования в Git» и последующей проверки шага 2 «Проверяем и согласуем»/u,
    ],
    ['на шаге 2 продолжите', /на шаге 2 «Проверяем и согласуем» вы продолжите в той же папке/u],
    ['шагах 5 и 7', /на шагах 5 «Контекст продукта» и 7 «Практикум разработки»/u],
    ['вход: ветка шага 1', /Вход: ветка шага 1 «Требования в Git» и задача в Jira/u],
    ['задача шага 5 в Jira', /Откройте задачу шага 5 «Контекст продукта» в Jira/u],
    ['передача в шаг 5', /Зафиксируйте передачу в шаг 5 «Контекст продукта»/u],
    ['для шага 5 передайте', /Для шага 5 «Контекст продукта» передайте организатору/u],
    ['как на шаге 5, шаге 2', /как на шаге 5 «Контекст продукта», шаге 2/u],
    ['от шага 1 до шага 5', /от шага 1 «Требования в Git» до шага 5 «Контекст продукта»/u],
    [
      'цепочка шагов 1–3',
      /затем шаг 1 «Требования в Git» → шаг 2 «Проверяем и согласуем» → шаг 3 «Изменение в OpenSpec»/u,
    ],
    ['из шага 5 или комплект', /из шага 5 «Контекст продукта» или комплект организатора/u],
    ['вариант Б блок', /Вариант Б — старт с учебного образца шага 3 курса/u],
    ['переключатель входа', /Как вы вошли в шаг:/u],
    ['Б без удаления исходника', /не удаляйте: такого рабочего источника в\s+образце нет/u],
  ] as const;
  for (const [label, pattern] of contexts) {
    assert.match(text, pattern, `missing quoted step reference: ${label}`);
  }
  assert.doesNotMatch(text, /При входе/u, 'entry phrase must be «Если вы пришли…»');
});
