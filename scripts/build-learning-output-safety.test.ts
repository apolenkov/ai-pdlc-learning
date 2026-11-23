import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildLearningSite } from './build-learning-pages.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await test('build refuses a symlinked output parent before deleting external files', async (t) => {
  const cache = join(ROOT, '.cache');
  await mkdir(cache, { recursive: true });
  const sandbox = await mkdtemp(join(cache, 'output-safety-'));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  const external = join(sandbox, 'external');
  const marker = join(external, 'site', 'marker.txt');
  await mkdir(dirname(marker), { recursive: true });
  await writeFile(marker, 'synthetic external content');
  const outputParent = join(sandbox, 'output');
  await mkdir(outputParent);
  await symlink(external, join(outputParent, 'escape'));

  await assert.rejects(
    () => buildLearningSite(join(outputParent, 'escape', 'site')),
    /Refusing output/u,
  );
  assert.equal(await readFile(marker, 'utf8'), 'synthetic external content');
});
