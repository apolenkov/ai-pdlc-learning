import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { checkListing, checkSiteArchive } from './check-site-archive.ts';

const pack = (cwd: string, archive: string, ...args: string[]): void => {
  const result = spawnSync('tar', ['-czf', archive, ...args], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
};

const makeTree = async (t: test.TestContext) => {
  const root = await mkdtemp(join(tmpdir(), 'site-archive-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tree = join(root, 'tree');
  await mkdir(join(tree, 'course'), { recursive: true });
  await writeFile(join(tree, 'index.html'), 'a'.repeat(1000));
  await writeFile(join(tree, 'course/index.html'), 'b'.repeat(500));
  return { root, tree };
};

await test('files and directories pass and the content is counted', async (t) => {
  const { root, tree } = await makeTree(t);
  const archive = join(root, 'ok.tar.gz');
  pack(tree, archive, '.');
  const report = await checkSiteArchive(archive);
  assert.equal(report.contentBytes, 1500);
  assert.ok(report.entries >= 3);
});

await test('content over the limit is rejected, at the limit it passes', async (t) => {
  const { root, tree } = await makeTree(t);
  const archive = join(root, 'ok.tar.gz');
  pack(tree, archive, '.');
  await assert.rejects(checkSiteArchive(archive, 1499), /more than 1499 bytes/u);
  assert.equal((await checkSiteArchive(archive, 1500)).contentBytes, 1500);
});

await test('a compressed bomb is cut at the limit, not unpacked', async (t) => {
  const { root, tree } = await makeTree(t);
  await writeFile(join(tree, 'zeros.bin'), Buffer.alloc(20 * 1024 * 1024));
  const archive = join(root, 'bomb.tar.gz');
  pack(tree, archive, '.');
  await assert.rejects(checkSiteArchive(archive, 1024 * 1024), /more than 1048576 bytes/u);
});

await test('a symbolic link is rejected by name', async (t) => {
  const { root, tree } = await makeTree(t);
  await symlink('/etc/passwd', join(tree, 'link.html'));
  const archive = join(root, 'link.tar.gz');
  pack(tree, archive, '.');
  await assert.rejects(checkSiteArchive(archive), /not a regular file or directory.*link\.html/u);
});

await test('absolute and parent paths are rejected', async (t) => {
  const { root, tree } = await makeTree(t);
  const absolute = join(root, 'abs.tar.gz');
  pack(root, absolute, '-P', join(tree, 'index.html'));
  await assert.rejects(checkSiteArchive(absolute), /absolute or parent path/u);
  const parent = join(root, 'parent.tar.gz');
  pack(tree, parent, '-P', '../tree/index.html');
  await assert.rejects(checkSiteArchive(parent), /absolute or parent path/u);
});

await test('listing rules: types, paths, pairing, empty', () => {
  checkListing(['./', './a.html'], ['drwxr-xr-x user/g 0 d ./', '-rw-r--r-- user/g 1 d ./a.html']);
  assert.throws(() => checkListing(['a'], ['hrw-r--r-- x']), /type "h".*: a/u);
  assert.throws(() => checkListing(['c'], ['crw-r--r-- x']), /type "c"/u);
  assert.throws(() => checkListing(['a/../b'], ['-rw-r--r-- x']), /parent path/u);
  assert.throws(() => checkListing(['/a'], ['-rw-r--r-- x']), /absolute/u);
  assert.throws(() => checkListing(['a', 'b'], ['-rw-r--r-- x']), /differ/u);
  assert.throws(() => checkListing([], []), /empty/u);
});

await test('the command line passes a good archive and fails on a bad one', async (t) => {
  const { root, tree } = await makeTree(t);
  const good = join(root, 'ok.tar.gz');
  pack(tree, good, '.');
  const run = (archive: string) =>
    spawnSync(
      process.execPath,
      ['--experimental-strip-types', resolve('scripts/check-site-archive.ts'), archive],
      {
        encoding: 'utf8',
      },
    );
  const ok = run(good);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /1500 bytes of content/u);
  await symlink('x', join(tree, 'l'));
  const bad = join(root, 'bad.tar.gz');
  pack(tree, bad, '.');
  assert.notEqual(run(bad).status, 0);
});
