import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test, { type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const isolatedProject = async (t: TestContext) => {
  await mkdir(join(ROOT, '.cache'), { recursive: true });
  const project = await mkdtemp(join(ROOT, '.cache', 'quality-gate-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  for (const name of [
    'package.json',
    'eslint.config.ts',
    'tsconfig.base.json',
    'tsconfig.eslint.json',
    '.prettierrc.json',
    '.prettierignore',
  ]) {
    await copyFile(join(ROOT, name), join(project, name));
  }
  await symlink(join(ROOT, 'node_modules'), join(project, 'node_modules'), 'dir');
  await mkdir(join(project, 'scripts'));
  return project;
};

const runTool = (project: string, binary: string, args: string[]) => {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', resolve(ROOT, 'node_modules', binary), ...args],
    {
      cwd: project,
      encoding: 'utf8',
      timeout: 120_000,
    },
  );
  assert.ifError(result.error);
  return result;
};

const cases = [
  ['safe', 'export const total = 1;\n', null],
  [
    'unsafe',
    'const value = JSON.parse("1"); console.log(value);\n',
    '@typescript-eslint/no-unsafe-assignment',
  ],
  ['floating', 'Promise.resolve(1);\n', '@typescript-eslint/no-floating-promises'],
  [
    'floating-subtest',
    "import test from 'node:test';\nawait test('parent', t => { t.test('child', () => {}); });\n",
    '@typescript-eslint/no-floating-promises',
  ],
  [
    'bypass',
    '/* eslint-disable @typescript-eslint/no-floating-promises */\nPromise.resolve(1);\n',
    '@typescript-eslint/no-floating-promises',
  ],
  [
    'complexity',
    `export function choose(value: number) {\n${Array.from({ length: 20 }, (_, index) => `if (value === ${index}) return ${index};`).join('\n')}\nreturn -1;\n}\n`,
    'complexity',
  ],
  [
    'function',
    `export function long() {\n${'console.log(1);\n'.repeat(100)}}\n`,
    'max-lines-per-function',
  ],
  ['file', '// source line\n'.repeat(501), 'max-lines'],
] as const;

await test('lint rejects semantic errors, limit violations and inline bypass while accepting safe code', async (t) => {
  const project = await isolatedProject(t);
  const directory = join(project, 'scripts');

  const paths: string[] = [];
  for (const [name, source] of cases) {
    const path = join(directory, `${name}.ts`);
    await writeFile(path, source);
    paths.push(path);
  }
  const result = runTool(project, 'eslint/bin/eslint.js', [
    '--flag',
    'unstable_native_nodejs_ts_config',
    '--max-warnings',
    '0',
    '--format',
    'json',
    ...paths,
  ]);
  assert.equal(result.status, 1, result.stderr);
  const parsed: unknown = JSON.parse(result.stdout);
  assert.ok(Array.isArray(parsed));
  const rows: unknown[] = parsed;
  const rulesByFile = new Map<string, string[]>();
  for (const row of rows) {
    assert.ok(row !== null && typeof row === 'object');
    assert.ok('filePath' in row && typeof row.filePath === 'string');
    assert.ok('messages' in row && Array.isArray(row.messages));
    const messages: unknown[] = row.messages;
    const rules: string[] = [];
    for (const message of messages) {
      assert.ok(message !== null && typeof message === 'object');
      assert.equal('fatal' in message ? message.fatal : false, false, JSON.stringify(message));
      if ('severity' in message && message.severity === 2) {
        assert.ok('ruleId' in message && typeof message.ruleId === 'string');
        rules.push(message.ruleId);
      }
    }
    rulesByFile.set(row.filePath, rules);
  }
  for (const [name, , expectedRule] of cases) {
    const path = join(directory, `${name}.ts`);
    assert.ok(rulesByFile.has(path), `${name}: fixture must be included`);
    const rules = rulesByFile.get(path) ?? [];
    if (expectedRule) assert.ok(rules.includes(expectedRule), `${name}: missing ${expectedRule}`);
    else assert.deepEqual(rules, [], 'safe source must pass');
  }
});

await test('format check accepts formatted source and rejects a real formatting violation', async (t) => {
  const project = await isolatedProject(t);
  const directory = join(project, 'scripts');
  const path = join(directory, 'format.ts');
  await writeFile(path, "export const label = 'ready';\n");
  const clean = runTool(project, 'prettier/bin/prettier.cjs', ['--check', path]);
  assert.equal(clean.status, 0, clean.stderr);
  await writeFile(path, 'export  const label="ready"');
  const invalid = runTool(project, 'prettier/bin/prettier.cjs', ['--check', path]);
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stdout + invalid.stderr, /Code style issues found/u);
});
