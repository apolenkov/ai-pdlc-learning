import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createUpdatePlan } from '../tools/update-standard.ts';

const standardRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = resolve(standardRoot, '../..');

await test('dry-run patch changes only the version pin and preserves local context', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sdlc-standard-'));
  const standard = join(root, 'standard');
  const product = join(root, 'product');
  await Promise.all([mkdir(standard, { recursive: true }), mkdir(product, { recursive: true })]);
  await writeFile(join(standard, 'VERSION'), '0.2.0\n');
  await writeFile(
    join(standard, 'manifest.json'),
    JSON.stringify({ version: '0.2.0', protectedProductPaths: ['CONTEXT.md'] }),
  );
  const context = '# Local product decision\nKeep this wording.\n';
  await writeFile(join(product, 'CONTEXT.md'), context);
  await writeFile(
    join(product, 'guides.lock.yaml'),
    'schema: sdlc-guide-lock/v1\nstandard_version: 0.1.0-draft\n',
  );
  try {
    const plan = await createUpdatePlan({ standardRoot: standard, productRoot: product });
    assert.equal(plan.status, 'update-available');
    assert.deepEqual(plan.changedPaths, ['guides.lock.yaml']);
    assert.ok(plan.protectedPaths.includes('CONTEXT.md'));
    assert.match(plan.patch, /standard_version: 0\.2\.0/);
    assert.doesNotMatch(plan.patch, /Keep this wording/);
    assert.equal(await readFile(join(product, 'CONTEXT.md'), 'utf8'), context);
    assert.equal(
      await readFile(join(product, 'guides.lock.yaml'), 'utf8'),
      'schema: sdlc-guide-lock/v1\nstandard_version: 0.1.0-draft\n',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

await test('update CLI emits an applicable patch and preserves quoted lock context in a Unicode path', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'sdlc update ü space '));
  const standard = join(temporaryRoot, 'standard package');
  const patchPath = join(temporaryRoot, 'update.patch');
  try {
    await cp(standardRoot, standard, { recursive: true });
    await symlink(join(repositoryRoot, 'node_modules'), join(standard, 'node_modules'), 'dir');
    const product = join(standard, 'examples/product-meta');
    const lockPath = join(product, 'guides.lock.yaml');
    const sourceLock =
      'schema: sdlc-guide-lock/v1\nstandard_version: "0.0.8" # owner note\nproduct_extension: keep this field\n';
    const updatedLock =
      'schema: sdlc-guide-lock/v1\nstandard_version: "0.1.0-draft" # owner note\nproduct_extension: keep this field\n';
    await writeFile(lockPath, sourceLock);
    execFileSync('git', ['init', '--quiet'], { cwd: product, encoding: 'utf8' });

    const cliOutput = execFileSync(
      process.execPath,
      [
        '--experimental-strip-types',
        'tools/update-standard.ts',
        '--mode',
        'patch',
        '--product',
        product,
        '--output',
        patchPath,
      ],
      { cwd: standard, encoding: 'utf8' },
    );
    assert.match(cliOutput, /diff --git a\/guides\.lock\.yaml b\/guides\.lock\.yaml/u);
    assert.match(await readFile(patchPath, 'utf8'), /-standard_version: "0\.0\.8" # owner note/u);
    execFileSync('git', ['apply', '--check', patchPath], { cwd: product, encoding: 'utf8' });
    execFileSync('git', ['apply', patchPath], { cwd: product, encoding: 'utf8' });
    assert.equal(await readFile(lockPath, 'utf8'), updatedLock);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
