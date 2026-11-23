import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import manifest from '../package.json' with { type: 'json' };

const run = promisify(execFile);

const gate = manifest.scripts['audit:high'];

const advisory = (severity: string) => ({
  'audit-fixture': [
    {
      id: 1,
      url: 'https://example.invalid/advisory/1',
      title: `synthetic ${severity} advisory`,
      severity,
      vulnerable_versions: '<2.0.0',
      cwe: [],
      cvss: { score: 0, vectorString: null },
    },
  ],
});

const lockfile = {
  name: 'audit-fixture-project',
  version: '1.0.0',
  lockfileVersion: 3,
  requires: true,
  packages: {
    '': {
      name: 'audit-fixture-project',
      version: '1.0.0',
      dependencies: { 'audit-fixture': '1.0.0' },
    },
    'node_modules/audit-fixture': {
      version: '1.0.0',
      resolved: 'https://registry.npmjs.org/audit-fixture/-/audit-fixture-1.0.0.tgz',
      integrity:
        'sha512-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
    },
  },
};

const packument = {
  name: 'audit-fixture',
  'dist-tags': { latest: '2.0.0' },
  versions: Object.fromEntries(
    ['1.0.0', '2.0.0'].map((version) => [
      version,
      {
        name: 'audit-fixture',
        version,
        dist: {
          tarball: `https://registry.npmjs.org/audit-fixture/-/audit-fixture-${version}.tgz`,
        },
      },
    ]),
  ),
};

/** Runs the repository's own audit gate against a lock-only project and a loopback registry. */
async function runGate(respond: (response: import('node:http').ServerResponse) => void) {
  const registry = createServer((request, response) => {
    request.resume();
    if (request.method === 'GET') json(packument)(response);
    else respond(response);
  });
  await new Promise<void>((done) => registry.listen(0, '127.0.0.1', done));
  const project = await mkdtemp(join(tmpdir(), 'audit-gate-'));
  try {
    const address = registry.address();
    assert.ok(address && typeof address === 'object', 'loopback registry must listen on a port');
    const { port } = address;
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify({
        name: 'audit-fixture-project',
        version: '1.0.0',
        dependencies: { 'audit-fixture': '1.0.0' },
      }),
    );
    await writeFile(join(project, 'package-lock.json'), JSON.stringify(lockfile));
    const env = {
      PATH: process.env.PATH,
      HOME: project,
      npm_config_registry: `http://127.0.0.1:${port}/`,
      npm_config_cache: join(project, '.npm-cache'),
      npm_config_fetch_retries: '0',
    };
    // Async on purpose: the loopback registry lives in this process and must keep serving.
    return await run('sh', ['-c', gate ?? 'false'], { cwd: project, env, timeout: 60_000 }).then(
      ({ stdout, stderr }) => ({ status: 0, output: stdout + stderr }),
      (error: { code?: number | string; stdout?: string; stderr?: string }) => ({
        status: error.code ?? 1,
        output: `${error.stdout ?? ''}${error.stderr ?? ''}`,
      }),
    );
  } finally {
    await new Promise<void>((done) => registry.close(() => done()));
    await rm(project, { recursive: true, force: true });
  }
}

const json = (body: unknown) => (response: import('node:http').ServerResponse) => {
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
};

await test('the audit gate is the plain high-level npm audit over the lockfile', () => {
  assert.equal(gate, 'npm audit --audit-level=high');
});

await test('the audit gate fails on a synthetic high or critical advisory and passes on a clean or moderate result', async () => {
  for (const severity of ['high', 'critical']) {
    const result = await runGate(json(advisory(severity)));
    assert.notEqual(result.status, 0, `${severity}: ${result.output}`);
    assert.match(
      result.output,
      /vulnerabilit/u,
      `${severity}: the gate must fail because of the advisory`,
    );
  }
  for (const body of [{}, advisory('moderate')]) {
    const result = await runGate(json(body));
    assert.equal(result.status, 0, `${result.output}`);
  }
});

await test('the audit gate fails closed when the advisory endpoint is broken', async () => {
  const unavailable = await runGate((response) => {
    response.statusCode = 503;
    response.end('unavailable');
  });
  assert.notEqual(unavailable.status, 0, `${unavailable.output}`);
  const dropped = await runGate((response) => {
    response.destroy();
  });
  assert.notEqual(dropped.status, 0, `${dropped.output}`);
});
