import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';

import { GUIDE_VIDEOS, sha256 } from './guide-video.ts';

/** `run:` lines of the build job of .github/workflows/pages.yml, in order. */
const workflowRuns = async (): Promise<string[]> => {
  const flow: unknown = parse(await readFile('.github/workflows/pages.yml', 'utf8'));
  assert.ok(flow && typeof flow === 'object' && 'jobs' in flow);
  const jobs = flow.jobs;
  assert.ok(jobs && typeof jobs === 'object' && 'build' in jobs);
  const build = jobs.build;
  assert.ok(build && typeof build === 'object' && 'steps' in build && Array.isArray(build.steps));
  const steps: unknown[] = build.steps;
  return steps.flatMap((step) =>
    step && typeof step === 'object' && 'run' in step && typeof step.run === 'string'
      ? [step.run]
      : [],
  );
};

await test('Pages checks published films, not unrelated manifests or a matching file count', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pages-videos-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await symlink(resolve('scripts'), join(root, 'scripts'));
  const assets = join(root, 'dist/site/guides/assets/video');
  await mkdir(assets, { recursive: true });
  const bytes = Buffer.from('film');
  for (const [i, spec] of GUIDE_VIDEOS.entries()) {
    const manifest = join(root, spec.manifest);
    await mkdir(dirname(manifest), { recursive: true });
    await writeFile(
      manifest,
      JSON.stringify({
        file: `${i}.mp4`,
        size: 4,
        sha256: sha256(bytes),
        url: 'https://example.org/video',
      }),
    );
    await writeFile(join(assets, `${i}.mp4`), bytes);
  }
  await mkdir(join(root, 'video/unpublished'), { recursive: true });
  await writeFile(join(root, 'video/unpublished/video-manifest.json'), '{}');
  // The command is taken from the Pages workflow: it checks the built site in dist/site, after the build.
  const lines = await workflowRuns();
  const command = lines.find((line) => line.includes('check-pages-videos.ts'));
  assert.ok(command, 'the Pages workflow must run check-pages-videos.ts');
  assert.match(command, /check-pages-videos\.ts dist\/site$/u);
  const at = (needle: string) => lines.findIndex((line) => line.includes(needle));
  assert.ok(at('video:fetch') >= 0 && at('video:fetch') < at('build:site'), 'videos come first');
  assert.ok(
    at('build:site') >= 0 && at('build:site') < lines.indexOf(command),
    'films are checked after the build',
  );
  const run = () =>
    spawnSync('sh', ['-c', command], {
      cwd: root,
      encoding: 'utf8',
    });
  const complete = run();
  assert.equal(complete.status, 0, complete.stderr);
  await rm(join(assets, '0.mp4'));
  await writeFile(join(assets, 'unrelated.mp4'), bytes);
  const missing = run();
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /0\.mp4/u);
  await writeFile(join(assets, '0.mp4'), 'fake');
  const corrupt = run();
  assert.notEqual(corrupt.status, 0);
  assert.match(corrupt.stderr, /0\.mp4/u);
  await writeFile(join(assets, '0.mp4'), 'truncated');
  assert.notEqual(run().status, 0);
  await writeFile(join(assets, '0.mp4'), bytes);
  assert.equal(run().status, 0);
});
