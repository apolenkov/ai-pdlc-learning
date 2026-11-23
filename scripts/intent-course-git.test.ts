import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { guideContent } from './guide-content.ts';

const createFixture = async (sandbox: string, env: NodeJS.ProcessEnv, csvIntent: string) => {
  const origin = resolve(sandbox, 'origin.git');
  const seed = resolve(sandbox, 'seed');
  const clone = resolve(sandbox, 'clone');
  const git = (cwd: string, ...args: string[]): string =>
    execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git(sandbox, 'init', '--bare', '--initial-branch=main', origin);
  await mkdir(seed);
  git(seed, 'init', '--initial-branch=main');
  git(seed, 'config', 'user.name', 'Course Fixture');
  git(seed, 'config', 'user.email', 'course@example.invalid');
  await writeFile(resolve(seed, 'intent.md'), csvIntent);
  git(seed, 'add', 'intent.md');
  git(seed, 'commit', '-m', 'CSV intent fixture');
  git(seed, 'remote', 'add', 'origin', origin);
  git(seed, 'push', '-u', 'origin', 'main');
  git(sandbox, 'clone', origin, clone);
  git(clone, 'config', 'user.name', 'Course Analyst');
  git(clone, 'config', 'user.email', 'analyst@example.invalid');
  return { clone, git };
};

const isolatedEnv = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
  };
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) delete env[name];
  return env;
};

await test('published intent commands preserve the CSV intent and the final approved revision (TASK-685 №12/13)', async () => {
  // Outside the repository: only this fixture receives the course commands and local pushes.
  const sandbox = await realpath(await mkdtemp(resolve(tmpdir(), 'intent-course-')));
  const env = isolatedEnv();
  const path = 'intents/clear-result/intent.md';
  const csvIntent = '# Выгрузка CSV\nСостояние: черновик\n';
  try {
    const { clone, git } = await createFixture(sandbox, env, csvIntent);
    const intent = await readFile(
      new URL(
        '../docs/pages/sdlc-development/guides/examples/intent-plan/strong-intent.md',
        import.meta.url,
      ),
      'utf8',
    );
    const standard = resolve(sandbox, 'course-linter/standards/sdlc-analysis-standard');
    await mkdir(resolve(standard, 'tools'), { recursive: true });
    for (const file of ['package.json', 'tools/intent-lint.ts']) {
      await copyFile(
        new URL(`../standards/sdlc-analysis-standard/${file}`, import.meta.url),
        resolve(standard, file),
      );
    }
    let cwd = clone;
    let lintRuns = 0;
    const lintCommand = /<pre><code>(npm run intent:lint [^]*?)<\/code><\/pre>/u.exec(
      guideContent.stages.i4.steps[0]!.actions[0]!,
    )![1]!;
    const runLint = (): void => {
      cwd = standard;
      const command = lintCommand.replace(
        '&lt;абсолютный путь к вашему intent.md&gt;',
        resolve(clone, path),
      );
      assert.match(
        execFileSync('/bin/sh', ['-c', command], { cwd, env, encoding: 'utf8' }),
        /intent lint passed \(режим stage1\)/u,
      );
      lintRuns++;
    };
    let finalSha = '';
    for (const step of guideContent.stages.i4.steps.slice(2, 4)) {
      for (const action of step.actions.map((text) => text.replaceAll('\u00a0', ' '))) {
        if (action.includes('в Explorer создайте отдельную папку')) {
          await mkdir(resolve(clone, 'intents/clear-result'), { recursive: true });
          await writeFile(resolve(clone, path), intent);
        }
        if (action.includes('аналитик меняет только поле состояния')) {
          await writeFile(
            resolve(clone, path),
            intent.replace('Состояние: черновик', 'Состояние: принят'),
          );
        }
        if (action.includes('Повторите проверку линтером')) runLint();
        const command = /<pre><code>((?:git |cd )[^]*?)<\/code><\/pre>/u.exec(action)?.[1];
        if (!command) continue;
        if (command.startsWith('cd ')) {
          const restored = execFileSync(
            '/bin/sh',
            [
              '-c',
              `${command.replace('&lt;абсолютный путь к рабочей копии аналитика&gt;', clone)} && pwd`,
            ],
            { cwd, env, encoding: 'utf8' },
          );
          cwd = restored.trim();
          assert.equal(cwd, clone);
          continue;
        }
        const output = execFileSync('/bin/sh', ['-c', command], {
          cwd,
          env,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        if (command === 'git status --short') assert.equal(output, '');
        if (command === 'git status --short --untracked-files=all')
          assert.equal(output.trim(), `?? ${path}`);
        if (command.startsWith('git diff --cached')) {
          assert.match(output, /\+Состояние: (?:черновик|принят)/u);
          assert.equal(git(clone, 'diff', '--cached', '--name-only').trim(), path);
        }
        if (command === 'git rev-parse HEAD') finalSha = output.trim();
      }
    }
    assert.equal(lintRuns, 1, 'the final linter really ran from the separate course clone');
    assert.equal(cwd, clone, 'Git commands run only after explicit cwd restoration');
    assert.match(finalSha, /^[a-f0-9]{40}$/u);
    assert.equal(git(clone, 'rev-parse', 'origin/intent/clear-result').trim(), finalSha);
    assert.match(git(clone, 'show', `${finalSha}:${path}`), /Состояние: принят/u);
    assert.equal(await readFile(resolve(clone, 'intent.md'), 'utf8'), csvIntent);
    assert.equal(git(clone, 'diff', 'main', '--name-only').trim(), path);
    assert.equal(git(clone, 'status', '--short'), '');
  } finally {
    assert.ok(sandbox.startsWith(`${await realpath(tmpdir())}/intent-course-`));
    await rm(sandbox, { recursive: true, force: true });
  }
});
