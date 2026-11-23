import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');

/** Exit status of `gitleaks dir` over a one-file directory. */
async function scan(text: string) {
  const dir = await mkdtemp(join(tmpdir(), 'secret-scan-'));
  try {
    await writeFile(join(dir, 'config.txt'), text);
    return await run('gitleaks', ['dir', '--no-banner', '--redact', dir], { timeout: 60_000 }).then(
      () => 0,
      (error: { code?: number | string }) => error.code ?? 1,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

await test('the tree scan fails on a synthetic token and passes on clean text', async () => {
  // Assembled at runtime so no scanner flags this source file.
  const token = `ghp_${'aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bD1fH3jL5'}`;
  assert.equal(await scan('nothing secret here\n'), 0);
  assert.notEqual(await scan(`token = ${token}\n`), 0);
});

const GATE = '.lefthook/pre-push/local-checks.sh';

await test('pre-push runs the gate with the refs Git sends, also for a push of an empty commit', async (t) => {
  // The project's own Lefthook and config in a scratch repository whose gate script only records what it gets.
  const lefthook = join(root, 'node_modules/.bin/lefthook');
  const dir = await mkdtemp(join(tmpdir(), 'pre-push-gate-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const env = {
    ...process.env,
    GIT_DIR: undefined,
    GIT_INDEX_FILE: undefined,
    GIT_WORK_TREE: undefined,
  };
  const git = (...args: string[]) => run('git', args, { cwd: join(dir, 'work'), env });
  await run('git', ['init', '-q', '--bare', join(dir, 'remote.git')], { env });
  await run('git', ['init', '-q', '-b', 'main', join(dir, 'work')], { env });
  await git('config', 'user.email', 'gate@example.invalid');
  await git('config', 'user.name', 'gate');
  await git('config', 'commit.gpgsign', 'false');
  await writeFile(
    join(dir, 'work/lefthook.yml'),
    await readFile(join(root, 'lefthook.yml'), 'utf8'),
  );
  await mkdir(join(dir, 'work/.lefthook/pre-push'), { recursive: true });
  await writeFile(
    join(dir, 'work', GATE),
    `#!/bin/sh\nprintf '%s|%s|%s\\n' "$1" "$2" "$(cat)" >> "${join(dir, 'gate.log')}"\n`,
    { mode: 0o755 },
  );
  await git('add', '-A');
  await git('commit', '-qm', 'chore: start');
  await git('remote', 'add', 'origin', join(dir, 'remote.git'));
  await git('push', '-q', '-u', 'origin', 'main');
  await git('commit', '-q', '--allow-empty', '-m', 'chore: no file changes');
  const [local, remote] = (await git('rev-parse', 'HEAD', 'origin/main')).stdout.trim().split('\n');
  const refs = `refs/heads/main ${local} refs/heads/main ${remote}`;
  // What the installed hook does: Lefthook gets Git's arguments and the ref lines on stdin.
  const hook = run(
    lefthook,
    ['run', '--no-auto-install', 'pre-push', 'origin', join(dir, 'remote.git')],
    {
      cwd: join(dir, 'work'),
      env,
    },
  );
  hook.child.stdin!.end(`${refs}\n`);
  const { stdout } = await hook;
  assert.doesNotMatch(stdout, /skip/u, stdout);
  assert.equal(
    await readFile(join(dir, 'gate.log'), 'utf8'),
    `origin|${join(dir, 'remote.git')}|${refs}\n`,
  );
});

await test('an up-to-date push (Git sends no ref lines) passes without checks', async () => {
  // Git runs pre-push even when every ref is up to date and then sends nothing: nothing goes out.
  const gate = await readFile(join(root, GATE), 'utf8');
  assert.match(gate, /^if \[ -z "\$hook_input" \]; then .*exit 0; fi$/mu);
  const result = spawnSync('sh', [join(root, GATE), 'origin', 'remote.git'], {
    input: '',
    encoding: 'utf8',
    cwd: root,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /nothing to push/u);
});

await test('pre-push scans history, the checked-out tree and the built artifact', async () => {
  const hook = await readFile(join(root, GATE), 'utf8');
  for (const step of [
    'gitleaks git --no-banner --redact',
    'gitleaks dir --no-banner --redact .',
    'gitleaks dir --no-banner --redact "${PAGES_OUTPUT_DIR:-dist}"',
  ]) {
    assert.ok(
      hook.split('\n').some((line) => line.trim() === step),
      step,
    );
  }
});
