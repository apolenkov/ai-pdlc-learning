import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { steps as entry } from '../docs/pages/sdlc-development/guides/content/stage-0a-gitlab-entry.ts';
import { steps as pull } from '../docs/pages/sdlc-development/guides/content/stage-0a-gitlab-pull.ts';
import { steps as publish } from '../docs/pages/sdlc-development/guides/content/stage-1-step-publish.ts';
import { steps as preparation } from '../docs/pages/sdlc-development/guides/content/stage-3-preparation.ts';
import { steps as transfer } from '../docs/pages/sdlc-development/guides/content/stage-3-change-step-transfer.ts';

const assertAction = (action: string) => {
  const blocks = [...action.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/gu)];
  assert.ok(blocks.length <= 1, `separate commands need separate actions: ${action}`);
  for (const [, command] of blocks) {
    assert.doesNotMatch(command!.replaceAll(/&(?:quot|amp|lt|gt|#\d+);/gu, ''), /\n|;|&&/u);
    if (/^git (?!config\b)/u.test(command!))
      assert.match(action, /В (?:VS Code|GitLab):[\s\S]*В терминале[^<]*:<pre><code>/u);
  }
};
const assertText = (text: string) => {
  const items = [...text.matchAll(/<li>([\s\S]*?)<\/li>/gu)];
  if (items.length) items.forEach(([, item]) => assertAction(item!));
  else assertAction(text);
};

await test('w7 actions and collapsed alternatives keep local UI/CLI pairs and one command', () => {
  for (const steps of [entry, pull, publish, preparation.slice(1), transfer]) {
    for (const step of steps) {
      step.actions.forEach(assertAction);
      assertText(step.advanced ?? '');
      assertText(step.variantB ?? '');
    }
  }
  assert.throws(() => assertAction('В терминале:<pre><code>git switch main</code></pre>'));
  assert.throws(() =>
    assertAction(
      'В VS Code: Pull. В терминале:<pre><code>git status</code></pre><pre><code>git pull</code></pre>',
    ),
  );
});

await test('w7 publication and transfer preserve action ordering and separate the sample path', () => {
  const actions = publish[0]!.actions.join(' ');
  assert.match(
    actions,
    /git add[\s\S]*git diff --cached --check[\s\S]*git diff --cached<[^]*git commit[\s\S]*git push/u,
  );
  const migration = transfer[0]!.actions.join(' ');
  assert.match(
    migration,
    /таблицу 8\/8[\s\S]*openspec validate[\s\S]*git status[\s\S]*git diff<[^]*git rm specification.md[\s\S]*openspec validate/u,
  );
  assert.match(transfer[0]!.variantB!, /8\/8 не создавайте[\s\S]*specification.md не удаляйте/u);
  assert.doesNotMatch(transfer[0]!.variantB!, /git rm/u);
  assert.match(transfer[0]!.advanced!, /не содержимое новых файлов/u);
});

await test('w7 Clone/Pull exercise works in two independent local copies and stages deletion once', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'course-w7-sequence-'));
  const resolved = await realpath(temp);
  assert.match(resolved, /\/course-w7-sequence-[^/]+$/u);
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  try {
    const origin = join(temp, 'origin.git');
    const author = join(temp, 'с-git');
    const received = join(temp, 'получено');
    git(temp, 'init', '--bare', '--initial-branch=main', origin);
    git(temp, 'clone', origin, author);
    git(author, 'config', 'user.name', 'Demo Learner');
    git(author, 'config', 'user.email', 'demo@example.test');
    await writeFile(join(author, 'intent.md'), '# Intent\n');
    await writeFile(join(author, 'specification.md'), '# Spec\n');
    git(author, 'add', '.');
    git(author, 'commit', '-m', 'docs: seed');
    git(author, 'push', '-u', 'origin', 'main');
    git(temp, 'clone', origin, received);
    await writeFile(join(author, 'intent.md'), '# Intent\nПроверка Pull\n');
    git(author, 'add', 'intent.md');
    git(author, 'commit', '-m', 'Проверка Pull');
    git(author, 'push');
    assert.doesNotMatch(await readFile(join(received, 'intent.md'), 'utf8'), /Проверка Pull/u);
    git(received, 'pull', '--ff-only');
    assert.match(await readFile(join(received, 'intent.md'), 'utf8'), /Проверка Pull/u);
    assert.equal(git(received, 'status', '--short'), '');
    git(received, 'rm', 'specification.md');
    assert.equal(
      git(received, 'diff', '--cached', '--name-status', '--', 'specification.md'),
      'D\tspecification.md',
    );
  } finally {
    assert.equal(await realpath(temp), resolved);
    await rm(resolved, { recursive: true });
  }
});
