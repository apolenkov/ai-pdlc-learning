// Доставка landing-роликов: пины лежат в CD (`landing-video-manifest.json`),
// локальные рендеры и master — в LR (`video/<ролик>/film/renders/`).
// Режим scripts/video-delivery-manifests.ts --landing-manifest <путь к CD> [--dry].
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mediaUrl } from './media-release.ts';

/** Путь CD-манифеста landing-роликов относительно корня CD. */
export const LANDING_MANIFEST_PATH = 'docs/pages/sdlc-development/landing-video-manifest.json';

/** Запись CD-манифеста, из которой собираются пины. */
export interface LandingSource {
  file: string;
  url: string;
  master?: { file: string; url: string; version?: true };
  /** Явное имя web-рендера в film/renders, если оно не `<ролик>-720p.mp4`. */
  webFile?: string;
}

/** Внешние операции сборки landing-пинов — подменяются в тестах. */
export interface LandingDeps {
  /** Корень LR: здесь локальные рендеры. */
  root: string;
  /** Корень CD: здесь `landing-video-manifest.json`. */
  cdRoot: string;
  dry: boolean;
  sha: (path: string) => string;
  size: (path: string) => number;
  duration: (path: string) => number;
  write: (path: string, text: string) => void;
}

/** Посчитанные пины одного landing-ролика и признак изменения его записи. */
export interface LandingRow {
  film: string;
  manifest: string;
  /** Имя файла принятого web-файла релиза (хвост URL). */
  webFile: string;
  /** Имя выбранного локального рендера в film/renders. */
  renderFile: string;
  webSha: string;
  webSize: number;
  webVer: string;
  masterFile: string;
  mSha: string;
  mSize: number;
  mVer: string;
  duration: number;
  changed: boolean;
}

export interface LandingEntry {
  key: string;
  film: string;
  source: LandingSource;
  /** Сырая запись CD-манифеста — для сравнения «изменилось ли». */
  raw: Record<string, unknown>;
}

/** Что делать CLI: режим выключен, включён с путём к CD или путь не задан. */
export type LandingMode =
  | { readonly mode: 'off' }
  | { readonly mode: 'missing-path' }
  | { readonly mode: 'on'; readonly cdRoot: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const fileNameFromUrl = (film: string, url: string): string => {
  const name = url.split('/').pop();
  if (!name) throw new Error(`${film}: package missing from manifest URL`);
  // A release asset is named <first 12 hex of sha256>-<file>; the file name is the part after it.
  return decodeURIComponent(name).replace(/^[0-9a-f]{12}-/u, '');
};

const invalidRecord = (key: string): Error =>
  new Error(`CD: invalid landing manifest record ${key}`);

/** Разбирает одну запись CD-манифеста; остальные поля пересчитываются. */
const readSource = (
  key: string,
  value: unknown,
): { source: LandingSource; raw: Record<string, unknown> } => {
  if (!isRecord(value)) throw invalidRecord(key);
  const { file, url, master, webFile } = value;
  if (typeof file !== 'string' || typeof url !== 'string') throw invalidRecord(key);
  if (webFile !== undefined && typeof webFile !== 'string') throw invalidRecord(key);
  const masterSource =
    isRecord(master) && typeof master.file === 'string' && typeof master.url === 'string'
      ? {
          master: {
            file: master.file,
            url: master.url,
            ...('version' in master ? { version: true as const } : {}),
          },
        }
      : {};
  return {
    source: { file, url, ...(typeof webFile === 'string' ? { webFile } : {}), ...masterSource },
    raw: value,
  };
};

/**
 * Локальные кандидаты web-рендера: явный `webFile` записи, иначе
 * `<ролик>-720p.mp4` (побеждает при двух файлах) и хвост принятого URL.
 */
export const landingRenderCandidates = (film: string, source: LandingSource): readonly string[] => {
  if (source.webFile !== undefined) return [source.webFile];
  const accepted = fileNameFromUrl(film, source.url);
  return accepted === `${film}-720p.mp4` ? [accepted] : [`${film}-720p.mp4`, accepted];
};

/** Первый существующий локальный рендер; ошибка перечисляет проверенные имена. */
export const pickLandingRender = (
  film: string,
  source: LandingSource,
  exists: (name: string) => boolean,
): string => {
  const candidates = landingRenderCandidates(film, source);
  const found = candidates.find((name) => exists(name));
  if (found) return found;
  throw new Error(`${film}: нет web-рендера (${candidates.join(', ')})`);
};

/** Разбор входа режима landing: путь из аргумента, иначе из `CUSTOMDEV_DIR`. */
export const parseLandingMode = (
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
): LandingMode => {
  const index = argv.indexOf('--landing-manifest');
  if (index < 0) return { mode: 'off' };
  const value = argv[index + 1];
  const cdRoot = value && !value.startsWith('--') ? value : env.CUSTOMDEV_DIR;
  return cdRoot ? { mode: 'on', cdRoot } : { mode: 'missing-path' };
};

/** Читает и валидирует CD-манифест; порядок записей сохраняется. */
export const readLandingManifest = (cdRoot: string): readonly LandingEntry[] => {
  const path = join(cdRoot, LANDING_MANIFEST_PATH);
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isRecord(raw)) throw new Error(`CD: invalid landing manifest ${path}`);
  return Object.entries(raw).map(([key, value]) => {
    const film = key.endsWith('.mp4') ? key.slice(0, -4) : key;
    if (!film) throw invalidRecord(key);
    const { source, raw: record } = readSource(key, value);
    return { key, film, source, raw: record };
  });
};

/** Собирает и (если не `dry`) переписывает записи CD-манифеста. */
export const buildLandingRows = (deps: LandingDeps): LandingRow[] => {
  const entries = readLandingManifest(deps.cdRoot);
  const next: Record<string, unknown> = {};
  const rows: LandingRow[] = [];
  let changedAny = false;
  for (const { key, film, source, raw } of entries) {
    const dir = join(deps.root, 'video', film, 'film', 'renders');
    const renderFile = pickLandingRender(film, source, (name) => existsSync(join(dir, name)));
    const accepted = fileNameFromUrl(film, source.url);
    const webPath = join(dir, renderFile);
    const masterPath = join(dir, `${film}.sound.mp4`);
    if (!existsSync(masterPath)) throw new Error(`${film}: нет ${masterPath}`);
    const webSha = deps.sha(webPath),
      webSize = deps.size(webPath);
    const mSha = deps.sha(masterPath),
      mSize = deps.size(masterPath);
    const webVer = webSha.slice(0, 12),
      mVer = mSha.slice(0, 12);
    const masterFile = source.master?.file ?? `${film}-1080p.mp4`;
    const record = {
      file: source.file,
      ...(source.webFile === undefined ? {} : { webFile: source.webFile }),
      sha256: webSha,
      size: webSize,
      url: mediaUrl(accepted, webSha),
      version: webVer,
      master: {
        file: masterFile,
        sha256: mSha,
        size: mSize,
        url: mediaUrl(masterFile, mSha),
        ...(source.master?.version ? { version: mVer } : {}),
      },
      duration: deps.duration(webPath),
    };
    const changed = JSON.stringify(raw) !== JSON.stringify(record);
    if (changed) changedAny = true;
    next[key] = record;
    rows.push({
      film,
      manifest: LANDING_MANIFEST_PATH,
      webFile: accepted,
      renderFile,
      webSha,
      webSize,
      webVer,
      masterFile,
      mSha,
      mSize,
      mVer,
      duration: record.duration,
      changed,
    });
  }
  if (!deps.dry && changedAny)
    deps.write(join(deps.cdRoot, LANDING_MANIFEST_PATH), `${JSON.stringify(next, null, 2)}\n`);
  return rows;
};

/** Печать плана landing-пакетов в том же формате, что у block-*. */
export const formatLandingPlan = (rows: readonly LandingRow[], dry: boolean): string[] => {
  const lines = [
    `${dry ? 'СУХОЙ ПРОГОН' : 'ПИНЫ ОБНОВЛЕНЫ'} · записей landing-video-manifest.json ${rows.length}\n`,
    'ролик                длит.   версия web    размер        версия master  размер master',
  ];
  for (const r of rows) {
    lines.push(
      `${r.film.padEnd(20)} ${String(r.duration).padStart(6)}  ${r.webVer}  ${String(r.webSize).padStart(9)}  ${r.mVer}  ${String(r.mSize).padStart(11)}  ${r.changed ? 'обновлён' : 'без изменений'}`,
    );
  }
  lines.push('\nфайлы для релиза media-v1:');
  for (const r of rows) {
    const local = r.renderFile === r.webFile ? '' : `   ← film/renders/${r.renderFile}`;
    lines.push(
      `  ${r.film.padEnd(20)} ${mediaUrl(r.webFile, r.webSha)}   +   ${mediaUrl(r.masterFile, r.mSha)}${local}`,
    );
  }
  return lines;
};
