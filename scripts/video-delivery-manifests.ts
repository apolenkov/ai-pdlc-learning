#!/usr/bin/env node
// Подготовка доставки курсовых роликов: пересчёт sha256/size/duration и правка манифестов.
//   node --experimental-strip-types scripts/video-delivery-manifests.ts [--dry]
// Ничего не загружает: только файлы манифестов и печать плана загрузки.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mediaUrl } from './media-release.ts';
import { buildLandingRows, formatLandingPlan, parseLandingMode } from './video-delivery-landing.ts';
import { pickWebRender } from './video-delivery-render-name.ts';

/** Курсовые ролики, доставку которых ведёт этот скрипт; пины landing-* лежат в CD. */
export const FILMS = [
  'block-0',
  'block-sdd',
  'block-r1',
  'block-r2',
  'block-r3',
  'block-r4',
  'block-r4new',
  'block-r4legacy',
  'block-team',
  'block-delivery',
  'block-dark-factory',
  'block-p4',
] as const;

// манифест фильма: у 0a это файл плеера (так заведено в FILM_MANIFESTS)
export const manifestPath = (film: string): string =>
  film === 'block-0a'
    ? 'docs/pages/sdlc-development/guides/assets/video/video-manifest.json'
    : `video/${film}/video-manifest.json`;

/** Внешние операции сборки одного манифеста — подменяются в тестах. */
export interface FilmManifestDeps {
  root: string;
  dry: boolean;
  sha: (path: string) => string;
  size: (path: string) => number;
  duration: (path: string) => number;
  write: (path: string, text: string) => void;
}

/** Поля манифеста, которые участвуют в сборке; остальные пересчитываются. */
interface SourceManifest {
  file: string;
  /** Явное имя web-рендера в film/renders, если оно не `<ролик>-720p.mp4`. */
  webFile?: string;
  url: string;
  master?: { file: string; url: string };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const invalidManifest = (film: string): Error => new Error(`${film}: invalid manifest`);

/** Проверяет манифест и вытаскивает поля; сырое `webFile` помощник проверит сам. */
const parseManifest = (film: string, data: unknown): SourceManifest => {
  if (!isRecord(data)) throw invalidManifest(film);
  const { file, url, master, webFile } = data;
  if (typeof file !== 'string' || typeof url !== 'string') throw invalidManifest(film);
  const masterFields =
    isRecord(master) && typeof master.file === 'string' && typeof master.url === 'string'
      ? { master: { file: master.file, url: master.url } }
      : {};
  return { file, url, ...(typeof webFile === 'string' ? { webFile } : {}), ...masterFields };
};

/** Строка плана: посчитанные пины и признак изменения файла манифеста. */
export interface FilmManifestRow {
  film: string;
  manifest: string;
  webFile: string;
  webSha: string;
  webSize: number;
  webVer: string;
  mFile: string;
  mSha: string;
  mSize: number;
  mVer: string;
  duration: number;
  changed: boolean;
}

/**
 * Собирает и (если не `dry`) переписывает манифест одного ролика.
 * Имя web-рендера берётся из поля `webFile` манифеста, иначе `<ролик>-720p.mp4`.
 */
export const buildFilmManifest = (film: string, deps: FilmManifestDeps): FilmManifestRow => {
  const dir = `${deps.root}/video/${film}/film/renders`;

  const data: unknown = JSON.parse(readFileSync(`${deps.root}/${manifestPath(film)}`, 'utf8'));
  const man = parseManifest(film, data);
  const webFileField = isRecord(data) ? data.webFile : undefined;
  const webRender = pickWebRender(film, { webFile: webFileField }, (name) =>
    existsSync(`${dir}/${name}`),
  );
  const web = `${dir}/${webRender}`;
  const master = `${dir}/${film}.sound.mp4`;
  if (!existsSync(master)) throw new Error(`${film}: нет ${master}`);
  const webSha = deps.sha(web),
    webSize = deps.size(web);
  const mSha = deps.sha(master),
    mSize = deps.size(master);
  const webVer = webSha.slice(0, 12),
    mVer = mSha.slice(0, 12);
  const webFile = man.file; // сохраняем принятое имя файла пакета
  const mFile = man.master?.file ?? `${film}-1080p.mp4`;

  const next = {
    file: webFile,
    ...(man.webFile ? { webFile: man.webFile } : {}),
    sha256: webSha,
    size: webSize,
    url: mediaUrl(webFile, webSha),
    version: webVer,
    master: { file: mFile, sha256: mSha, size: mSize, url: mediaUrl(mFile, mSha) },
    duration: deps.duration(web),
  };

  const changed = JSON.stringify(data) !== JSON.stringify(next);
  if (!deps.dry && changed)
    deps.write(`${deps.root}/${manifestPath(film)}`, `${JSON.stringify(next, null, 2)}\n`);
  return {
    film,
    manifest: manifestPath(film),
    webFile,
    webSha,
    webSize,
    webVer,
    mFile,
    mSha,
    mSize,
    mVer,
    duration: next.duration,
    changed,
  };
};

const main = (): void => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const dry = process.argv.includes('--dry');
  const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const size = (path: string) => readFileSync(path).length;
  const duration = (path: string) =>
    Number(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
        { encoding: 'utf8' },
      ).trim(),
    );
  const landing = parseLandingMode(process.argv, process.env);
  if (landing.mode === 'missing-path') {
    console.error('landing-*: укажи --landing-manifest <путь к CD> или переменную CUSTOMDEV_DIR');
    process.exitCode = 1;
    return;
  }
  if (landing.mode === 'on') {
    const landingRows = buildLandingRows({
      root,
      cdRoot: landing.cdRoot,
      dry,
      sha,
      size,
      duration,
      write: writeFileSync,
    });
    console.log(formatLandingPlan(landingRows, dry).join('\n'));
    return;
  }

  const rows = FILMS.map((film) =>
    buildFilmManifest(film, { root, dry, sha, size, duration, write: writeFileSync }),
  );

  console.log(`${dry ? 'СУХОЙ ПРОГОН' : 'МАНИФЕСТЫ ОБНОВЛЕНЫ'} · фильмов ${rows.length}\n`);
  console.log(
    'фильм                длит.   версия 720p   размер        версия master  размер master   манифест',
  );
  for (const r of rows) {
    console.log(
      `${r.film.padEnd(20)} ${String(r.duration).padStart(6)}  ${r.webVer}  ${String(r.webSize).padStart(9)}  ${r.mVer}  ${String(r.mSize).padStart(11)}  ${r.changed ? 'обновлён' : 'без изменений'} ${r.manifest}`,
    );
  }
  console.log('\nфайлы для релиза media-v1:');
  for (const r of rows) {
    console.log(
      `  ${r.film.padEnd(20)} ${mediaUrl(r.webFile, r.webSha)}   +   ${mediaUrl(r.mFile, r.mSha)}`,
    );
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
