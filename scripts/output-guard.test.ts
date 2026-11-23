import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { assertSafeOutputDir, bundleMotion } from './build-learning-pages.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** A synthetic repository root with a real dist/ and an unrelated directory outside it. */
async function fixture(t: test.TestContext) {
  // Inside the repository's .cache, not the system temp directory: everything under temp is admitted by design.
  await mkdir(join(REPO, '.cache'), { recursive: true });
  const sandbox = await mkdtemp(join(REPO, '.cache', 'output-guard-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const root = join(sandbox, 'repo');
  const outside = join(sandbox, 'outside');
  await mkdir(join(root, 'dist'), { recursive: true });
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(outside);
  return { root, outside, sandbox };
}

await test('the guard admits descendants of dist/ and .cache/, existing or not yet created', async (t) => {
  const { root } = await fixture(t);
  for (const dir of ['dist/site', 'dist/a/b/c', '.cache/site', '.cache/a/b'])
    assert.equal(await assertSafeOutputDir(dir, root), resolve(root, dir), dir);
});

await test('the guard admits a fresh directory inside the system temp directory', async (t) => {
  const { root } = await fixture(t);
  const temp = await mkdtemp(join(tmpdir(), 'output-guard-temp-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  assert.equal(await assertSafeOutputDir(join(temp, 'site'), root), join(temp, 'site'));
});

await test('the guard refuses roots, siblings, parents and look-alike names', async (t) => {
  const { root, outside } = await fixture(t);
  for (const dir of [
    '.',
    'dist',
    '.cache',
    '..',
    '../outside',
    'src/site',
    'distribution/site',
    '.cache-old/site',
    'dist/../src',
    'dist/../../outside',
    outside,
    tmpdir(),
    '/',
  ])
    await assert.rejects(() => assertSafeOutputDir(dir, root), /Refusing output/u, dir);
});

await test('the guard refuses a symlink anywhere on the way, including dist/ itself', async (t) => {
  const { root, outside } = await fixture(t);
  await symlink(outside, join(root, 'dist', 'link'));
  await assert.rejects(() => assertSafeOutputDir('dist/link/site', root), /symlink component/u);
  await assert.rejects(() => assertSafeOutputDir('dist/link', root), /symlink component/u);

  await rm(join(root, 'dist'), { recursive: true });
  await symlink(outside, join(root, 'dist'));
  await assert.rejects(() => assertSafeOutputDir('dist/site', root), /symlink component/u);

  const temp = await mkdtemp(join(tmpdir(), 'output-guard-temp-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  await symlink(outside, join(temp, 'viaLink'));
  await assert.rejects(
    () => assertSafeOutputDir(join(temp, 'viaLink', 'site'), root),
    /symlink component/u,
  );
});

await test('the guard refuses a root reached through a symlinked ancestor that leaves the allowed directory', async (t) => {
  const { sandbox, outside } = await fixture(t);
  const realRoot = join(sandbox, 'realRoot');
  await mkdir(join(realRoot, 'dist'), { recursive: true });
  const linkedRoot = join(sandbox, 'linkedRoot');
  await symlink(realRoot, linkedRoot);
  assert.equal(
    await assertSafeOutputDir('dist/site', linkedRoot),
    join(linkedRoot, 'dist', 'site'),
  );
  await assert.rejects(() => assertSafeOutputDir(outside, linkedRoot), /Refusing output/u);
});

await test('motion bundle is the minified self-contained classic script of course-motion.ts', async () => {
  const bundle = await bundleMotion();
  // The entry point is the course motion module: its own DOM hooks end up in the output.
  assert.ok(bundle.includes('data-motion'));
  // Minified IIFE: a classic script with no indentation and no source-path comments.
  assert.ok(bundle.startsWith('(()=>{'));
  assert.doesNotMatch(bundle, /\n {2}|\/\/ node_modules/u);
  // Bundled: dependencies are inlined, so the file needs no module loader.
  assert.doesNotMatch(bundle, /\brequire\(|^\s*(?:import|export)\b/mu);
});
