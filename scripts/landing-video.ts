import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { GUIDE_VIDEOS, pagesWithVideo } from './guide-video.ts';
import { courseNavigationRow } from './site-navigation-contract.ts';
import {
  GUIDE_VIDEO_DIR,
  readVideoManifest,
  verifyVideoAsset,
  type VideoManifest,
} from './video-manifest.ts';

export const LANDING_VIDEO = {
  page: 'index.html',
  manifest: 'video/landing-route/video-manifest.json',
  outputDir: 'media/landing-route',
};

// Fetch and release verification share this list. Only guide players participate in the course map.
export const publishedVideos = () => {
  const films = GUIDE_VIDEOS.map(({ page, manifest }) => ({
    page,
    manifest,
    outputDir: 'guides/assets/video',
  }));
  if (courseNavigationRow() === 'public') films.push(LANDING_VIDEO);
  return films;
};

type Asset = Pick<VideoManifest, 'file' | 'sha256' | 'size'>;
type TrackKind = 'captions' | 'chapters';
type Track = Asset & { kind: TrackKind; srclang: string };
type LandingManifest = VideoManifest & {
  duration: number;
  poster: Asset;
  tracks: {
    captions: Track;
    chapters: Track;
    chaptersJson: Asset;
  };
};

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  assert.ok(
    value && typeof value === 'object' && !Array.isArray(value),
    'Expected a manifest object',
  );
}

function asset(value: unknown, filename: RegExp): Asset {
  assertRecord(value);
  const { file, size, sha256 } = value;
  assert.ok(typeof file === 'string' && filename.test(file), 'Invalid local asset filename');
  assert.ok(
    typeof size === 'number' && Number.isSafeInteger(size) && size > 0,
    `Invalid size for ${file}`,
  );
  assert.ok(
    typeof sha256 === 'string' && /^[a-f0-9]{64}$/u.test(sha256),
    `Invalid SHA256 for ${file}`,
  );
  return { file, size, sha256 };
}

function track(value: unknown, expectedKind: TrackKind): Track {
  assertRecord(value);
  const { kind, srclang } = value;
  assert.strictEqual(kind, expectedKind, `Expected track kind ${expectedKind}`);
  assert.ok(
    typeof srclang === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/iu.test(srclang),
    `Invalid language for ${kind}`,
  );
  return { ...asset(value, /^[^/\\]+\.vtt$/iu), kind, srclang };
}

export async function readLandingVideoManifest(
  root = resolve(import.meta.dirname, '..'),
): Promise<LandingManifest> {
  const manifest = await readVideoManifest(root, LANDING_VIDEO);
  const fields: Record<string, unknown> = manifest;
  const { duration, poster, tracks } = fields;
  assert.ok(
    typeof duration === 'number' && Number.isFinite(duration) && duration > 0,
    'Invalid landing video duration',
  );
  assertRecord(tracks);
  return {
    ...manifest,
    duration,
    poster: asset(poster, /^[^/\\]+\.webp$/iu),
    tracks: {
      captions: track(tracks.captions, 'captions'),
      chapters: track(tracks.chapters, 'chapters'),
      chaptersJson: asset(tracks.chaptersJson, /^[^/\\]+\.json$/iu),
    },
  };
}

const absent = (error: NodeJS.ErrnoException): undefined => {
  if (error.code === 'ENOENT') return undefined;
  throw error;
};

/** Build from the verified local download. The release URL belongs only to video:fetch. */
export const addLandingVideo = async (
  outputDir: string,
  root = resolve(import.meta.dirname, '..'),
): Promise<boolean> => {
  if (!pagesWithVideo() || courseNavigationRow() !== 'public') return false;
  const manifest = await readLandingVideoManifest(root).catch(absent);
  if (!manifest) return false;
  const mp4 = await readFile(resolve(root, GUIDE_VIDEO_DIR, manifest.file)).catch(absent);
  if (!mp4) return false;
  verifyVideoAsset(mp4, manifest);

  const source = dirname(resolve(root, LANDING_VIDEO.manifest));
  const {
    poster,
    tracks: { captions, chapters },
  } = manifest;
  const assets: [string, Buffer][] = [[manifest.file, mp4]];
  for (const asset of [poster, captions, chapters]) {
    const bytes = await readFile(resolve(source, asset.file));
    verifyVideoAsset(bytes, asset);
    assets.push([asset.file, bytes]);
  }
  // Whole seconds, as the browser shows the length in the player controls (70.6 s → 1:10).
  const seconds = Math.floor(manifest.duration);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  const duration = `${minutes}:${String(remainder).padStart(2, '0')}`;
  const target = resolve(outputDir, LANDING_VIDEO.outputDir);
  const url = (file: string): string => `./${LANDING_VIDEO.outputDir}/${encodeURIComponent(file)}`;
  const figure = `<figure class="hero-media"><video controls preload="metadata" playsinline width="640" height="360" poster="${url(poster.file)}" aria-label="Видео: один маршрут по главной странице, ${minutes} мин ${remainder} с">
        <source src="${url(manifest.file)}" type="video/mp4">
        <track kind="${captions.kind}" srclang="${captions.srclang}" label="Русские субтитры" src="${url(captions.file)}" default>
        <track kind="${chapters.kind}" srclang="${chapters.srclang}" label="Главы" src="${url(chapters.file)}">
      </video><figcaption>Обзор главной: карта PDLC, курсы и справка · ${duration}</figcaption></figure>`;
  const page = resolve(outputDir, LANDING_VIDEO.page);
  const html = await readFile(page, 'utf8');
  const marker = /<!-- landing-film:[\s\S]*?-->/u;
  assert.match(html, marker, 'Missing landing-film marker');
  await mkdir(target, { recursive: true });
  for (const [file, bytes] of assets) await writeFile(resolve(target, file), bytes);
  await writeFile(
    page,
    html.replace(marker, () => figure),
  );
  return true;
};
