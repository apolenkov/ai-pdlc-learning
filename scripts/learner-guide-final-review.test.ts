import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { guideContent } from './guide-content.ts';
import { overview } from '../docs/pages/sdlc-development/guides/content/stage-i-overview.ts';
import { steps as intent } from '../docs/pages/sdlc-development/guides/content/stage-0-step-intent.ts';
import { steps as level } from '../docs/pages/sdlc-development/guides/content/stage-0-step-level.ts';
import { steps as route } from '../docs/pages/sdlc-development/guides/content/stage-sdd-steps-maturity-route.ts';
import { steps as factory } from '../docs/pages/sdlc-development/guides/content/stage-sdd-steps-factory.ts';

const examples = new URL('../docs/pages/sdlc-development/guides/examples/', import.meta.url);
const plain = (text: string): string => text.replaceAll('\u00a0', ' ');
const commands = (actions: string[]): string[] =>
  actions.flatMap((action) =>
    [...action.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/gu)].map((match) => match[1]!),
  );

await test('TASK-685: branch 6 review pairs every save action and keeps new files visible', () => {
  for (const [id, change, branch, staged] of [
    [
      '4-new',
      'add-monthly-payment',
      'stage-4-new',
      'intents/intent-0-monthly-payment.md openspec/changes/add-monthly-payment',
    ],
    [
      '4-legacy',
      'baseline-current-state',
      'stage-4-legacy',
      'openspec/changes/baseline-current-state docs/legacy/tz-2021.txt docs/legacy/confluence-page.txt',
    ],
  ] as const) {
    const review = guideContent.stages[id].steps.find((step) =>
      /Независимая проверка/u.test(step.title),
    )!;
    assert.deepEqual(
      commands(review.actions).filter((cmd) => cmd.startsWith('git ')),
      [
        'git status --short --untracked-files=all',
        `git add ${staged}`,
        'git diff --cached',
        `git commit -m &quot;docs: ${id === '4-new' ? 'описать первый расчёт платежа' : 'описать текущее состояние калькулятора'}&quot;`,
        `git push -u origin course/&lt;LOGIN&gt;/${branch}`,
      ],
    );
    for (const action of review.actions.filter((text) => /<pre><code>git /u.test(text))) {
      assert.match(action, /В VS Code:[\s\S]*В терминале:<pre><code>git /u);
      assert.equal(commands([action]).length, 1, action);
    }
    const gitlab = review.actions.filter((text) => text.includes('В GitLab:'));
    const [request, approval, repeat, merge] = gitlab;
    assert.equal(gitlab.length, 4, id);
    assert.match(request!, /В GitLab:[\s\S]*New merge request/u);
    assert.match(approval!, /В GitLab:[\s\S]*Reviewer[\s\S]*Approve/u, `${id}: Approve`);
    assert.match(repeat!, /В GitLab:[\s\S]*Re-request review/u);
    assert.match(merge!, /В GitLab:[\s\S]*Merge в/u);
    assert.equal(review.gitNote, 'Для одобрения и слияния в GitLab команда Git не нужна.');
    assert.equal(
      JSON.stringify(review).match(/команда Git не нужна|нет команды Git/giu)?.length,
      1,
    );
    assert.match(repeat!, /<a href="#save-changes">команды сохранения и отправки<\/a>/u);
    const save = review.actions.filter((text) => text.includes('id="save-changes"'));
    assert.equal(save.length, 1);
    assert.ok(save[0]!.includes('<code>git status --short --untracked-files=all</code>'));
    assert.match(
      review.actions.join('\n'),
      /git diff --cached[\s\S]*git commit[\s\S]*git push[\s\S]*New merge request/u,
    );
    assert.ok(review.actions.join('\n').includes(change));
  }
});

await test('TASK-685: GitLab CE assigns one Reviewer and re-invites the comment roles explicitly', () => {
  const save = guideContent.stages['3-star'].steps[9]!;
  const first = save.actions.find((text) => text.includes('одного Reviewer'))!;
  assert.match(first, /владельца продукта[\s\S]*Approve/u);
  assert.match(
    first,
    /список обязательных комментариев:[\s\S]*аналитик[\s\S]*техлид[\s\S]*архитектор/u,
  );
  assert.match(first, /@-упоминаниями[\s\S]*Overview/u);
  const repeat = save.actions.find((text) => text.includes('Re-request review'))!;
  assert.match(repeat, /единственного назначенного Reviewer/u);
  assert.match(
    repeat,
    /Аналитика, техлида и архитектора снова[\s\S]*@-упоминаниями[\s\S]*новый коммит/u,
  );
  assert.match(repeat, /обязательный комментарий[\s\S]*одобряет актуальную версию заново/u);
  assert.doesNotMatch(save.actions.join('\n'), /в Reviewers передайте запрос четырём/u);
});

await test('TASK-685: linked analysis template really contains the promised short form', async () => {
  const template = await readFile(
    new URL('credit-calculator-intents/intent-template.md', examples),
    'utf8',
  );
  const request = await readFile(
    new URL('credit-calculator-intents/request-and-answers.md', examples),
    'utf8',
  );
  const form = template.match(/```markdown\n([\s\S]*?)\n```/u)?.[1];
  assert.ok(form, 'a copyable short template exists, rather than a redirect');
  assert.deepEqual(
    [...form.matchAll(/^## (.+)$/gmu)].map((match) => match[1]),
    ['Проблема', 'Результат', 'Границы', 'Признаки успеха', 'Открытые вопросы'],
  );
  for (const field of ['Инициатор', 'Владелец решения', 'Состояние', 'Источник'])
    assert.ok(form.includes(`${field}:`), field);
  assert.doesNotMatch(form, /## План изменений|## Риски|Срок измерения/u);
  assert.match(request, /короткому шаблону анализа\]\(intent-template\.md\)/u);
  assert.match(
    request,
    /самостоятельный учебный пример[\s\S]*Принятую запись предыдущего курса не меняйте/u,
  );
  assert.ok(
    intent[0]!.links.some(
      ([label, href]) => label.includes('Короткий') && href.endsWith('intent-template.html'),
    ),
  );
});

await test('TASK-685: overview diagrams and next destination agree with the full route', async () => {
  const figure = level[0]!.figure!.html;
  const figureStyles = await readFile(
    'docs/pages/sdlc-development/guides/learning-enhancements/06-course-figures.css',
    'utf8',
  );
  // TASK-904: two rows (preparations, then steps) fit the 1440 reading column; narrow screens scroll the 1040 px minimum.
  assert.match(figure, /viewBox="0 0 1200 \d+"/u, 'the route fits the reading column in two rows');
  assert.doesNotMatch(
    figure,
    /<svg\b[^>]*style="[^"]*(?:min-)?width\s*:/iu,
    'an inline size must not override the responsive diagram width',
  );
  assert.match(
    figureStyles,
    /\.course-figure--wide \.course-figure__viewport > svg \{ min-width: 1040px; max-width: none; \}/u,
    'narrow screens retain the readable 1040 px diagram width',
  );
  assert.match(
    figure,
    /Мета-[\s\S]*репозиторий[\s\S]*>1<[^]*>5<[^]*>6а<[^]*Новый[^]*>6б<[^]*Действующий[^]*>7</u,
  );
  assert.match(route[1]!.figure!.html, /Учебный Store-пример/u);
  assert.match(
    plain(route[1]!.result),
    /совмещённого учебного Store-примера[\s\S]*product-meta[\s\S]*отдельный Store product-specs/u,
  );
  assert.equal(factory[0]!.nextUse.href, 'p4-metarepository.html');
  assert.match(
    plain(overview.boundary),
    /рабочем процессе[\s\S]*SHA[\s\S]*change-N[\s\S]*самостоятельный пример/u,
  );
  assert.match(
    plain(overview.boundary),
    /не продолжают вашу ветку[\s\S]*не означает выполнение переданного change-N/u,
  );
});
