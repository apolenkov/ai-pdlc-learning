import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { lintRanges } from './pre-push-commitlint.ts';

const OWN = join(process.cwd(), 'scripts', 'pre-push-commitlint.ts');
const ZERO = '0'.repeat(40);
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

await test('ranges: known remote sha, new ref, unknown remote sha, deleted ref', () => {
  const input = [
    `refs/heads/main ${A} refs/heads/main ${B}`,
    `refs/heads/new ${A} refs/heads/new ${ZERO}`,
    `refs/heads/force ${A} refs/heads/force ${'c'.repeat(40)}`,
    `(delete) ${ZERO} refs/heads/old ${B}`,
    'garbage',
    '',
  ].join('\n');
  assert.deepEqual(
    lintRanges(input, (sha) => sha === B),
    [{ from: B, to: A }, { to: A }, { to: A }],
  );
});

const makeRepo = async (t: test.TestContext) => {
  const root = await mkdtemp(join(tmpdir(), 'pre-push-commitlint-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...process.env } as Record<string, string | undefined>;
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  Object.assign(env, {
    GIT_AUTHOR_NAME: 't',
    GIT_AUTHOR_EMAIL: 't@example.com',
    GIT_COMMITTER_NAME: 't',
    GIT_COMMITTER_EMAIL: 't@example.com',
  });
  const git = (...args: string[]): string => {
    const result = spawnSync('git', args, { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
    return result.stdout.trim();
  };
  git('init', '-q', '-b', 'main');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', join(root, 'no-hooks'));
  const commit = (message: string): string => {
    git('commit', '-q', '--allow-empty', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  const push = (lines: string[]): number | null =>
    spawnSync(process.execPath, ['--experimental-strip-types', OWN], {
      cwd: root,
      env,
      input: `${lines.join('\n')}\n`,
      stdio: ['pipe', 'ignore', 'ignore'],
    }).status;
  return { git, commit, push };
};

await test('the first push to an empty repository lints the whole history, root included', async (t) => {
  const repo = await makeRepo(t);
  const root = repo.commit('docs(repo): first');
  const head = repo.commit('fix(site): second');
  assert.equal(repo.push([`refs/heads/main ${head} refs/heads/main ${ZERO}`]), 0);
  assert.equal(repo.push([`refs/heads/main ${root} refs/heads/main ${ZERO}`]), 0);
  repo.git('reset', '-q', '--hard', root);
  const bad = repo.commit('not a conventional message');
  assert.equal(repo.push([`refs/heads/main ${bad} refs/heads/main ${ZERO}`]), 1);
  // The remote has `root`: only the commit after it counts.
  assert.equal(repo.push([`refs/heads/main ${head} refs/heads/main ${root}`]), 0);
  assert.equal(repo.push([`refs/heads/main ${bad} refs/heads/main ${root}`]), 1);
});

await test('a bad root commit fails a new branch; a deleted ref sends nothing', async (t) => {
  const repo = await makeRepo(t);
  const root = repo.commit('bad root message');
  const head = repo.commit('fix(site): fine');
  assert.equal(repo.push([`refs/heads/main ${head} refs/heads/main ${ZERO}`]), 1);
  assert.equal(repo.push([`refs/heads/main ${head} refs/heads/main ${root}`]), 0);
  assert.equal(repo.push([`(delete) ${ZERO} refs/heads/x ${root}`]), 0);
  assert.equal(repo.push([`refs/heads/main ${'e'.repeat(40)} refs/heads/main ${ZERO}`]), 1);
});
