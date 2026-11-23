import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import manifest from '../package.json' with { type: 'json' };

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const cruiser = join(root, 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs');
const config = join(root, '.dependency-cruiser.mjs');

const clean = {
  'scripts/a.ts': "import { b } from './b.ts';\nexport const a = b;\n",
  'scripts/b.ts': 'export const b = 1;\n',
  'docs/pages/page.ts':
    "import type { T } from '../../scripts/types.ts';\nexport const x: T = 1;\n",
  'scripts/types.ts': 'export type T = number;\n',
};

/** Cruises a synthetic project with the repository's own rules and reports the exit status. */
async function cruise(files: Record<string, string>) {
  const project = await mkdtemp(join(tmpdir(), 'boundaries-gate-'));
  try {
    const all = {
      'tsconfig.pages.json':
        '{"compilerOptions":{"allowImportingTsExtensions":true,"noEmit":true}}',
      ...files,
    };
    for (const [name, text] of Object.entries(all)) {
      await mkdir(dirname(join(project, name)), { recursive: true });
      await writeFile(join(project, name), text);
    }
    return await run(
      'node',
      [cruiser, '--config', config, 'scripts', 'docs/pages', '--output-type', 'err'],
      {
        cwd: project,
        timeout: 60_000,
      },
    ).then(
      ({ stdout, stderr }) => ({ status: 0, output: stdout + stderr }),
      (error: { code?: number | string; stdout?: string; stderr?: string }) => ({
        status: error.code ?? 1,
        output: `${error.stdout ?? ''}${error.stderr ?? ''}`,
      }),
    );
  } finally {
    await rm(project, { recursive: true, force: true });
  }
}

await test('the boundaries gate is the repository dependency-cruiser configuration', () => {
  assert.equal(
    manifest.scripts.boundaries,
    'depcruise --config .dependency-cruiser.mjs scripts docs/pages standards',
  );
});

await test('the boundaries gate accepts a layered project with type-only browser imports', async () => {
  const result = await cruise(clean);
  assert.equal(result.status, 0, result.output);
});

await test('the boundaries gate rejects cycles, runtime script imports from browser code, and production code importing tests', async () => {
  const cases: Array<[string, Record<string, string>]> = [
    [
      'no-circular',
      { ...clean, 'scripts/b.ts': "import { a } from './a.ts';\nexport const b = a;\n" },
    ],
    [
      'browser-code-not-to-node-scripts',
      {
        ...clean,
        'docs/pages/page.ts': "import { b } from '../../scripts/b.ts';\nexport const x = b;\n",
      },
    ],
    [
      'not-to-test-from-production',
      {
        ...clean,
        'scripts/b.test.ts': 'export const t = 1;\n',
        'scripts/a.ts': "import { t } from './b.test.ts';\nexport const a = t;\n",
      },
    ],
    [
      'not-to-private-or-generated',
      {
        ...clean,
        'dist/out.ts': 'export const o = 1;\n',
        'scripts/a.ts': "import { o } from '../dist/out.ts';\nexport const a = o;\n",
      },
    ],
    [
      'browser-code-not-to-node-core',
      {
        ...clean,
        'docs/pages/page.ts':
          "import { readFileSync } from 'node:fs';\nexport const x = readFileSync;\n",
      },
    ],
    [
      'not-to-unresolvable',
      {
        ...clean,
        'scripts/a.ts': "import { missing } from './missing.ts';\nexport const a = missing;\n",
      },
    ],
  ];
  for (const [rule, files] of cases) {
    const result = await cruise(files);
    assert.notEqual(result.status, 0, `${rule}: ${result.output}`);
    assert.match(result.output, new RegExp(rule, 'u'), `${rule}: ${result.output}`);
  }
});

const hook = await readFile(join(root, '.lefthook/pre-push/local-checks.sh'), 'utf8');

await test('pre-push runs the boundaries, coverage and mutation gates', () => {
  for (const gate of [
    'boundaries',
    'test:coverage',
    'mutation:credit',
    'mutation:guard',
    'mutation:course-map',
  ]) {
    assert.ok(
      hook.split('\n').some((line) => line.trim() === `npm run ${gate}`),
      gate,
    );
  }
});

await test('the coverage gate counts an unloaded production file as uncovered and fails below the floor', async () => {
  const c8 = join(root, 'node_modules/c8/bin/c8.js');
  const coverageConfig = join(root, '.c8rc.json');
  const project = await mkdtemp(join(tmpdir(), 'coverage-gate-'));
  try {
    const files: Record<string, string> = {
      'package.json': '{"type":"module"}',
      'scripts/loaded.ts': 'export const double = (n: number) => n * 2;\n',
      'scripts/loaded.test.ts':
        "import assert from 'node:assert/strict';\nimport test from 'node:test';\nimport { double } from './loaded.ts';\ntest('double', () => assert.equal(double(2), 4));\n",
    };
    const write = async () => {
      for (const [name, text] of Object.entries(files)) {
        await mkdir(dirname(join(project, name)), { recursive: true });
        await writeFile(join(project, name), text);
      }
    };
    const gate = () =>
      run(
        'node',
        [
          c8,
          '--config',
          coverageConfig,
          'node',
          '--experimental-strip-types',
          '--test',
          'scripts/loaded.test.ts',
        ],
        {
          cwd: project,
          // Clean env: the outer runner's NODE_TEST_CONTEXT/NODE_V8_COVERAGE must not leak into the inner run.
          env: { PATH: process.env.PATH, HOME: project },
          timeout: 60_000,
        },
      ).then(
        () => 0,
        (error: { code?: number }) => error.code ?? 1,
      );
    await write();
    assert.equal(await gate(), 0, 'a fully covered project passes the floor');
    files['scripts/unloaded.ts'] =
      Array.from({ length: 40 }, (_, i) => `export const f${i} = () => ${i};`).join('\n') + '\n';
    await write();
    assert.notEqual(
      await gate(),
      0,
      'an unloaded production file must pull coverage below the floor',
    );
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});
