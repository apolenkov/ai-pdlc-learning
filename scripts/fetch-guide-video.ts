import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

import {
  BLOCK_0A,
  GUIDE_VIDEO_DIR,
  readSourcesManifest,
  readVideoManifest,
  sourcesAssetsDir,
  sourcesManifestPath,
} from './guide-video.ts';
import { publishedVideos } from './landing-video.ts';

/**
 * Fetches the lesson videos from the GitHub release named in each video-manifest.json into the
 * git-ignored guides/assets/video/ and checks size and sha256. It never runs from tests or hooks, and
 * any problem (no network, missing asset) is one stderr line, exit 0: the Pages workflow then fails on
 * check-pages-videos.ts, a local build simply hides the player.
 */
const hashOf = async (path: string): Promise<string> => {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
};

/** Streams a release asset into `part` over plain HTTPS (public repository, no token); throws on failure. */
const download = async (urlText: string, part: string): Promise<void> => {
  const response = await fetch(new URL(urlText), { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  await pipeline(response.body, createWriteStream(part));
};

const matches = async (path: string, sha256: string): Promise<boolean> => {
  try {
    return (await hashOf(path)) === sha256;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return false;
    throw error;
  }
};

export const fetchGuideVideo = async (
  root = process.cwd(),
  downloadFile = download,
  spec: { readonly manifest: string } = BLOCK_0A,
): Promise<'present' | 'fetched' | 'skipped'> => {
  let work: string | undefined;
  try {
    const manifest = await readVideoManifest(root, spec);
    const target = resolve(root, GUIDE_VIDEO_DIR, manifest.file);
    if ((await matches(target, manifest.sha256)) && (await stat(target)).size === manifest.size)
      return 'present';
    work = await mkdtemp(resolve(dirname(target), '.video-'));
    const part = resolve(work, 'video.part');
    await downloadFile(manifest.url, part);
    const size = (await stat(part)).size;
    if (size !== manifest.size || (await hashOf(part)) !== manifest.sha256)
      throw new Error(`downloaded file does not match the manifest (${size} bytes)`);
    await rename(part, target);
    return 'fetched';
  } catch (error) {
    process.stderr.write(
      `fetch-guide-video: skipped, lesson video not available (${String(error instanceof Error ? error.message : error).replace(/[\r\n]+/gu, ' ')})\n`,
    );
    return 'skipped';
  } finally {
    try {
      if (work) await rm(work, { recursive: true, force: true });
    } catch {
      /* Cleanup must not replace the fetch result or its diagnostic. */
    }
  }
};

const tarEntries = (tar: string): Promise<string[]> =>
  new Promise((done, fail) => {
    const list = spawn('tar', ['-tf', tar], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    list.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    list.on('error', fail);
    list.on('close', (code) =>
      code === 0 ? done(out.split('\n').filter(Boolean)) : fail(new Error('tar -t failed')),
    );
  });

const untar = (tar: string, dir: string): Promise<void> =>
  new Promise((done, fail) => {
    const extract = spawn('tar', ['-xf', tar, '-C', dir], { stdio: 'ignore' });
    extract.on('error', fail);
    extract.on('close', (code) => (code === 0 ? done() : fail(new Error('tar -x failed'))));
  });

/**
 * Fetches the raw sources of a film (sources-manifest.json: recordings, voice-over) into the git-ignored
 * video/<block>/film/assets/. Files that already match the manifest are not touched.
 */
export const fetchSources = async (
  root = process.cwd(),
  downloadFile = download,
  block = 'block-0a',
): Promise<'present' | 'fetched' | 'skipped'> => {
  let work: string | undefined;
  try {
    const manifest = await readSourcesManifest(root, block);
    const target = resolve(root, sourcesAssetsDir(block));
    const local = (path: string): string => resolve(target, path);
    const missing: (typeof manifest.files)[number][] = [];
    for (const file of manifest.files)
      if (!(await matches(local(file.path), file.sha256))) missing.push(file);
    if (missing.length === 0) return 'present';
    if (manifest.url === undefined) throw new Error('not published, the author keeps them');
    await mkdir(target, { recursive: true });
    work = await mkdtemp(resolve(target, '.sources-'));
    const tar = resolve(work, `${manifest.file}.part`);
    await downloadFile(manifest.url, tar);
    const size = (await stat(tar)).size;
    if (size !== manifest.size || (await hashOf(tar)) !== manifest.sha256)
      throw new Error(`downloaded archive does not match the manifest (${size} bytes)`);
    const allowed = new Set(
      manifest.files.flatMap((file) =>
        file.path.split('/').map((_, i, parts) => parts.slice(0, i + 1).join('/')),
      ),
    );
    if ((await tarEntries(tar)).some((entry) => !allowed.has(entry.replace(/\/$/u, ''))))
      throw new Error('archive has entries that are not in the manifest');
    const unpacked = resolve(work, 'x');
    await mkdir(unpacked);
    await untar(tar, unpacked);
    for (const file of manifest.files)
      if (!(await matches(resolve(unpacked, file.path), file.sha256)))
        throw new Error(`${file.path} does not match the manifest`);
    for (const file of missing) {
      await mkdir(dirname(local(file.path)), { recursive: true });
      await rename(resolve(unpacked, file.path), local(file.path));
    }
    return 'fetched';
  } catch (error) {
    process.stderr.write(
      `fetch-guide-video: skipped, ${block} sources not available (${String(error instanceof Error ? error.message : error).replace(/[\r\n]+/gu, ' ')})\n`,
    );
    return 'skipped';
  } finally {
    try {
      if (work) await rm(work, { recursive: true, force: true });
    } catch {
      /* Cleanup must not replace the fetch result or its diagnostic. */
    }
  }
};

/** Every block that has a tracked sources-manifest.json, or block-0a alone so that a missing manifest is still reported. */
const sourceBlocks = async (root: string): Promise<string[]> => {
  const dirs = await readdir(resolve(root, 'video'), { withFileTypes: true }).catch(() => []);
  const found: string[] = [];
  for (const dir of dirs)
    if (
      dir.isDirectory() &&
      (await stat(resolve(root, sourcesManifestPath(dir.name))).then(
        () => true,
        () => false,
      ))
    )
      found.push(dir.name);
  return found.length > 0 ? found.sort() : ['block-0a'];
};

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  if (process.argv.includes('--sources')) {
    for (const block of await sourceBlocks(process.cwd())) {
      const result = await fetchSources(process.cwd(), download, block);
      if (result !== 'skipped') process.stdout.write(`fetch-guide-video: ${result} (${block})\n`);
    }
  } else {
    // One diagnostic line at most: the first unavailable video stops the run (the network and the release are shared).
    for (const spec of publishedVideos()) {
      const result = await fetchGuideVideo(process.cwd(), download, spec);
      if (result === 'skipped') break;
      process.stdout.write(`fetch-guide-video: ${result} (${spec.page})\n`);
    }
  }
}
