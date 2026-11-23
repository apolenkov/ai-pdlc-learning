import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGuides, renderGuide, renderedStepHtml } from './learner-guide-test-support.ts';

await test('A5/B9: screenshots follow both action routes and the step navigation closes the step', async () => {
  const page = await renderGuide('1', (guides) => {
    guides['1'].steps = [
      {
        ...guides['1'].steps[0]!,
        title: 'Шаг со снимком',
        actions: ['<p>Основное действие</p>'],
        variantB: '<div class="variant-b-marker">Действие по образцу</div>',
        screenshots: [
          {
            src: 'assets/probe.png',
            width: 800,
            height: 600,
            alt: 'Проверочный снимок',
            caption: 'Снимок после действий',
          },
        ],
        result: 'Результат действия',
        nextUse: { href: '#step-02' },
        trouble: 'Проверка справки',
        advanced:
          '<details class="beginner-extra"><summary>Справка</summary><p>Подробности</p></details>',
        links: [['Руководство', 'guide.html']],
      },
      ...guides['1'].steps.slice(1, 3),
      { ...guides['1'].steps[3]!, nextUse: { label: 'Следующий раздел', href: 'guide.html' } },
    ];
  });
  const html = renderedStepHtml(page, 1);
  assert.ok(html, 'the fixture step must render');
  const positions = [
    html.indexOf('Основное действие'),
    html.indexOf('Действие по образцу'),
    html.indexOf('class="step-reference'),
    html.indexOf('class="step-result"'),
    html.indexOf('class="step-tail"'),
    html.indexOf('class="step-trouble"'),
    html.indexOf('class="beginner-extra"'),
    html.indexOf('class="step-nav"'),
  ];
  assert.ok(
    positions.every((position) => position >= 0),
    `all step sections must render: ${positions.join(', ')}`,
  );
  assert.deepEqual(
    positions,
    [...positions].sort((a, b) => a - b),
  );
  assert.ok(renderedStepHtml(page, 2)?.startsWith('<li id="step-02">'));
  const nav = '<p class="step-nav">';
  const end =
    '<a class="step-next step-next--toc" href="#step-toc">↑ Шаги инструкции</a></p></div></li>';
  assert.equal(
    html.slice(html.indexOf(nav)),
    nav + '<a class="step-next" href="#step-02">Следующий шаг →</a>' + end,
  );
  const final = renderedStepHtml(page, 4);
  assert.ok(final);
  assert.equal(
    final.slice(final.indexOf(nav)),
    nav + '<a class="step-follow-up" href="guide.html">Дальше: Следующий раздел</a>' + end,
  );
});

await test('numbered step actions exclude <details> blocks, which render after the result', async () => {
  const renderStep = async (actions: string[]): Promise<string> => {
    const page = await renderGuide('1', (guides) => {
      guides['1'].steps = [
        {
          ...guides['1'].steps[0]!,
          title: 'Шаг',
          actions,
          result: 'готово',
          nextUse: { label: 'Следующий раздел', href: '#step-02' },
          trouble: 'стоп',
          links: [],
          advanced: null,
        },
      ];
    });
    const step = renderedStepHtml(page, 1);
    assert.ok(step, 'step action renderer must render the supplied fixture');
    return step;
  };
  const html = await renderStep([
    'Создайте fork.',
    '<details class="beginner-extra"><summary>Точная проверка</summary><p>SHA</p></details>',
    'Клонируйте свой fork.',
  ]);
  const actionList = html.match(/<ol class="step-actions">[\s\S]*?<\/ol>/u)?.[0] ?? '';
  assert.equal(
    actionList.match(/<li>/gu)?.length,
    2,
    'only the two ordinary actions may be numbered',
  );
  const resultAt = html.indexOf('<p class="step-result">');
  const resultEnd = resultAt < 0 ? -1 : html.indexOf('</p>', resultAt);
  const detailsAt = html.indexOf('<section class="beginner-extra"><h4>Точная проверка</h4>');
  assert.ok(
    resultEnd >= 0 &&
      html.indexOf('<details class="step-additional">') > resultEnd &&
      detailsAt > html.indexOf('<details class="step-additional">'),
    'the details block must be an unnumbered sibling after the result',
  );
  assert.doesNotMatch(html, /<li>\s*<details/u, 'details must not be wrapped in a list item');
});

await test('C13 keeps every numbered action executable and all secondary help outside actions', async () => {
  for (const [id, guide] of Object.entries(await loadGuides())) {
    for (const [index, step] of guide.steps.entries()) {
      assert.doesNotMatch(
        step.actions.join('\n'),
        /<details\b/u,
        `${id}.${index + 1}: help is not an action`,
      );
      assert.doesNotMatch(
        step.actions.join('\n'),
        /После clone <code>origin<\/code> уже|Diff проверяет, что именно изменилось|Ответ ИИ не заменяет|GitLab сам не блокирует/u,
        `${id}.${index + 1}: standalone explanations live in visible why`,
      );
      if (step.why) {
        const html =
          renderedStepHtml(await renderGuide(id), index + 1)?.replace(
            / target="_blank" rel="noopener noreferrer"(?: aria-description="Откроется в новой вкладке")?|<span class="guide-newtab" aria-hidden="true">↗<\/span>| \(в новой вкладке\)/gu,
            '',
          ) ?? '';
        const [lead, ...paragraphs] = step.why.split('<br><br>');
        const expectedWhy = `<div class="step-why"><strong>Зачем:</strong> ${lead}</div>${paragraphs.length ? `<div class="step-why-more">${paragraphs.map((part) => `<div>${part}</div>`).join('')}</div>` : ''}`;
        const whyAt = html.indexOf(expectedWhy);
        assert.ok(
          whyAt >= 0,
          'the lead and full explanations stay in visible step text in source order',
        );
        const firstDisclosure = html.indexOf('<details');
        assert.ok(
          firstDisclosure < 0 || whyAt < firstDisclosure,
          'the explanation stays before closed help sections',
        );
      }
    }
  }
});
