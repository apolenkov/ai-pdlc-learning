import { type LearnerGuides } from './learner-guide-contract.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGuides, renderGuide, renderedStepHtml } from './learner-guide-test-support.ts';

const assertStepLevels = (stage: LearnerGuides['0'], html: string) => {
  const plain = (fragment: string) =>
    fragment
      .replace(/<[^>]+>/gu, '')
      .replace(/&lt;/gu, '<')
      .replace(/&gt;/gu, '>')
      .replace(/&amp;/gu, '&')
      .replace(/\s+/gu, ' ')
      .trim();
  stage.steps.forEach((step, index) => {
    const label = `step ${index + 1}`;
    const rendered = renderedStepHtml(html, index + 1);
    assert.ok(rendered, `${label}: the step renders`);
    for (const [kind, title] of [
      ['novice', 'Если это впервые'],
      ['known', 'Если уже знаете'],
    ] as const) {
      const blocks: RegExpMatchArray[] = [
        ...rendered.matchAll(
          new RegExp(
            `<details name="level-${index + 1}" class="beginner-extra beginner-extra--secondary step-level step-level--${kind}">([\\s\\S]*?)</details>`,
            'gu',
          ),
        ),
      ];
      assert.equal(blocks.length, 1, `${label}: exactly one «${title}» block, closed by default`);
      const body = blocks[0]![1]!;
      assert.ok(
        body.startsWith(`<summary>${title}</summary>`),
        `${label}: the summary reads «${title}»`,
      );
      if (kind === 'novice')
        assert.match(
          body,
          /Вход и выход|Где/u,
          `${label}: the first-time block explains input and output or says where to look`,
        );
      else
        assert.match(
          body,
          /<p>|<pre><code>/u,
          `${label}: the already-know block gives the essence or a command`,
        );
      assert.ok(plain(body).length > 80, `${label}: the «${title}» block is not a stub`);
      for (const action of step.actions)
        assert.ok(
          !plain(body).includes(plain(action)),
          `${label}: the «${title}» block does not repeat an action verbatim`,
        );
      if (kind === 'known') {
        const commandLines = (fragment: string) =>
          [...fragment.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/gu)]
            .flatMap(([, code]) => code!.split('\n'))
            .map((line) => plain(line).replace(/\s+#.*$/u, ''))
            .filter(Boolean);
        const advancedLines = new Set(commandLines(step.advanced ?? ''));
        for (const line of commandLines(body))
          assert.ok(
            !advancedLines.has(line),
            `${label}: the «${title}» block does not repeat the advanced command «${line}»`,
          );
      }
    }
    assert.ok(
      rendered.indexOf('step-level--novice') < rendered.indexOf('step-level--known'),
      `${label}: first-time precedes already-know`,
    );
    assert.ok(
      rendered.indexOf('step-level--known') < rendered.indexOf('class="step-instructions'),
      `${label}: both levels precede the actions`,
    );
  });
};

await test('block-0a offers two levels inside one route: a choice card and a novice and an expert disclosure in every step', async () => {
  const stage = (await loadGuides())['0a'];
  const html = await renderGuide('0a');
  assert.equal(html.split('id="level-choice"').length - 1, 1, 'one choice card');
  assert.match(
    html,
    /<summary>Я новичок<\/summary>[\s\S]*<summary>Я уже знаю Git и Markdown<\/summary>/u,
  );
  const card = html.match(/<section class="level-choice"[\s\S]*?<\/section>/u)?.[0] ?? '';
  const hrefs = [...card.matchAll(/href="#([\w-]+)"/gu)].map(([, id]) => id!);
  assert.deepEqual(
    hrefs,
    ['course-prereq', 'step-01', 'step-06', 'step-08'],
    'the choice leads to the preparation and to where new material starts',
  );
  assert.ok(
    html.indexOf('id="level-choice"') < html.indexOf('id="course-prereq"') &&
      html.indexOf('id="course-prereq"') < html.indexOf('id="course-terms"') &&
      html.indexOf('id="course-terms"') < html.indexOf('id="work-steps"'),
    'the choice leads down to preparation and the glossary before the steps',
  );
  assert.match(
    html,
    /printf 'заметка\\n' &gt; черновик\.txt/u,
    'one backslash reaches the HTML in printf',
  );
  for (const id of hrefs) assert.ok(html.includes(`id="${id}"`), `the choice link #${id} resolves`);
  stage.steps.forEach((step, index) => {
    const rendered = renderedStepHtml(html, index + 1);
    assert.ok(rendered, `${step.anchor}: the step renders`);
    for (const [kind, title] of [
      ['novice', 'Если это впервые'],
      ['known', 'Если уже знаете'],
    ] as const) {
      const blocks: RegExpMatchArray[] = [
        ...rendered.matchAll(
          new RegExp(
            `<details name="level-${index + 1}" class="beginner-extra beginner-extra--secondary step-level step-level--${kind}">([\\s\\S]*?)</details>`,
            'gu',
          ),
        ),
      ];
      assert.equal(
        blocks.length,
        1,
        `${step.anchor}: exactly one «${title}» block, closed by default`,
      );
      assert.ok(
        blocks[0]![1]!.startsWith(`<summary>${title}</summary>`),
        `${step.anchor}: the summary reads «${title}»`,
      );
      if (kind === 'novice')
        assert.match(
          blocks[0]![1]!,
          /<kbd>|Где/u,
          `${step.anchor}: the novice block says where to look`,
        );
      else if (step.anchor === 'step-11' || step.anchor === 'step-13') {
        assert.match(
          blocks[0]![1]!,
          /^<summary>Если уже знаете<\/summary><div class="beginner-extra__body"><p>В GitLab:/u,
        );
        assert.match(step.gitNote ?? '', /команда Git не нужна/u);
      } else
        assert.match(
          blocks[0]![1]!,
          /<pre><code>|<code>git /iu,
          `${step.anchor}: the expert block gives a terminal equivalent or says there is none`,
        );
    }
    assert.ok(
      rendered.indexOf('step-level--novice') < rendered.indexOf('step-level--known'),
      `${step.anchor}: novice precedes expert`,
    );
    assert.ok(
      rendered.indexOf('step-level--known') < rendered.indexOf('class="step-instructions'),
      `${step.anchor}: both levels precede the actions`,
    );
  });
  assert.equal(
    html.split('step-level--novice"').length - 1,
    stage.steps.length,
    'no level blocks beyond the steps',
  );
  for (const other of ['2', '3', '3-star', 'sdd', '4-legacy', '4-new', 'delivery'] as const) {
    const rendered = await renderGuide(other);
    assert.doesNotMatch(rendered, /level-choice|step-level/u, `guide ${other} stays single-level`);
  }
});

const levelGuides = [
  {
    id: '0',
    steps: 7,
    known: 'Я уже знаю жизненный цикл разработки и роли анализа',
    links: ['course-prereq', 'step-04', 'step-05', 'step-07'],
  },
  {
    id: '1',
    steps: 5,
    known: 'Я уже знаю, что такое замысел и спецификация',
    links: ['course-prereq', 'step-02', 'step-03', 'step-05'],
  },
] as const;

for (const { id: guideId, steps, known, links } of levelGuides) {
  await test(`guide ${guideId} offers two levels inside one route: a choice card and a first-time and an already-know disclosure in every step`, async () => {
    const stage = (await loadGuides())[guideId];
    const html = await renderGuide(guideId);
    assert.equal(stage.steps.length, steps, 'the step count the levels were written for');
    assert.equal(html.split('id="level-choice"').length - 1, 1, 'one choice card');
    const card = html.match(/<section class="level-choice"[\s\S]*?<\/section>/u)?.[0] ?? '';
    assert.match(
      card,
      new RegExp(`<summary>Я новичок</summary>[\\s\\S]*<summary>${known}</summary>`, 'u'),
    );
    const hrefs = [...card.matchAll(/href="#([\w-]+)"/gu)].map(([, hrefId]) => hrefId!);
    assert.deepEqual(
      hrefs,
      links,
      'the choice leads to the preparation and to where new material starts',
    );
    for (const hrefId of hrefs)
      assert.equal(
        html.split(`id="${hrefId}"`).length - 1,
        1,
        `the choice link #${hrefId} resolves once`,
      );
    assert.ok(
      html.indexOf('id="level-choice"') < html.indexOf('id="course-prereq"') &&
        html.indexOf('id="course-prereq"') < html.indexOf('id="work-steps"'),
      'choice, then preparation, then steps',
    );
    assertStepLevels(stage, html);
    assert.equal(
      html.split('step-level--novice"').length - 1,
      stage.steps.length,
      'no level blocks beyond the steps',
    );
  });
}
