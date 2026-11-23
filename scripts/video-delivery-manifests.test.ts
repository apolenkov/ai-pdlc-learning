import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { buildFilmManifest, type FilmManifestDeps } from './video-delivery-manifests.ts';
import { mediaUrl } from './guide-video.ts';

const hashFile = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readJson = (path: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  assert.ok(isRecord(parsed), `${path}: expected an object`);
  return parsed;
};

/** Дерево одного ролика: манифест, web-рендеры и master; внешние операции настоящие, кроме ffprobe. */
const fixture = (options: {
  webFile?: string;
  renders: readonly string[];
}): { root: string; deps: FilmManifestDeps; cleanup: () => void } => {
  const root = mkdtempSync(join(tmpdir(), 'video-delivery-manifest-'));
  const renders = join(root, 'video/block-0/film/renders');
  mkdirSync(renders, { recursive: true });
  const manifest: Record<string, string> = {
    file: 'block-0.mp4',
    url: mediaUrl('block-0-720p.mp4', 'f'.repeat(64)),
  };
  if (options.webFile !== undefined) manifest.webFile = options.webFile;
  writeFileSync(
    join(root, 'video/block-0/video-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  for (const render of options.renders) writeFileSync(join(renders, render), `fixture:${render}`);
  const deps: FilmManifestDeps = {
    root,
    dry: false,
    sha: hashFile,
    size: (path) => readFileSync(path).length,
    duration: () => 39.8,
    write: (path, text) => writeFileSync(path, text),
  };
  return { root, deps, cleanup: () => rmSync(root, { recursive: true, force: true }) };
};

await test('webFile манифеста меняет выбранный web-рендер, а не только имя в манифесте', () => {
  const { root, deps, cleanup } = fixture({
    webFile: 'block-0-accepted.mp4',
    renders: ['block-0-720p.mp4', 'block-0-accepted.mp4', 'block-0.sound.mp4'],
  });
  try {
    const row = buildFilmManifest('block-0', deps);
    assert.equal(
      row.webSha,
      hashFile(join(root, 'video/block-0/film/renders/block-0-accepted.mp4')),
    );
    const written = readJson(join(root, 'video/block-0/video-manifest.json'));
    assert.equal(written.webFile, 'block-0-accepted.mp4');
    assert.equal(written.version, row.webVer);
    assert.equal(written.sha256, row.webSha);
    assert.equal(written.url, mediaUrl('block-0.mp4', row.webSha));
  } finally {
    cleanup();
  }
});

await test('без webFile имя web-рендера — <ролик>-720p.mp4', () => {
  const { root, deps, cleanup } = fixture({
    renders: ['block-0-720p.mp4', 'block-0-accepted.mp4', 'block-0.sound.mp4'],
  });
  try {
    const row = buildFilmManifest('block-0', deps);
    assert.equal(row.webSha, hashFile(join(root, 'video/block-0/film/renders/block-0-720p.mp4')));
    const written = readJson(join(root, 'video/block-0/video-manifest.json'));
    assert.equal('webFile' in written, false);
    assert.equal(written.version, row.webVer);
  } finally {
    cleanup();
  }
});

await test('webFile указывает на отсутствующий файл — ошибка перечисляет проверенное имя', () => {
  const { deps, cleanup } = fixture({
    webFile: 'block-0-missing.mp4',
    renders: ['block-0-720p.mp4', 'block-0.sound.mp4'],
  });
  try {
    assert.throws(
      () => buildFilmManifest('block-0', deps),
      /block-0: нет web-рендера \(block-0-missing\.mp4\)/,
    );
  } finally {
    cleanup();
  }
});
