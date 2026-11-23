import { type LearnerGuides } from './learner-guide-contract.ts';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { readLearningEnhancementsCss } from './learning-enhancements-css.ts';
import { guideContent } from './guide-content.ts';
import { loadGuides, renderGuide } from './learner-guide-test-support.ts';
import { renderStrip, STEPS } from '../docs/pages/sdlc-development/route-strip/strip.ts';
import { crumbItems } from '../docs/pages/sdlc-development/route-strip/crumbs.ts';
import { routeState } from '../docs/pages/sdlc-development/route-strip/model.ts';

const assertDownloadableMarkdownExample = async (stage: LearnerGuides['0a']) => {
  const extra = stage.steps[0]!.advanced ?? '';
  const extended = await readFile(
    'docs/pages/sdlc-development/guides/examples/intent-markdown/intent.md',
    'utf8',
  );
  const shown = extra
    .match(/<pre tabindex="0"><code>([\s\S]*?)<\/code><\/pre>/u)?.[1]
    ?.replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
  assert.equal(shown, extended, 'the page shows the downloadable intent.md verbatim');
  for (const [construct, pattern] of [
    ['task link', /\[PILOT-001\]\(https:/u],
    ['table', /\| --- \| --- \|/u],
    ['image', /!\[[^\]]+\]\(export-button\.svg\)/u],
    ['code block', /```csv\n[\s\S]*?\n```/u],
    ['Mermaid', /```mermaid\nflowchart LR\n[\s\S]*?\n```/u],
    ['emphasis', /\*\*[^*]+\*\*/u],
    ['quote', /^> /mu],
    ['checklist', /^- \[[ x]\] /mu],
  ] as const)
    assert.match(extended, pattern, `the extended intent.md example shows a ${construct}`);
  assert.match(
    extended,
    /^`\[PILOT-001\]\(https:\/\/jira\.example\.invalid\/browse\/PILOT-001\)`$/mu,
    'the fictional task link stays inline code: the downloadable file has no live link to a dead address',
  );
  assert.match(
    extra,
    /href="examples\/intent-markdown\/export-button\.svg" download/u,
    'the image the example links is downloadable',
  );
  assert.match(
    extra,
    /1\.121/u,
    'the Mermaid note names the VS Code version that renders it without an extension',
  );
};

const assertGitBranchesAndFigures = (
  stage: LearnerGuides['0a'],
  step: (anchor: string) => LearnerGuides['0a']['steps'][number],
  actionsOf: (number: number) => string,
) => {
  const branches = step('step-06').advanced ?? '';
  assert.match(
    branches,
    /git switch -c граница-б[\s\S]*git switch -c граница-в/u,
    'main plus three branches',
  );
  assert.match(branches, /git revert --no-edit HEAD/u, 'rollback is a new Commit');
  assert.match(
    branches,
    /git switch граница-б<\/code>[\s\S]*замените[\s\S]*Граница: сообщение[\s\S]*git switch граница-б<\/code>[\s\S]*допишите[\s\S]*git revert/u,
    'each branch is entered before its Commit; the rollback branch is selected first',
  );
  assert.doesNotMatch(branches, /вливать не нужно/u);
  assert.match(
    actionsOf(3),
    /Terminal → New Terminal/u,
    'the terminal is explained at its first use',
  );
  assert.doesNotMatch(actionsOf(8), /Init выполнять не нужно/u);
  assert.match(
    stage.steps[1]!.why ?? '',
    /Git хранит все версии одного файла с причиной и автором/u,
  );
  assert.equal(
    (JSON.stringify(stage.steps[9]).match(/Merge Request —/gu) ?? []).length,
    0,
    'Merge Request is defined once, as (MR), in the why',
  );
  for (const { anchor, figure: { html: figure } = { html: '' } } of stage.steps.filter(
    (item) => item.figure,
  )) {
    assert.equal(
      (figure.match(/course-figure__arrow-label/gu) ?? []).length,
      (figure.match(/marker-end=/gu) ?? []).length,
      `${anchor}: every arrow names its action`,
    );
  }
  assert.match(step('step-09').figure!.html, /Push/u);
  assert.match(step('step-07').figure!.html, /Merge на компьютере/u);
  assert.match(step('step-13').figure!.html, /Merge после MR/u);
  assert.match(step('step-14').figure!.html, />Pull</u);
  for (const anchor of ['step-03', 'step-04']) {
    const figure = step(anchor).figure!.html;
    assert.match(
      figure,
      /Учебный автор · \d\d\.\d\d\.\d{4}/u,
      'author and date are a sample line, not a placeholder',
    );
    assert.doesNotMatch(
      figure,
      /Текст — в intent\.md|остаётся доступен<|Автор и дата — в истории/u,
      'general explanations sit under the figure',
    );
  }
  assert.match(step('step-10').why ?? '', /Merge Request \(MR\)/u);
  // The public edition carries no corporate GitLab frame here: the result describes the request view in text.
  assert.equal(step('step-10').screenshots?.length ?? 0, 0);
  assert.match(step('step-10').result, /limit-rows → main[^]*Reviewer[^]*Commits и Changes/u);
  assert.equal(
    stage.steps.filter((item) => /второй запрос/u.test(JSON.stringify(item))).length,
    1,
    'the second-request warning stays once, at the risky action',
  );
  assert.match(
    stage.steps[0]!.result,
    /<a href="p4-metarepository.html#readme-agents">README.md и AGENTS.md<\/a>/u,
  );
  assert.match(
    stage.steps[1]!.result,
    /intent-1\.md[^]*intent-2\.md[^]*подсвечена добавленная строка[^]*историю Git/u,
  );
  assert.match(stage.steps[8]!.result, /После Push версия останется в GitLab/u);
  assert.match(
    stage.steps[13]!.result,
    /Перед каждой новой правкой выполните Pull[^]*актуальной main/u,
  );
  assert.deepEqual(stage.steps.at(-1)!.nextUse, {
    href: '#lesson-check',
    label: 'финальная самопроверка',
  });
};

await test('the course links Git commands to the eight actions in the standalone guide', async () => {
  const [index, guide, resources] = await Promise.all([
    readFile('docs/pages/sdlc-development/guides/index.html', 'utf8'),
    readFile('docs/pages/sdlc-development/guides/p2-git.html', 'utf8'),
    readFile('docs/pages/sdlc-development/corporate-resources.html', 'utf8'),
  ]);
  assert.match(
    index,
    /href="p2-git\.html#git-process-title"/u,
    'preparation must lead to the Git map',
  );
  const map = guide.match(/<ol class="git-process-map"[\s\S]*?<\/ol>/u)?.[0] ?? '';
  assert.ok(map, 'the Git process map must be available in the standalone guide');
  assert.equal((map.match(/<li id="git-process-[a-z-]+">/gu) ?? []).length, 8);
  for (const label of [
    'Рабочая копия',
    'Ветка',
    'Изменение',
    'Версия',
    'Отправка',
    'Запрос на слияние',
    'Проверка',
    'Принятие правок',
  ]) {
    assert.match(map, new RegExp(label, 'u'));
  }
  // TASK-904: the map stands before the steps folded into one line of the eight stages.
  assert.match(
    guide,
    /<details class="git-process__fold"><summary><h2 id="git-process-title">[^]*?<span class="git-process-strip">[^]*?<\/summary>\s*<ol class="git-process-map">/u,
    'the folded map names the stages in its summary and opens to the cards',
  );
  assert.match(
    await readFile('docs/pages/sdlc-development/guides/guide-data.ts', 'utf8'),
    /closest\('details'\)[^]*?fold\.open = true[^]*?scrollIntoView/u,
    'a link to a stage opens the folded map before scrolling',
  );
  for (const anchor of ['fork', 'branch', 'change', 'commit', 'push', 'pr', 'review', 'merge']) {
    assert.match(
      resources,
      new RegExp(`guides/p2-git\\.html#git-process-${anchor}`, 'u'),
      `the Git reference must link its ${anchor} command to the map`,
    );
  }
});

await test('Git and Markdown is an independent help guide with a contextual learning route link', async () => {
  const guides = await loadGuides();
  assert.equal(
    guides['0'].next,
    '0a',
    'block 0 leads to the Markdown and Git guide, then the SDD overview',
  );
  assert.equal(guides['0a'].next, 'sdd', 'the guide leads to the SDD and OpenSpec guide');
  assert.match(
    renderStrip(STEPS, routeState(STEPS, '0', new Set()), '0'),
    /course-route__edge--next" href="p2-git\.html"/u,
  );
  assert.match(
    renderStrip(STEPS, routeState(STEPS, '0a', new Set()), '0a'),
    /course-route__edge--next" href="p3-sdd\.html" aria-label="Вперёд: Подготовка\u00a0· SDD и OpenSpec/u,
  );
  const helpHtml = await renderGuide('0a');
  const expected = guides['0a'].steps.map((step, index) => [
    `step-${String(index + 1).padStart(2, '0')}`,
    step.title,
  ]);
  const toc = helpHtml.match(/<nav class="step-toc"[^]*?<\/nav>/u)![0];
  assert.equal(expected.length, 14);
  assert.deepEqual(
    [...toc.matchAll(/href="#(step-\d+)">([^<]+)/gu)].map((m) => m.slice(1)),
    expected,
  );
  assert.deepEqual(
    [
      ...helpHtml.matchAll(
        /<li id="(step-\d+)"><span class="step-number" aria-hidden="true">(\d+)<\/span><div class="step-copy"><h3>([^<]+)/gu,
      ),
    ].map(([, id, number, title]) => [id, `step-${number}`, title]),
    expected.map(([id, title]) => [id, id, title]),
  );
  for (const [anchor, meaning] of [
    ['step-06', /ветк/iu],
    ['step-03', /сохраните первую версию/iu],
    ['step-09', /отправ/iu],
    ['step-10', /Merge Request/u],
    ['step-01', /Markdown/u],
    ['step-04', /документ.*истори/iu],
  ] as const) {
    const heading = helpHtml.match(
      new RegExp(`<li id="${anchor}">[\\s\\S]*?<h3>([^<]+)</h3>`, 'u'),
    )?.[1];
    assert.ok(heading, `published destination ${anchor} must remain present`);
    assert.match(
      heading,
      meaning,
      `${anchor} must preserve the original action after teaching order changes`,
    );
    assert.ok(
      helpHtml.includes(`href="#${anchor}"`),
      `${anchor} must be reachable from the contents`,
    );
  }
  assert.match(
    renderStrip(STEPS, routeState(STEPS, '0a', new Set()), '0a'),
    /course-route__edge--prev" href="p1-zachem\.html"/u,
    'the Markdown and Git guide follows block 0',
  );
  assert.match(
    guideContent.prerequisites['0'].join('\n'),
    /href="p2-git\.html"/u,
    'block 0 points readers new to Git at the standalone course',
  );
  const markdown = guides['0a'].steps.find((step) => step.anchor === 'step-01');
  assert.ok(markdown, '0a: the standalone course teaches Markdown');
  assert.match(markdown.why ?? '', /заголовок[\s\S]*спис[\s\S]*пустая строка/u);
  assert.match(markdown.why ?? '', /построчно/u);
  const guidesIndex = await readFile('docs/pages/sdlc-development/guides/index.html', 'utf8');
  assert.match(
    guidesIndex,
    /href="p2-git\.html"/u,
    'the preparation links to the standalone guide',
  );
  assert.match(guidesIndex, /href="p3-sdd\.html"/u);
});

await test('links into the Git and Markdown guide quote the current heading of their step', () => {
  const titles = new Map(guideContent.stages['0a'].steps.map((step) => [step.anchor, step.title]));
  const links = [
    ...JSON.stringify(guideContent.stages).matchAll(/p2-git\.html#([\w-]+)\\">([^<]*)/gu),
  ];
  assert.equal(links.length, 15, 'route stages keep their links into the Git and Markdown guide');
  for (const [, anchor, body] of links) {
    const label = body!.match(/(?:раздел|шаг) «([^»]+)»/u)?.[1];
    // #step-04 starts with git init/config; a learner must not run it in a route working copy.
    assert.notEqual(anchor, 'step-03', 'route stages must not link to the Init step');
    assert.equal(
      label,
      titles.get(anchor),
      `link label for #${anchor} must match the step heading`,
    );
  }
});

await test('beginner Git course preserves linked destinations while teaching local work before GitLab', async () => {
  const stage = (await loadGuides())['0a'];
  assert.deepEqual(
    stage.steps.slice(0, 7).map((step) => step.anchor),
    ['step-01', 'step-02', 'step-03', 'step-04', 'step-05', 'step-06', 'step-07'],
  );
  assert.deepEqual(
    stage.steps.slice(8).map((step) => step.anchor),
    ['step-09', 'step-10', 'step-11', 'step-12', 'step-13', 'step-14'],
  );
  assert.equal(
    stage.steps[7]!.anchor,
    'step-08',
    'existing working-copy links reach GitLab preparation',
  );
  const html = await renderGuide('0a');
  assert.ok(
    html.indexOf('id="course-terms"') < html.indexOf('id="step-toc"'),
    'terms precede the practice',
  );
  assert.equal(
    html.replace(/<header\b[^>]*>[^]*?<\/header>/u, '').split(stage.output).length - 1,
    1,
    'the full result occurs once, with the lesson checks',
  );
  assert.match(html, /Чему вы научитесь/u);
  for (const step of stage.steps.slice(0, -1))
    assert.ok(html.includes(`id="${step.nextUse.href.slice(1)}"`));
  assert.match(
    stage.steps[0]!.example!.content,
    /^# Выгрузка отфильтрованных строк в CSV\n\n## Проблема[\s\S]*## Границы\n- [\s\S]*## Задача\n`?\[PILOT-001\]\(/u,
  );
  assert.match(
    stage.steps.find((step) => step.anchor === 'step-07')!.actions.join(' '),
    /<code>git merge --ff-only другая-граница<\/code>/u,
    'the four-version exercise must override inherited merge.ff=false',
  );
  assert.doesNotMatch(
    JSON.stringify(stage),
    /docs-note|Проверить описание проекта|Добавить заметку/u,
  );
  assert.doesNotMatch(
    JSON.stringify(stage),
    /Лен[аеуыо]|рассказ|концовк|фонар|смотрител/u,
    'the running example is intent.md, not the old story',
  );
  assert.match(
    JSON.stringify(stage),
    /README\.md — первый файл репозитория[\s\S]*p4-metarepository\.html#readme-agents/u,
    'the Git part names README once and links its P4 section',
  );
  await assertDownloadableMarkdownExample(stage);
  const subcommands = (text: string) =>
    new Set([...text.matchAll(/<code>git ([a-z-]+)/gu)].map(([, name]) => name));
  // Exercises in advanced blocks are taught too; only the cheat-sheet <details> (the last block of the last step) is excluded.
  const blocks = (stage.steps.at(-1)!.advanced ?? '').match(/<details[\s\S]*?<\/details>/gu) ?? [];
  const cheatSheet = blocks.find((block) => /Шпаргалка: все команды курса/u.test(block)) ?? '';
  const exercise = blocks.find((block) => /Clone своего проекта/u.test(block)) ?? '';
  assert.ok(
    cheatSheet && exercise && blocks.length === 2,
    'step 14 holds the Clone exercise and the cheat sheet as separate blocks',
  );
  const taught = subcommands(
    JSON.stringify(
      stage.steps.map((step, index) =>
        index === stage.steps.length - 1 ? { ...step, advanced: exercise } : step,
      ),
    ),
  );
  assert.deepEqual(
    [...subcommands(cheatSheet)].sort(),
    [...taught].sort(),
    'the cheat sheet lists exactly the Git commands the steps teach',
  );
  assert.match(
    stage.steps[0]!.actions.join(' '),
    /<kbd>Ctrl\+K<\/kbd>, затем <kbd>V<\/kbd>/u,
    'side-by-side preview shortcut sits next to Open Preview',
  );
});

await test('beginner Git course closes the Opus gaps: missing commands, terms at first use, labelled arrows', async () => {
  const stage = (await loadGuides())['0a'];
  const html = await renderGuide('0a');
  const step = (anchor: string) => stage.steps.find((item) => item.anchor === anchor)!;
  const actionsOf = (number: number) => stage.steps[number - 1]!.actions.join(' ');
  for (const number of [8, 10, 11, 13])
    assert.match(
      stage.steps[number - 1]!.gitNote ?? '',
      /^Для .+ команда Git не нужна\.$/u,
      `step ${number} marks the action that has no Git command`,
    );
  for (const number of [7, 9, 14])
    assert.match(
      actionsOf(number),
      /<code>git status<\/code>/u,
      `step ${number} gives its clean-folder check a command`,
    );
  const blocks = (stage.steps.at(-1)!.advanced ?? '').match(/<details[\s\S]*?<\/details>/gu) ?? [];
  const cheatSheet = blocks.find((block) => /Шпаргалка: все команды курса/u.test(block)) ?? '';
  const exercise = blocks.find((block) => /Clone своего проекта/u.test(block)) ?? '';
  assert.match(
    cheatSheet,
    /<code>git status<\/code>[\s\S]*<code>git revert --no-edit HEAD<\/code>[\s\S]*нет команды Git/u,
  );
  assert.doesNotMatch(
    JSON.stringify(stage),
    /--local|<code>git reset/u,
    'git config needs no --local; rollback never uses reset',
  );
  assert.doesNotMatch(
    JSON.stringify(stage),
    /[Лл]окальн|[Сс]ервер/u,
    'plain words: «на компьютере» and «GitLab»',
  );
  assert.doesNotMatch(
    await readFile('docs/pages/sdlc-development/guides/p2-git.html', 'utf8'),
    /[Лл]окальн/u,
  );
  assert.match(
    actionsOf(7),
    /fast-forward, «перемотка»/u,
    'fast-forward is explained where --ff-only first appears',
  );
  assert.match(step('step-07').trouble, /перемотка невозможна/u);
  assert.match(step('step-14').trouble, /перемотка невозможна/u);
  const troubles = stage.steps.slice(1, 6).map((item) => item.trouble);
  assert.equal(new Set(troubles).size, 5, 'steps 2–6 each have their own «Если не получилось»');
  for (const trouble of troubles) assert.doesNotMatch(trouble, /Сверьте папку/u);
  assert.match(actionsOf(8), /origin — имя, под которым Git запоминает этот адрес/u);
  assert.match(actionsOf(4), /HEAD~1 — запись перед ней/u);
  assert.match(actionsOf(8), /в том числе ваш собственный проект/u);
  assert.match(
    exercise,
    /<code>cd \.\.<\/code>[\s\S]*git clone &quot;АДРЕС_ВАШЕГО_РЕПОЗИТОРИЯ&quot; получено[\s\S]*<code>cd получено<\/code>[\s\S]*git pull --ff-only/u,
    'Clone of the own project into получено/ plus Pull, with the folder changes',
  );
  assertGitBranchesAndFigures(stage, step, actionsOf);
  assert.match(
    html,
    /Финальная самопроверка[\s\S]*Где применять:<\/strong> Для личных документов[\s\S]*Push, Merge Request, ревью и Pull/u,
  );
  const rail = renderStrip(STEPS, routeState(STEPS, '0a', new Set()), '0a');
  assert.match(
    rail,
    /course-route__edge--prev" href="p1-zachem\.html"[\s\S]*course-route__edge--next" href="p3-sdd\.html"/u,
    'the strip arrows open the surrounding preparation pages',
  );
  const crumbs = crumbItems({
    home: { label: 'Карта PDLC', href: '../../' },
    step: STEPS.find((step) => step.id === '0a'),
  });
  assert.equal(crumbs.at(-1)?.label, 'Подготовка\u00a0· Markdown, Git, GitLab');
  assert.match(
    await readFile('docs/pages/sdlc-development/guides/p2-git.html', 'utf8'),
    /<nav class="footer-nav"[\s\S]*id="next-stage" href="p3-sdd\.html"/u,
    'and closes it',
  );
  const css = await readLearningEnhancementsCss();
  assert.doesNotMatch(css, /data-stage="0a"\]\s*\.step-toc/u);
  assert.match(
    css,
    /\.step-toc ol\{[^}]*grid-template-columns:minmax\(0,1fr\)/u,
    'one-column contents in every step-by-step guide',
  );
});
