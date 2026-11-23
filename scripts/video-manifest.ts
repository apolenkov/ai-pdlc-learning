import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { VOICE_ONLY } from './guide-video-credit.ts';

const ROOT = resolve(import.meta.dirname, '..');
/** Shared git-ignored download directory for web mp4 files. */
export const GUIDE_VIDEO_DIR = 'docs/pages/sdlc-development/guides/assets/video';
export const GUIDE_VIDEO_FILE = 'block-0a.mp4';
export const GUIDE_VIDEO_MANIFEST = 'video-manifest.json';

export type VideoManifest = Readonly<{
  file: string;
  sha256: string;
  size: number;
  url: string;
  audio?: typeof VOICE_ONLY;
}>;

/** Raw sources of a film (recordings, voice-over): tracked manifest, git-ignored files (see README, "Исходные записи"). */
export const sourcesManifestPath = (block: string): string =>
  `video/${block}/sources-manifest.json`;
export const sourcesAssetsDir = (block: string): string => `video/${block}/film/assets`;
export const SOURCES_MANIFEST = sourcesManifestPath('block-0a');
export const SOURCES_TARGET_DIR = `${sourcesAssetsDir('block-0a')}/rec`;
export type SourcesManifest = Readonly<{
  file: string;
  sha256: string;
  size: number;
  url?: string;
  version: string;
  files: readonly Readonly<{ path: string; sha256: string }>[];
  excluded: readonly Readonly<{ path: string; reason: string }>[];
}>;

export const sha256 = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');
export const verifyVideoAsset = (
  bytes: Buffer,
  asset: Pick<VideoManifest, 'file' | 'size' | 'sha256'>,
): void => {
  assert.equal(bytes.length, asset.size, `${asset.file}: size differs from the manifest`);
  assert.equal(sha256(bytes), asset.sha256, `${asset.file}: SHA256 differs from the manifest`);
};

export const readVideoManifest = async (
  root = ROOT,
  spec: { readonly manifest: string } = { manifest: `${GUIDE_VIDEO_DIR}/${GUIDE_VIDEO_MANIFEST}` },
): Promise<VideoManifest> => {
  const manifest: unknown = JSON.parse(await readFile(resolve(root, spec.manifest), 'utf8'));
  assert.ok(manifest && typeof manifest === 'object', 'Video manifest must be an object');
  assert.ok('file' in manifest && typeof manifest.file === 'string', 'Video manifest file');
  assert.match(manifest.file, /^[^/\\]+\.mp4$/iu, 'Video manifest must name a local mp4');
  assert.ok('sha256' in manifest && typeof manifest.sha256 === 'string', 'Video manifest sha256');
  assert.ok('size' in manifest && typeof manifest.size === 'number', 'Video manifest size');
  assert.ok('url' in manifest && typeof manifest.url === 'string', 'Video manifest url');
  const audio = 'audio' in manifest ? manifest.audio : undefined;
  assert.ok(
    audio === undefined || audio === VOICE_ONLY,
    `Video manifest audio must be "${VOICE_ONLY}" when set`,
  );
  return {
    ...manifest,
    file: manifest.file,
    sha256: manifest.sha256,
    size: manifest.size,
    url: manifest.url,
    ...(audio === undefined ? {} : { audio }),
  };
};

export const readSourcesManifest = async (
  root = ROOT,
  block = 'block-0a',
): Promise<SourcesManifest> => {
  const manifest: unknown = JSON.parse(
    await readFile(resolve(root, sourcesManifestPath(block)), 'utf8'),
  );
  assert.ok(manifest && typeof manifest === 'object', 'Sources manifest must be an object');
  assert.ok('file' in manifest && typeof manifest.file === 'string', 'Sources manifest file');
  assert.ok('sha256' in manifest && typeof manifest.sha256 === 'string', 'Sources manifest sha256');
  assert.ok('size' in manifest && typeof manifest.size === 'number', 'Sources manifest size');
  assert.ok(!('url' in manifest) || typeof manifest.url === 'string', 'Sources manifest url');
  assert.ok(
    'version' in manifest && typeof manifest.version === 'string',
    'Sources manifest version',
  );
  assert.ok('files' in manifest && Array.isArray(manifest.files), 'Sources manifest files');
  assert.ok(
    'excluded' in manifest && Array.isArray(manifest.excluded),
    'Sources manifest exclusions',
  );
  const files: unknown[] = manifest.files;
  const excluded: unknown[] = manifest.excluded;
  assert.ok(
    files.every(
      (file): file is SourcesManifest['files'][number] =>
        !!file &&
        typeof file === 'object' &&
        'path' in file &&
        typeof file.path === 'string' &&
        'sha256' in file &&
        typeof file.sha256 === 'string',
    ),
  );
  assert.ok(
    excluded.every(
      (file): file is SourcesManifest['excluded'][number] =>
        !!file &&
        typeof file === 'object' &&
        'path' in file &&
        typeof file.path === 'string' &&
        'reason' in file &&
        typeof file.reason === 'string',
    ),
  );
  return {
    ...manifest,
    file: manifest.file,
    sha256: manifest.sha256,
    size: manifest.size,
    ...('url' in manifest && typeof manifest.url === 'string' ? { url: manifest.url } : {}),
    version: manifest.version,
    files,
    excluded,
  };
};
