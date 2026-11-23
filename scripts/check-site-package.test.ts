import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { checkSitePackage, MAX_ARCHIVE_BYTES, MAX_UNPACKED_KIB } from './check-site-package.ts';

const makeSite = async (t: test.TestContext, withCourse = true) => {
  const root = await mkdtemp(join(tmpdir(), 'site-package-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = join(root, 'public');
  await mkdir(join(site, 'course/guides'), { recursive: true });
  await writeFile(join(site, 'index.html'), '<html></html>');
  if (withCourse) await writeFile(join(site, 'course/guides/index.html'), '<html></html>');
  const archive = join(root, 'site.tar.gz');
  await writeFile(archive, Buffer.alloc(1000));
  return { site, archive };
};

await test('the limits are the 200 MiB of Pages', () => {
  assert.equal(MAX_ARCHIVE_BYTES, 200 * 1024 * 1024);
  assert.equal(MAX_UNPACKED_KIB, 200 * 1024);
});

await test('a small site passes and the report shows the headroom to the limits', async (t) => {
  const { site, archive } = await makeSite(t);
  const report = await checkSitePackage(site, archive);
  assert.equal(report.archiveBytes, 1000);
  assert.equal(report.archiveHeadroomBytes, MAX_ARCHIVE_BYTES - 1000);
  assert.ok(report.unpackedKib > 0);
  assert.equal(report.unpackedHeadroomKib, MAX_UNPACKED_KIB - report.unpackedKib);
});

await test('an archive over the limit is rejected, one at the limit passes', async (t) => {
  const { site, archive } = await makeSite(t);
  await assert.rejects(
    checkSitePackage(site, archive, { maxArchiveBytes: 999 }),
    /1000 bytes, limit 999/u,
  );
  assert.equal(
    (await checkSitePackage(site, archive, { maxArchiveBytes: 1000 })).archiveHeadroomBytes,
    0,
  );
});

await test('an unpacked tree over the limit is rejected', async (t) => {
  const { site, archive } = await makeSite(t);
  await writeFile(join(site, 'big.bin'), Buffer.alloc(300 * 1024, 1));
  await assert.rejects(checkSitePackage(site, archive, { maxUnpackedKib: 100 }), /KiB, limit 100/u);
  const report = await checkSitePackage(site, archive, { maxUnpackedKib: 100_000 });
  assert.ok(report.unpackedKib >= 300);
});

await test('a missing or empty required page is rejected by name', async (t) => {
  const { site, archive } = await makeSite(t, false);
  await assert.rejects(checkSitePackage(site, archive), /course\/guides\/index\.html/u);
  await writeFile(join(site, 'course/guides/index.html'), '');
  await assert.rejects(
    checkSitePackage(site, archive),
    /missing or empty: course\/guides\/index\.html/u,
  );
  await writeFile(join(site, 'course/guides/index.html'), 'x');
  await rm(join(site, 'index.html'));
  await assert.rejects(checkSitePackage(site, archive), /missing or empty: index\.html/u);
});

await test('the command line prints the sizes and fails on a broken package', async (t) => {
  const { site, archive } = await makeSite(t);
  const run = (...args: string[]) =>
    spawnSync(
      process.execPath,
      ['--experimental-strip-types', resolve('scripts/check-site-package.ts'), ...args],
      {
        encoding: 'utf8',
      },
    );
  const ok = run(site, archive);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /headroom/u);
  await rm(join(site, 'index.html'));
  assert.notEqual(run(site, archive).status, 0);
});
