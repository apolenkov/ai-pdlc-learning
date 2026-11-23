import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { steps as branch } from '../docs/pages/sdlc-development/guides/content/stage-1-step-branch.ts';
import { steps as entry } from '../docs/pages/sdlc-development/guides/content/stage-2-entry.ts';
import { steps as review } from '../docs/pages/sdlc-development/guides/content/stage-2-review.ts';
import { steps as planning } from '../docs/pages/sdlc-development/guides/content/stage-3-review.ts';
import { steps as store } from '../docs/pages/sdlc-development/guides/content/stage-3-star-review.ts';

const assertPairs = (texts: readonly string[]) => {
  for (const text of texts) {
    const chunks = text.includes('<li>')
      ? [...text.matchAll(/<li>([\s\S]*?)<\/li>/gu)].map((m) => m[1]!)
      : [text];
    for (const chunk of chunks) {
      if (
        !/\bgit (?:clone|switch|status|add|diff|commit|push|fetch|rev-parse|show|remote|ls-remote)\b/u.test(
          chunk,
        )
      )
        continue;
      assert.match(chunk, /В (?:VS Code|GitLab):[\s\S]*В терминале:<pre><code>/u, chunk);
      assert.equal((chunk.match(/<pre><code>/gu) ?? []).length, 1, 'one command per action');
    }
  }
};

await test('reviewed Git actions have adjacent UI/terminal pairs, including collapsed alternatives', () => {
  for (const steps of [branch, [entry[1]!], review, planning, [store[1]!]]) {
    for (const step of steps)
      assertPairs([...step.actions, step.advanced ?? '', step.variantB ?? '']);
  }
  assert.throws(() =>
    assertPairs(['Скопируйте форк. В терминале:<pre><code>git clone demo</code></pre>']),
  );
});

await test('branch is clean before writing the intent, then both documents are saved together', () => {
  const actions = branch[0]!.actions.join('\n');
  assert.ok(
    actions.indexOf('git status --short --branch') <
      actions.indexOf('сохраните составленный замысел'),
  );
  assert.match(
    actions,
    /Теперь Source Control показывает[\s\S]*сохраните их вместе одной версией/u,
  );
});

await test('planning records composition before review, acceptance only in Jira/MR afterwards', () => {
  assert.match(
    planning[0]!.actions[0]!,
    /до сохранения версии и ревью[\s\S]*7 требований, 23 сценария, 12 незавершённых задач и перенос 8\/8/u,
  );
  for (const text of [planning[2]!.actions.join(' '), planning[2]!.variantB ?? '']) {
    assert.match(text, /Jira\/MR|комментарий[\s\S]*Jira/u);
    assert.match(text, /не меняйте|не добавляйте/u);
  }
  assert.match(planning[2]!.advanced ?? '', /SHA[\s\S]*только в комментарий Jira\/MR/u);
  assert.match(
    planning[2]!.model!.check.join(' '),
    /таблицу связей[\s\S]*git add README[\s\S]*git commit[\s\S]*git push[\s\S]*Approve[\s\S]*Merge[\s\S]*таблицу больше не меняйте/u,
  );
});

await test('independent Store review ends at checked fixes; human approval follows published MR', () => {
  assert.match(store[0]!.result, /одобрение ещё не получено/u);
  assert.doesNotMatch(JSON.stringify(store[0]), /люди приняли/u);
  assert.match(store[0]!.advanced ?? '', /только после создания MR на следующем шаге/u);
  assert.match(
    store[1]!.actions.join(' '),
    /git commit[\s\S]*git push[\s\S]*New merge request[\s\S]*Approve[\s\S]*Merge[\s\S]*документы принятой ревизии больше не меняйте/u,
  );
});

await test('published branch instructions match actual short tracking status in an independent clone', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'course-review-status-'));
  const resolved = await realpath(temp);
  assert.match(resolved, /\/course-review-status-[^/]+$/u);
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  try {
    const origin = join(temp, 'origin.git');
    const author = join(temp, 'author');
    const peer = join(temp, 'peer');
    git(temp, 'init', '--bare', '--initial-branch=main', origin);
    git(temp, 'clone', origin, author);
    git(author, 'config', 'user.name', 'Demo Learner');
    git(author, 'config', 'user.email', 'demo@example.test');
    await writeFile(join(author, 'specification.md'), '# Spec\n');
    git(author, 'add', 'specification.md');
    git(author, 'commit', '-m', 'docs: seed');
    const name = 'course/your_login/stage-1-error-result';
    git(author, 'switch', '-c', name);
    assert.equal(git(author, 'status', '--short', '--branch'), `## ${name}`);
    git(author, 'push', '-u', 'origin', name);
    assert.equal(
      git(author, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'),
      `origin/${name}`,
    );
    assert.equal(git(author, 'status', '--short', '--branch'), `## ${name}...origin/${name}`);
    git(temp, 'clone', '--branch', name, origin, peer);
    git(peer, 'config', 'user.name', 'Demo Reviewer');
    git(peer, 'config', 'user.email', 'reviewer@example.test');
    await writeFile(join(peer, 'specification.md'), '# Spec\nRemote update\n');
    git(peer, 'commit', '-am', 'docs: update');
    git(peer, 'push');
    git(author, 'fetch', 'origin');
    assert.equal(
      git(author, 'status', '--short', '--branch'),
      `## ${name}...origin/${name} [behind 1]`,
    );
    git(author, 'pull', '--ff-only');
    await mkdir(join(author, 'intents'));
    await writeFile(join(author, 'intents/clear-calculation-result.md'), '# Intent\n');
    assert.match(git(author, 'status', '--short', '--branch'), /\n\?\? intents\/$/u);
    for (const text of [
      entry[1]!.actions.join(' '),
      entry[1]!.advanced ?? '',
      review[3]!.advanced ?? '',
    ]) {
      assert.doesNotMatch(text, /up to date/u);
      assert.match(text, /\[behind N\]/u);
      assert.match(text, /@\{upstream\}/u);
    }
  } finally {
    // Only remove the exact directory allocated and checked above, never a computed parent.
    assert.equal(await realpath(temp), resolved);
    await rm(resolved, { recursive: true });
  }
});
