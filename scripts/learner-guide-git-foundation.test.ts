import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { levels0a } from '../docs/pages/sdlc-development/guides/renderer/levels0a.ts';
import { guideContent } from './guide-content.ts';
import { steps as reviewSteps } from '../docs/pages/sdlc-development/guides/content/stage-0a-gitlab-review-feedback-merge.ts';

const decode = (value: string) =>
  value
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
const commands = (html: string) =>
  [...html.matchAll(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gu)].map((match) =>
    decode(match[1]!),
  );
const noCommand =
  /(?:команда Git(?: для редактирования текста)? не нужна|нет команды Git|дополнительной команды нет)/giu;

// One-based action numbers in each route. Every other action needs its own command.
type Route = 'primary' | 'expert' | 'optional' | 'trouble';
const withoutCommand: Record<string, Partial<Record<Route, number[]>>> = {
  'step-01': { primary: [1, 2, 3] },
  'step-02': { primary: [1, 2, 3] },
  'step-04': { primary: [1], expert: [1] },
  'step-05': { primary: [7] },
  'step-06': { primary: [2], expert: [2], optional: [5, 9, 15, 21] },
  'step-08': { primary: [1, 2, 7, 9], expert: [1] },
  'step-09': { primary: [5], expert: [5] },
  'step-10': { primary: [1, 2, 3, 4], expert: [1] },
  'step-11': { primary: [1, 2, 3], expert: [1] },
  'step-12': { primary: [5], expert: [1, 6], trouble: [1, 2, 3, 4, 5] },
  'step-13': { primary: [1, 2, 3, 4], expert: [1] },
  'step-14': { optional: [4] },
};

const listItems = (html: string) =>
  [...html.matchAll(/<li>([\s\S]*?)<\/li>/gu)].map((match) => match[1]!);

const assertRoute = (anchor: string, route: Route, items: string[]) => {
  const uiOnly = withoutCommand[anchor]?.[route] ?? [];
  for (const [index, item] of items.entries()) {
    const number = index + 1;
    const label = `${anchor}: ${route} action ${number}`;
    const blocks = commands(item);
    assert.equal(blocks.length, uiOnly.includes(number) ? 0 : 1, label);
    if (blocks.length) {
      assert.match(
        item,
        /(?:В терминале|используйте терминал)[^<]*<pre\b[^>]*>\s*<code\b[^>]*>/u,
        label,
      );
      assert.match(blocks[0]!, /^[^\n]+$/u, label);
    }
    assert.doesNotMatch(item, noCommand, label);
  }
};

// Expert exercises can mix list items, standalone actions and introductory paragraphs.
const assertExpertRoute = (anchor: string, html: string) => {
  const items: string[] = [];
  const visibleHtml = html.replace(/<!--[\s\S]*?-->/gu, ' ');
  const actions = [...visibleHtml.matchAll(/<(li|p)\b[^>]*>/gu)];
  for (const [index, action] of actions.entries()) {
    const tag = action[1];
    // A command belongs to this action up to the next paragraph or list item, even across wrappers.
    const item = visibleHtml
      .slice(action.index + action[0].length, actions[index + 1]?.index)
      .replace(/<\/(?:li|p)>/gu, '');
    if (tag === 'li' || /<pre\b|\bgit\s+[a-z-]|В (?:VS Code:|GitLab:|терминале)/u.test(item)) {
      items.push(item);
    }
  }
  assertRoute(anchor, 'expert', items);
};

await test('Git foundation pairs every command with its action and gives UI-only actions one shared note per step', () => {
  for (const step of guideContent.stages['0a'].steps) {
    assert.ok(step.anchor);
    if (withoutCommand[step.anchor])
      assert.match(step.gitNote ?? '', /^Для .+ команда Git не нужна\.$/u);
    else assert.equal(step.gitNote, undefined);
    assertRoute(step.anchor, 'primary', step.actions);
    assertExpertRoute(step.anchor, levels0a[step.anchor]!.known);
    assertRoute(step.anchor, 'optional', listItems(step.advanced ?? ''));
    assertRoute(step.anchor, 'trouble', listItems(step.trouble));
  }
});

await test('an expert paragraph with two commands is checked even without an introductory label', () => {
  const paragraph =
    '<p>Проверьте историю.<pre><code>git log</code></pre><pre><code>git status</code></pre></p>';
  assert.throws(() => assertExpertRoute('step-03', paragraph), { actual: 2, expected: 1 });
});

await test('consecutive command blocks after an expert paragraph belong to that action', () => {
  const log = '<pre><code>git log</code></pre>';
  const status = '<pre><code>git status</code></pre>';
  const commented = `<p>В терминале:</p>${log}\n<!-- next command -->\n${status}`;
  assert.throws(() => assertExpertRoute('step-03', commented), { actual: 2, expected: 1 });
  assert.throws(
    () => assertExpertRoute('step-03', `<p>Проверьте историю.</p>\n${log}\n${status}`),
    {
      actual: 2,
      expected: 1,
    },
  );
  for (const block of [
    `<br>${status}`,
    `<div class="terminal-copy">${status.replace('<pre>', '<pre tabindex="0">')}</div>`,
  ]) {
    assert.throws(() => assertExpertRoute('step-03', `<p>В терминале:</p>${log}${block}`), {
      actual: 2,
      expected: 1,
    });
  }
  assertExpertRoute('step-03', `<p>В терминале:</p>${log}<p>В терминале:</p>${status}`);
});

await test('expert gitignore commands preserve all three exclusions even with git add dot', () => {
  const directory = mkdtempSync(join(tmpdir(), 'task-685-git-ignore-'));
  try {
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: directory, encoding: 'utf8' });
    git('init', '-b', 'main');
    git('config', 'user.name', 'Course test');
    git('config', 'user.email', 'course@example.invalid');
    writeFileSync(join(directory, 'intent.md'), '# Intent\n');
    git('add', 'intent.md');
    git('commit', '-m', 'Initial');
    writeFileSync(join(directory, '.gitignore'), '.existing-secret\n');
    for (const command of commands(levels0a['step-05']!.known)) {
      execFileSync('sh', ['-c', command], { cwd: directory });
    }
    assert.equal(
      readFileSync(join(directory, '.gitignore'), 'utf8'),
      '.existing-secret\n.env\nnode_modules/\nчерновик.txt\n',
    );
    assert.deepEqual(git('ls-files', '-z').split('\0').filter(Boolean), [
      '.gitignore',
      'intent.md',
    ]);
    assert.equal(git('status', '--short'), '');
    for (const file of ['.env', 'node_modules/example.js', 'черновик.txt']) {
      assert.equal(spawnSync('git', ['check-ignore', file], { cwd: directory }).status, 0, file);
    }
  } finally {
    assert.ok(directory.startsWith(join(tmpdir(), 'task-685-git-ignore-')));
    rmSync(directory, { recursive: true, force: true });
  }
});

await test('conflict route uses GitLab target-into-source merge and refreshes the computer before more edits', () => {
  const trouble = reviewSteps.find((step) => step.anchor === 'step-12')!.trouble;
  assert.match(trouble, /Resolve conflicts[\s\S]*Edit inline[\s\S]*Commit to source branch/u);
  assert.match(trouble, /запись слияния целевой ветки в вашу исходную ветку/u);
  assert.match(
    trouble,
    /&lt;&lt;&lt;&lt;&lt;&lt;&lt;[\s\S]*=======[\s\S]*&gt;&gt;&gt;&gt;&gt;&gt;&gt;/u,
  );
  assert.match(trouble, /Re-request review[\s\S]*git status[\s\S]*git pull --ff-only/u);
  assert.doesNotMatch(
    trouble,
    /git add intent\.md|git commit -m/u,
    'no incomplete computer-side conflict fix',
  );
  for (const command of commands(trouble)) assert.equal(command.split('\n').length, 1);
  const approval = reviewSteps
    .find((step) => step.anchor === 'step-13')!
    .actions.find((action) => action.includes('<strong>Approve</strong>'));
  assert.ok(approval);
  assert.match(approval, /В GitLab:[\s\S]*проверяющий[\s\S]*<strong>Approve<\/strong>/u);
});
