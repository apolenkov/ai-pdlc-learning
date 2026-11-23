import assert from 'node:assert/strict';
import {
  chmod,
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import {
  BLOCK_0,
  mediaUrl,
  GUIDE_VIDEO_DIR,
  sourcesAssetsDir,
  sourcesManifestPath,
  SOURCES_MANIFEST,
  SOURCES_TARGET_DIR,
  sha256,
} from './guide-video.ts';
import { fetchGuideVideo, fetchSources } from './fetch-guide-video.ts';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mp4, fixture } from './guide-video-test-support.ts';

const run = promisify(execFile);

const assertNoTemps = async (root: string) => {
  const entries = await readdir(root, { recursive: true });
  assert.deepEqual(
    entries.filter((entry) => /(?:^|[/\\])\.(?:sources|video)-|\.part$/u.test(entry)),
    [],
  );
};

const fetchFixture = async (t: TestContext, name: 'video' | 'sources') => {
  const root = await mkdtemp(join(tmpdir(), 'guide-fetch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const targetDir = join(root, name === 'video' ? GUIDE_VIDEO_DIR : SOURCES_TARGET_DIR);
  const manifestPath = join(
    root,
    name === 'video' ? join(GUIDE_VIDEO_DIR, 'video-manifest.json') : SOURCES_MANIFEST,
  );
  await mkdir(targetDir, { recursive: true });
  const clips =
    name === 'video'
      ? ([['block-0a.mp4', mp4]] as const)
      : ([
          ['one.mp4', mp4],
          ['two.mp4', Buffer.from('second synthetic clip')],
        ] as const);
  const payload = join(root, name === 'video' ? 'download.mp4' : 'download.tar');
  if (name === 'video') await writeFile(payload, mp4);
  else {
    const source = join(root, 'package');
    await mkdir(join(source, 'rec'), { recursive: true });
    for (const [file, bytes] of clips) await writeFile(join(source, 'rec', file), bytes);
    await run('tar', ['-cf', payload, '-C', source, 'rec']);
  }
  const bytes = await readFile(payload);
  const manifest = {
    file: name === 'video' ? 'block-0a.mp4' : 'sources.tar',
    size: bytes.length,
    sha256: sha256(bytes),
    url: mediaUrl(name === 'video' ? 'block-0a.mp4' : 'sources.tar', sha256(bytes)),
    version: sha256(bytes).slice(0, 12),
    excluded: [],
    files: clips.map(([file, content]) => ({ path: `rec/${file}`, sha256: sha256(content) })),
  };
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest));
  const download = t.mock.fn(async (_url: string, part: string) => {
    await copyFile(payload, part);
  });
  return {
    root,
    targetDir,
    target: join(targetDir, clips[0][0]),
    manifestPath,
    manifest,
    payload,
    clips,
    download,
  };
};

const captureFailure = (t: TestContext) => {
  const stderr = t.mock.method(process.stderr, 'write', () => true);
  return (reason: RegExp) => {
    assert.equal(stderr.mock.callCount(), 1);
    const message = String(stderr.mock.calls[0]?.arguments[0]);
    assert.match(message, /^fetch-guide-video: skipped[^\r\n]*\n$/u);
    assert.match(message, reason);
  };
};

for (const [name, fetch] of [
  ['video', fetchGuideVideo],
  ['sources', fetchSources],
] as const) {
  await test(`${name}: missing manifest is a one-line soft failure`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'guide-fetch-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const stderr = t.mock.method(process.stderr, 'write', () => true);
    assert.equal(await fetch(root), 'skipped');
    assert.equal(stderr.mock.callCount(), 1);
    assert.match(
      String(stderr.mock.calls[0]?.arguments[0]),
      /^fetch-guide-video: skipped[^\n]*ENOENT[^\n]*\n$/u,
    );
    await assertNoTemps(root);
  });

  for (const content of [mp4, Buffer.from('a clip with a different size')]) {
    await test(`${name}: EACCES preserves an existing clip (${content.length} bytes)`, async (t) => {
      if (process.platform === 'win32' || process.getuid?.() === 0)
        return t.skip('chmod 000 does not enforce EACCES on Windows or for root');
      const { root, target, download } = await fetchFixture(t, name);
      await writeFile(target, content);
      await chmod(target, 0);
      t.after(() => chmod(target, 0o600).catch(() => {}));
      await assert.rejects(readFile(target), { code: 'EACCES' });
      const diagnostic = captureFailure(t);
      assert.equal(await fetch(root, download), 'skipped');
      assert.equal(download.mock.callCount(), 0);
      diagnostic(/EACCES/u);
      assert.equal((await stat(target)).mode & 0o777, 0);
      await chmod(target, 0o600);
      assert.deepEqual(await readFile(target), content);
      await assertNoTemps(root);
    });
  }

  await test(`${name}: directory instead of mp4 is preserved`, async (t) => {
    const { root, target, download } = await fetchFixture(t, name);
    await mkdir(target);
    await writeFile(join(target, 'keep'), 'untouched');
    const diagnostic = captureFailure(t);
    assert.equal(await fetch(root, download), 'skipped');
    assert.equal(download.mock.callCount(), 0);
    diagnostic(/EISDIR/u);
    assert.equal((await stat(target)).isDirectory(), true);
    assert.equal(await readFile(join(target, 'keep'), 'utf8'), 'untouched');
    await assertNoTemps(root);
  });

  await test(`${name}: synthetic download roundtrip is fetched then present`, async (t) => {
    const { root, targetDir, clips, download } = await fetchFixture(t, name);
    const stderr = t.mock.method(process.stderr, 'write', () => true);
    assert.equal(await fetch(root, download), 'fetched');
    for (const [file, bytes] of clips)
      assert.equal(sha256(await readFile(join(targetDir, file))), sha256(bytes));
    await assertNoTemps(root);
    assert.equal(await fetch(root, download), 'present');
    assert.equal(download.mock.callCount(), 1);
    assert.equal(stderr.mock.callCount(), 0);
    await assertNoTemps(root);
  });

  await test(`${name}: hash mismatch preserves old clips and unrelated temporary files`, async (t) => {
    const { root, targetDir, target, clips, payload, download } = await fetchFixture(t, name);
    for (const [file] of clips) await writeFile(join(targetDir, file), 'old clip');
    const foreignPart = `${target}.part`;
    const foreignWork = join(dirname(targetDir), '.sources-someone-else');
    await writeFile(foreignPart, 'someone else is downloading');
    await mkdir(foreignWork);
    await writeFile(join(foreignWork, 'keep'), 'someone else is working');
    const corrupted = await readFile(payload);
    corrupted[0] = (corrupted[0] ?? 0) ^ 1;
    await writeFile(payload, corrupted);
    const diagnostic = captureFailure(t);
    assert.equal(await fetch(root, download), 'skipped');
    diagnostic(/downloaded (?:file|archive) does not match the manifest/u);
    assert.equal(download.mock.callCount(), 1);
    for (const [file] of clips)
      assert.equal(await readFile(join(targetDir, file), 'utf8'), 'old clip');
    assert.equal(await readFile(foreignPart, 'utf8'), 'someone else is downloading');
    assert.equal(await readFile(join(foreignWork, 'keep'), 'utf8'), 'someone else is working');
    await rm(foreignPart);
    await rm(foreignWork, { recursive: true });
    await assertNoTemps(root);
  });

  await test(`${name}: malformed manifest exits 0 with one stderr line`, async (t) => {
    const { root, manifestPath, manifest } = await fetchFixture(t, name);
    for (const content of ['{\n"broken":\n}\n', JSON.stringify({ ...manifest, size: 'invalid' })]) {
      await writeFile(manifestPath, content);
      const { stdout, stderr } = await run(
        process.execPath,
        [
          '--experimental-strip-types',
          resolve('scripts/fetch-guide-video.ts'),
          ...(name === 'sources' ? ['--sources'] : []),
        ],
        { cwd: root, env: { PATH: '' } },
      );
      assert.equal(stdout, '');
      assert.match(stderr, /^fetch-guide-video: skipped[^\r\n]*\n$/u);
      await assertNoTemps(root);
    }
  });

  await test(`${name}: cleanup failure does not replace the original error`, async (t) => {
    if (process.platform === 'win32' || process.getuid?.() === 0)
      return t.skip('directory permissions do not enforce cleanup failure on Windows or for root');
    const { root } = await fetchFixture(t, name);
    let work: string | undefined;
    const diagnostic = captureFailure(t);
    try {
      assert.equal(
        await fetch(root, async (_url, part) => {
          work = dirname(part);
          await writeFile(part, 'partial download');
          await chmod(work, 0o500);
          throw new Error('original download failure\nwith details');
        }),
        'skipped',
      );
      diagnostic(/original download failure with details/u);
      assert.ok(work);
      assert.equal((await readdir(work)).length, 1, 'cleanup was denied');
    } finally {
      if (work) {
        await chmod(work, 0o700);
        await rm(work, { recursive: true, force: true });
      }
    }
    await assertNoTemps(root);
  });
}

await test('sources: a clip hash mismatch in a valid archive preserves all old clips', async (t) => {
  const { root, targetDir, clips, manifestPath, manifest, download } = await fetchFixture(
    t,
    'sources',
  );
  for (const [file] of clips) await writeFile(join(targetDir, file), 'old clip');
  manifest.files[1]!.sha256 = '0'.repeat(64);
  await writeFile(manifestPath, JSON.stringify(manifest));
  const diagnostic = captureFailure(t);
  assert.equal(await fetchSources(root, download), 'skipped');
  diagnostic(/rec\/two.mp4 does not match the manifest/u);
  for (const [file] of clips)
    assert.equal(await readFile(join(targetDir, file), 'utf8'), 'old clip');
  await assertNoTemps(root);
});

await test('sources: any block with a sources-manifest is fetched into its own film/assets and checked by hash', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-sources-blocks-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const payloads = new Map<string, string>();
  const layouts = {
    'block-0a': { 'rec/clip.mp4': 'recording' },
    'block-0': {
      'vo/scene-0.mp3': 'voice',
      'vo-v3/raw/block-0.mp3': 'raw voice',
      'rec/clip.mp4': 'other recording',
    },
  } as const;
  for (const [block, files] of Object.entries(layouts)) {
    const source = join(root, `pkg-${block}`);
    for (const [path, text] of Object.entries(files)) {
      await mkdir(dirname(join(source, path)), { recursive: true });
      await writeFile(join(source, path), text);
    }
    const tar = join(root, `${block}.tar`);
    await run('tar', [
      '-cf',
      tar,
      '-C',
      source,
      ...new Set(Object.keys(files).map((path) => path.split('/')[0]!)),
    ]);
    const bytes = await readFile(tar);
    const url = mediaUrl(`${block}.tar`, sha256(bytes));
    payloads.set(url, tar);
    await mkdir(join(root, dirname(sourcesManifestPath(block)), 'film'), { recursive: true });
    await writeFile(
      join(root, sourcesManifestPath(block)),
      JSON.stringify({
        file: `${block}.tar`,
        sha256: sha256(bytes),
        size: bytes.length,
        url,
        version: sha256(bytes).slice(0, 12),
        excluded: [],
        files: Object.entries(files).map(([path, text]) => ({
          path,
          sha256: sha256(Buffer.from(text)),
        })),
      }),
    );
  }
  const download = async (url: string, part: string) => {
    await copyFile(payloads.get(url)!, part);
  };
  for (const [block, files] of Object.entries(layouts)) {
    assert.equal(await fetchSources(root, download, block), 'fetched');
    for (const [path, text] of Object.entries(files))
      assert.equal(await readFile(join(root, sourcesAssetsDir(block), path), 'utf8'), text);
    assert.equal(await fetchSources(root, download, block), 'present');
  }
  await assertNoTemps(root);
  // an archive entry that the manifest does not list is refused
  await writeFile(join(root, 'video/block-0/film/assets/vo/scene-0.mp3'), 'stale');
  await mkdir(join(root, 'pkg-block-0/extra'));
  await writeFile(join(root, 'pkg-block-0/extra/x'), 'x');
  await run('tar', [
    '-cf',
    join(root, 'block-0.tar'),
    '-C',
    join(root, 'pkg-block-0'),
    'vo',
    'vo-v3',
    'rec',
    'extra',
  ]);
  const forged = await readFile(join(root, 'block-0.tar'));
  const manifestPath = join(root, sourcesManifestPath('block-0'));
  const originalManifest: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.ok(originalManifest !== null && typeof originalManifest === 'object');
  await writeFile(
    manifestPath,
    JSON.stringify({
      ...originalManifest,
      sha256: sha256(forged),
      size: forged.length,
    }),
  );
  const diagnostic = captureFailure(t);
  assert.equal(await fetchSources(root, download, 'block-0'), 'skipped');
  diagnostic(/entries that are not in the manifest/u);
  assert.equal(
    await readFile(join(root, 'video/block-0/film/assets/vo/scene-0.mp3'), 'utf8'),
    'stale',
  );
});

await test('fetch-guide-video exits 0 with one stderr line when the download is unavailable', async (t) => {
  const { root } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(dirname(join(root, BLOCK_0.manifest)), { recursive: true });
  await cp(join(root, GUIDE_VIDEO_DIR, 'video-manifest.json'), join(root, BLOCK_0.manifest));
  const { stdout, stderr } = await run(
    process.execPath,
    ['--experimental-strip-types', resolve('scripts/fetch-guide-video.ts')],
    { cwd: root, env: { PATH: '' } },
  );
  assert.equal(stdout, '');
  assert.match(stderr, /^fetch-guide-video: skipped/u);
  assert.equal(stderr.trim().split('\n').length, 1);
});

await test('the block-0 sources manifest matches MEDIA.sha256 except the re-voiced takes', async () => {
  const manifest: unknown = JSON.parse(
    await readFile('video/block-0/sources-manifest.json', 'utf8'),
  );
  assert.ok(manifest !== null && typeof manifest === 'object');
  assert.ok('sha256' in manifest && typeof manifest.sha256 === 'string');
  assert.ok('version' in manifest && typeof manifest.version === 'string');
  assert.ok(!('url' in manifest), 'sources stay with the author: no download address');
  assert.ok('file' in manifest && typeof manifest.file === 'string');
  assert.ok(
    'files' in manifest &&
      Array.isArray(manifest.files) &&
      manifest.files.every(
        (item: unknown): item is { path: string; sha256: string } =>
          item !== null &&
          typeof item === 'object' &&
          'path' in item &&
          typeof item.path === 'string' &&
          'sha256' in item &&
          typeof item.sha256 === 'string',
      ),
  );
  const byPath = new Map(manifest.files.map((file) => [file.path, file.sha256]));
  assert.equal(byPath.size, manifest.files.length);
  for (const path of byPath.keys())
    assert.match(path, /^(?:vo|vo-v3|rec)\/(?:[^/.][^/]*\/)*[^/.][^/]*$/u, path);
  const media = (await readFile('video/block-0/MEDIA.sha256', 'utf8'))
    .trim()
    .split('\n')
    .filter((line) => !line.startsWith('#'));
  assert.ok(media.length >= 15);
  // Блоки 3 и 6 переозвучены; архив 36e7a167 (readback pack 8) теперь содержит принятые дубли
  // (vo/scene-3/6.mp3 и vo-v3/block-3/6.mp3), поэтому MEDIA.sha256 обязан совпадать с архивом.
  // Ранее архив 7d18671d хранил прежние дубли, и эти файлы обязаны были расходиться.
  for (const line of media) {
    const [hash, path] = line.split(/\s+/u);
    const file = (path ?? '').replace('./film/assets/', '');
    assert.equal(byPath.get(file), hash, String(path));
  }
  // Переозвученные дубли лежат в архиве под обоими именами и совпадают с принятыми кадрами.
  const reVoiced = [
    ['vo/scene-3.mp3', 'vo-v3/block-3.mp3'],
    ['vo/scene-6.mp3', 'vo-v3/block-6.mp3'],
  ] as const;
  for (const [scene, block] of reVoiced) {
    assert.ok(byPath.has(block), `${block}: переозвученный дубль должен быть в архиве 36e7a167`);
    assert.equal(byPath.get(scene), byPath.get(block), `${scene}: дубль архива и vo-v3 расходятся`);
  }
  assert.match(manifest.sha256, /^[0-9a-f]{64}$/u);
  assert.ok(manifest.sha256.startsWith(manifest.version));
});

await test('fetch-guide-video --sources exits 0 with one stderr line when the download is unavailable', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-sources-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'video/block-0'), { recursive: true });
  await cp(resolve(sourcesManifestPath('block-0')), join(root, sourcesManifestPath('block-0')));
  const { stdout, stderr } = await run(
    process.execPath,
    ['--experimental-strip-types', resolve('scripts/fetch-guide-video.ts'), '--sources'],
    { cwd: root, env: { PATH: '' } },
  );
  assert.equal(stdout, '');
  assert.match(stderr, /^fetch-guide-video: skipped/u);
  assert.equal(stderr.trim().split('\n').length, 1);
});
