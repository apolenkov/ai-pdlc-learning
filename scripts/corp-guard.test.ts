import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rename, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

// corp-guard.py on throwaway repositories with a synthetic stop list: no real address is used here.
const GUARD = join(process.cwd(), 'scripts', 'corp-guard.py');
const HOST = 'secret.example.invalid';
const ZERO = '0'.repeat(40);

interface Run {
  status: number | null;
  stderr: string;
}

interface Repo {
  root: string;
  work: string;
  git: (...args: string[]) => string;
  gitInput: (input: string, ...args: string[]) => string;
  write: (path: string, data: string | Buffer) => Promise<void>;
  commit: (message: string) => string;
  guard: (args: string[], input?: string) => Run;
  push: (remote: string, url: string, lines: string[]) => Run;
}

const makeRepo = async (t: test.TestContext): Promise<Repo> => {
  const root = await mkdtemp(join(tmpdir(), 'corp-guard-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const work = join(root, 'work');
  const env = { ...process.env } as Record<string, string | undefined>;
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  Object.assign(env, {
    GIT_AUTHOR_NAME: 't',
    GIT_AUTHOR_EMAIL: 't@example.com',
    GIT_COMMITTER_NAME: 't',
    GIT_COMMITTER_EMAIL: 't@example.com',
    CORP_GUARD_STOPLIST: join(root, 'stoplist.tsv'),
    CORP_GUARD_ALLOW: join(root, 'allow.tsv'),
  });
  await writeFile(
    join(root, 'stoplist.tsv'),
    `# synthetic rules\nhost\tsecret(\\\\*\\.)example(\\\\*\\.)invalid\nCS:Name\tZorbex\n`,
  );
  const gitInput = (input: string, ...args: string[]): string => {
    const result = spawnSync('git', args, { cwd: work, env, input, encoding: 'utf8' });
    assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
    return result.stdout.trim();
  };
  const git = (...args: string[]): string => gitInput('', ...args);
  assert.equal(spawnSync('git', ['init', '-q', '-b', 'main', work], { env }).status, 0);
  git('config', 'commit.gpgsign', 'false');
  git('config', 'tag.gpgsign', 'false');
  git('config', 'core.hooksPath', join(root, 'no-hooks'));
  const write = async (path: string, data: string | Buffer): Promise<void> => {
    await mkdir(join(work, path, '..'), { recursive: true });
    await writeFile(join(work, path), data);
  };
  const commit = (message: string): string => {
    git('add', '-A');
    git('commit', '-q', '--allow-empty', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  const guard = (args: string[], input = ''): Run => {
    const result = spawnSync('python3', [GUARD, ...args], {
      cwd: work,
      env,
      input,
      encoding: 'utf8',
    });
    return { status: result.status, stderr: result.stderr };
  };
  const push = (remote: string, url: string, lines: string[]): Run =>
    guard(['pre-push', remote, url], `${lines.join('\n')}\n`);
  return { root, work, git, gitInput, write, commit, guard, push };
};

const ref = (sha: string, remoteSha = ZERO, name = 'refs/heads/main'): string =>
  `${name} ${sha} ${name} ${remoteSha}`;

const utf16 = (text: string, order: 'le' | 'be', bom: boolean): Buffer => {
  const le = Buffer.from(text, 'utf16le');
  const body = order === 'le' ? le : Buffer.from(le).swap16();
  if (!bom) return body;
  return Buffer.concat([Buffer.from(order === 'le' ? [0xff, 0xfe] : [0xfe, 0xff]), body]);
};

const blocked = (run: Run, label: string): void => {
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, new RegExp(`^  ${label}: `, 'mu'));
  assert.doesNotMatch(
    run.stderr,
    /secret\.example\.invalid|Zorbex/u,
    'the match itself is never printed',
  );
};

await test('every mode fails without the stop list', async (t) => {
  const repo = await makeRepo(t);
  await rm(join(repo.root, 'stoplist.tsv'));
  for (const args of [['pre-commit'], ['pre-push', 'origin', 'x']]) {
    const run = repo.guard(args);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /stop list not found/u);
  }
});

await test('without a stop list the message names the opt-out; CORP_GUARD_STOPLIST=none skips every mode out loud', async (t) => {
  const repo = await makeRepo(t);
  await rm(join(repo.root, 'stoplist.tsv'));
  assert.match(
    repo.guard(['pre-commit']).stderr,
    /CORP_GUARD_STOPLIST=none, see CONTRIBUTING\.md/u,
  );
  await repo.write('notes.md', `see https://${HOST}/x\n`);
  repo.git('add', '-A');
  for (const args of [
    ['pre-commit'],
    ['commit-msg', join(repo.root, 'msg')],
    ['pre-push', 'origin', 'x'],
  ]) {
    const result = spawnSync('python3', [GUARD, ...args], {
      cwd: repo.work,
      // A home without the default stop list: the contributor's machine.
      env: { ...process.env, CORP_GUARD_STOPLIST: 'none', HOME: repo.root },
      input: '',
      encoding: 'utf8',
    });
    const mode = args[0] ?? '';
    assert.equal(result.status, 0, mode);
    assert.match(
      result.stderr,
      new RegExp(`corp-guard \\(${mode}\\): skipped, CORP_GUARD_STOPLIST=none`, 'u'),
    );
  }
});

await test('a stop list at the default path wins over CORP_GUARD_STOPLIST=none left in the shell', async (t) => {
  const repo = await makeRepo(t);
  const config = join(repo.root, 'home/.config/customdev-learning');
  await mkdir(config, { recursive: true });
  await rename(join(repo.root, 'stoplist.tsv'), join(config, 'stoplist.tsv'));
  await repo.write('notes.md', `see https://${HOST}/x\n`);
  repo.git('add', '-A');
  const result = spawnSync('python3', [GUARD, 'pre-commit'], {
    cwd: repo.work,
    env: { ...process.env, CORP_GUARD_STOPLIST: 'none', HOME: join(repo.root, 'home') },
    encoding: 'utf8',
  });
  assert.match(result.stderr, /CORP_GUARD_STOPLIST=none ignored/u);
  blocked(result, 'host');
});

await test('pre-commit checks staged content, paths and type changes (status T)', async (t) => {
  const repo = await makeRepo(t);
  await repo.write('clean.txt', 'nothing here\n');
  assert.equal(repo.guard(['pre-commit']).status, 0);
  await repo.write('notes.md', `see https://${HOST}/x\n`);
  repo.git('add', '-A');
  blocked(repo.guard(['pre-commit']), 'host');
  repo.git('rm', '-q', '--cached', 'notes.md');
  await repo.write(`docs/${HOST}.md`, 'clean\n');
  repo.git('add', '-A');
  blocked(repo.guard(['pre-commit']), 'host');
  repo.git('rm', '-q', '--cached', `docs/${HOST}.md`);
  await rm(join(repo.work, 'docs'), { recursive: true });
  await unlink(join(repo.work, 'notes.md'));
  repo.commit('clean');
  await unlink(join(repo.work, 'clean.txt'));
  await symlink(`../${HOST}/target`, join(repo.work, 'clean.txt'));
  repo.git('add', '-A');
  assert.match(repo.git('diff', '--cached', '--name-status'), /^T\tclean\.txt$/mu);
  blocked(repo.guard(['pre-commit']), 'host');
});

await test('commit-msg checks the message, case rules keep their case', async (t) => {
  const repo = await makeRepo(t);
  const msg = join(repo.root, 'MSG');
  await writeFile(msg, 'fix: mention zorbex in lower case\n');
  assert.equal(repo.guard(['commit-msg', msg]).status, 0);
  await writeFile(msg, 'fix: thanks Zorbex\n');
  blocked(repo.guard(['commit-msg', msg]), 'Name');
  await writeFile(msg, `fix: link ${HOST.toUpperCase()}\n`);
  blocked(repo.guard(['commit-msg', msg]), 'host');
});

await test('a new branch is checked against its whole history, not against other remotes', async (t) => {
  const repo = await makeRepo(t);
  const bare = join(repo.root, 'corp.git');
  assert.equal(spawnSync('git', ['init', '-q', '--bare', bare]).status, 0);
  await repo.write('old.md', `${HOST}\n`);
  repo.commit('old history');
  repo.git('remote', 'add', 'corp', bare);
  repo.git('push', '-q', 'corp', 'main');
  await repo.write('old.md', 'cleaned\n');
  const head = repo.commit('clean on top');
  // The history is on `corp`, but the push goes to another remote: it must be checked in full.
  blocked(repo.push('public', 'https://public.example/x.git', [ref(head)]), 'host');
  blocked(repo.push(bare, bare, [ref(head, ZERO, 'refs/heads/other')]), 'host');
  // Same remote name, different URL: its tracking refs prove nothing.
  blocked(repo.push('corp', 'https://elsewhere.example/x.git', [ref(head)]), 'host');
  // The target remote itself already has the old commit: only the new one is checked.
  assert.equal(repo.push('corp', bare, [ref(head, ZERO, 'refs/heads/other')]).status, 0);
  // A remote sha this repository does not know falls back to the full check.
  blocked(repo.push('public', 'https://public.example/x.git', [ref(head, 'f'.repeat(40))]), 'host');
});

await test('pre-push checks commit messages, author and committer', async (t) => {
  const repo = await makeRepo(t);
  repo.git('commit', '-q', '--allow-empty', '-m', 'clean');
  const base = repo.git('rev-parse', 'HEAD');
  repo.git('commit', '-q', '--allow-empty', '-m', `docs: ${HOST}`);
  blocked(repo.push('o', 'u', [ref(repo.git('rev-parse', 'HEAD'), base)]), 'host');
  repo.git('reset', '-q', '--hard', base);
  repo.git('commit', '-q', '--allow-empty', '-m', 'ok', '--author', `x <x@${HOST}>`);
  blocked(repo.push('o', 'u', [ref(repo.git('rev-parse', 'HEAD'), base)]), 'host');
});

await test('annotated tags: message, tagger and nested tags', async (t) => {
  const repo = await makeRepo(t);
  const head = repo.commit('clean');
  const tagRef = (name: string): string =>
    ref(repo.git('rev-parse', name), ZERO, `refs/tags/${name}`);
  repo.git('tag', '-a', 'v1', '-m', 'release');
  assert.equal(repo.push('o', 'u', [tagRef('v1')]).status, 0);
  repo.git('tag', '-a', 'v2', '-m', `release for ${HOST}`);
  blocked(repo.push('o', 'u', [tagRef('v2')]), 'host');
  const tagger = `object ${head}\ntype commit\ntag v3\ntagger t <t@${HOST}> 1700000000 +0000\n\nrelease\n`;
  repo.git(
    'update-ref',
    'refs/tags/v3',
    repo.gitInput(tagger, 'hash-object', '-t', 'tag', '-w', '--stdin'),
  );
  blocked(repo.push('o', 'u', [tagRef('v3')]), 'host');
  repo.git('tag', '-a', 'inner', head, '-m', `inner ${HOST}`);
  repo.git('tag', '-a', 'outer', 'inner', '-m', 'outer is clean');
  repo.git('tag', '-d', 'inner');
  blocked(repo.push('o', 'u', [tagRef('outer')]), 'host');
  blocked(repo.push('o', 'u', [ref(head, ZERO, `refs/tags/${HOST}`)]), 'host');
});

await test('NUL is never safe: UTF-16 with and without BOM, strings inside binaries', async (t) => {
  const repo = await makeRepo(t);
  const base = repo.commit('base');
  const cases: [string, Buffer][] = [
    ['utf-16le with BOM', utf16(`see ${HOST}\n`, 'le', true)],
    ['utf-16be with BOM', utf16(`see ${HOST}\n`, 'be', true)],
    ['utf-16le without BOM', utf16(`plain text ${HOST}\n`, 'le', false)],
    ['utf-16be without BOM', utf16(`plain text ${HOST}\n`, 'be', false)],
    ['NUL then ASCII', Buffer.concat([Buffer.from([0, 1, 2, 0xff]), Buffer.from(HOST)])],
    [
      'UTF-16 inside a binary',
      Buffer.concat([Buffer.from([0x89, 0, 7]), utf16(HOST, 'le', false)]),
    ],
  ];
  for (const [name, data] of cases) {
    repo.git('reset', '-q', '--hard', base);
    await repo.write('file.bin', data);
    repo.git('add', '-A');
    blocked(repo.guard(['pre-commit']), 'host');
    const head = repo.commit(name);
    blocked(repo.push('o', 'u', [ref(head, base)]), 'host');
  }
});

await test('a reviewed binary listed by blob hash is skipped, its path is still checked', async (t) => {
  const repo = await makeRepo(t);
  const base = repo.commit('base');
  await repo.write('sound.mp3', Buffer.concat([Buffer.from([0xff, 0xfb, 0]), Buffer.from(HOST)]));
  const head = repo.commit('audio');
  blocked(repo.push('o', 'u', [ref(head, base)]), 'host');
  const blob = repo.git('rev-parse', 'HEAD:sound.mp3');
  await writeFile(join(repo.root, 'allow.tsv'), `# reviewed\n${blob}\trandom audio bytes\n`);
  assert.equal(repo.push('o', 'u', [ref(head, base)]).status, 0);
  repo.git('mv', 'sound.mp3', `${HOST}.mp3`);
  blocked(repo.push('o', 'u', [ref(repo.commit('rename'), head)]), 'host');
});

await test('paths of the whole pushed tree are checked, also when the blob is old', async (t) => {
  const repo = await makeRepo(t);
  await repo.write('a/b/plain.txt', 'clean\n');
  const base = repo.commit('base');
  repo.git('mv', 'a/b/plain.txt', `a/b/${HOST}.txt`);
  const renamed = repo.commit('rename only');
  const run = repo.push('o', 'u', [ref(renamed, base)]);
  blocked(run, 'host');
  assert.match(run.stderr, /path a\/b\/\[redacted\]\.txt/u);
  await repo.write('later.txt', 'clean\n');
  // The bad path came earlier, the pushed commit only adds a clean file: its full tree still has it.
  blocked(repo.push('o', 'u', [ref(repo.commit('later'), renamed)]), 'host');
});

await test('the allow list takes only 40-hex blob ids and never covers messages or commits', async (t) => {
  const repo = await makeRepo(t);
  const msg = join(repo.root, 'MSG');
  await writeFile(msg, `fix: ${HOST}\n`);
  for (const bad of ['\tno sha\n', 'abc\tshort\n', `${'A'.repeat(40)}\tupper case\n`]) {
    await writeFile(join(repo.root, 'allow.tsv'), bad);
    const run = repo.guard(['commit-msg', msg]);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /expected <40-hex blob id>/u);
  }
  const base = repo.commit('base');
  repo.git('commit', '-q', '--allow-empty', '-m', `docs: ${HOST}`);
  const head = repo.git('rev-parse', 'HEAD');
  await writeFile(join(repo.root, 'allow.tsv'), `${head}\tcommit id is not a blob\n`);
  blocked(repo.guard(['commit-msg', msg]), 'host');
  blocked(repo.push('o', 'u', [ref(head, base)]), 'host');
});

await test('a value split into quoted pieces is checked as one string', async (t) => {
  const repo = await makeRepo(t);
  await repo.write('a.ts', "const host = ['sec', 'ret.example', '.invalid'].join('');\n");
  repo.git('add', '-A');
  blocked(repo.guard(['pre-commit']), 'host');
  await repo.write('a.ts', 'const host = "secret.exa" + "mple.invalid";\n');
  repo.git('add', '-A');
  blocked(repo.guard(['pre-commit']), 'host');
  await repo.write('a.ts', "const list = ['secret', 'example'];\n");
  repo.git('add', '-A');
  assert.equal(repo.guard(['pre-commit']).status, 0);
});
