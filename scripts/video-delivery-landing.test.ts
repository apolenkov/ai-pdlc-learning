import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { mediaUrl } from './guide-video.ts';

import {
  LANDING_MANIFEST_PATH,
  buildLandingRows,
  formatLandingPlan,
  parseLandingMode,
  type LandingDeps,
} from './video-delivery-landing.ts';

const CLI = resolve(import.meta.dirname, 'video-delivery-manifests.ts');

const hashFile = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readJson = (path: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  assert.ok(isRecord(parsed), `${path}: expected an object`);
  return parsed;
};

/** Рендерный каталог LR-фильма: файлы-фикстуры с разным содержимым. */
const renderDir = (root: string, film: string): string =>
  join(root, 'video', film, 'film', 'renders');

/** Запись CD-манифеста в формате релиза: file (имя сайта), url (пакет релиза), master. */
const pin = (
  film: string,
  accepted: string,
  masterFile: string,
  options: { webFile?: string; masterVersion?: boolean } = {},
): Record<string, unknown> => ({
  file: `${film}.mp4`,
  ...(options.webFile === undefined ? {} : { webFile: options.webFile }),
  sha256: 'a'.repeat(64),
  size: 1,
  url: mediaUrl(accepted, 'a'.repeat(64)),
  version: 'aaaaaaaaaaaa',
  master: {
    file: masterFile,
    sha256: 'b'.repeat(64),
    size: 2,
    url: mediaUrl(masterFile, 'b'.repeat(64)),
    ...(options.masterVersion ? { version: 'bbbbbbbbbbbb' } : {}),
  },
  duration: 1,
});

/** LR-дерево с локальными рендерами и CD-дерево с манифестом. */
const fixture = (): {
  root: string;
  manifestPath: string;
  deps: LandingDeps;
  writes: () => number;
  cleanup: () => void;
} => {
  const root = mkdtempSync(join(tmpdir(), 'landing-lr-'));
  const cdRoot = mkdtempSync(join(tmpdir(), 'landing-cd-'));
  const render = (film: string, name: string): void => {
    const dir = renderDir(root, film);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), `fixture:${film}:${name}`);
    writeFileSync(join(dir, `${film}.sound.mp4`), `fixture:${film}:master`);
  };
  render('landing-before-after', 'landing-before-after-720p.mp4');
  render('landing-before-after', 'landing-before-after.mp4');
  render('landing-team-long', 'landing-team-long-720p.mp4');
  render('landing-custom', 'landing-custom-accepted-720p.mp4');
  render('landing-custom', 'landing-custom.mp4');
  const manifest = {
    'landing-before-after.mp4': pin(
      'landing-before-after',
      'landing-before-after.mp4',
      'landing-before-after.mp4',
    ),
    'landing-team-long.mp4': pin(
      'landing-team-long',
      'landing-team-long-720p.mp4',
      'landing-team-long-1080p.mp4',
      { masterVersion: true },
    ),
    'landing-custom.mp4': pin('landing-custom', 'landing-custom.mp4', 'landing-custom-1080p.mp4', {
      webFile: 'landing-custom-accepted-720p.mp4',
    }),
  };
  mkdirSync(join(cdRoot, 'docs/pages/sdlc-development'), { recursive: true });
  const manifestPath = join(cdRoot, LANDING_MANIFEST_PATH);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  let writes = 0;
  const deps: LandingDeps = {
    root,
    cdRoot,
    dry: true,
    sha: hashFile,
    size: (path) => readFileSync(path).length,
    duration: (path) => (path.includes('team') ? 522.6 : 39.8),
    write: (path, text) => {
      writes += 1;
      writeFileSync(path, text);
    },
  };
  return {
    root,
    manifestPath,
    deps,
    writes: () => writes,
    cleanup: () => {
      rmSync(root, { recursive: true, force: true });
      rmSync(cdRoot, { recursive: true, force: true });
    },
  };
};

/** Пустой CD-манифест: CLI доходит до режима landing и печатает 0 роликов. */
const emptyCd = (): { cdRoot: string; cleanup: () => void } => {
  const cdRoot = mkdtempSync(join(tmpdir(), 'landing-empty-cd-'));
  mkdirSync(join(cdRoot, 'docs/pages/sdlc-development'), { recursive: true });
  writeFileSync(join(cdRoot, LANDING_MANIFEST_PATH), '{}\n');
  return { cdRoot, cleanup: () => rmSync(cdRoot, { recursive: true, force: true }) };
};

/** Копия CLI в фикстурном дереве: рендеры на месте, ffprobe подменён заглушкой. */
const cliFixture = (): {
  root: string;
  cdRoot: string;
  bin: string;
  manifestPath: string;
  cleanup: () => void;
} => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'landing-cli-')));
  const root = join(base, 'lr');
  const cdRoot = join(base, 'cd');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  for (const name of [
    'media-release.ts',
    'video-delivery-landing.ts',
    'video-delivery-render-name.ts',
    'video-delivery-manifests.ts',
  ])
    cpSync(resolve(import.meta.dirname, name), join(root, 'scripts', name));
  const renders = renderDir(root, 'landing-before-after');
  mkdirSync(renders, { recursive: true });
  writeFileSync(join(renders, 'landing-before-after-720p.mp4'), 'fixture:web');
  writeFileSync(join(renders, 'landing-before-after.mp4'), 'fixture:decoy');
  writeFileSync(join(renders, 'landing-before-after.sound.mp4'), 'fixture:master');
  mkdirSync(join(cdRoot, 'docs/pages/sdlc-development'), { recursive: true });
  const manifestPath = join(cdRoot, LANDING_MANIFEST_PATH);
  const manifest = {
    'landing-before-after.mp4': pin(
      'landing-before-after',
      'landing-before-after.mp4',
      'landing-before-after.mp4',
    ),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const bin = join(base, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'ffprobe'), '#!/bin/sh\necho 39.8\n');
  chmodSync(join(bin, 'ffprobe'), 0o755);
  return {
    root,
    cdRoot,
    bin,
    manifestPath,
    cleanup: () => rmSync(base, { recursive: true, force: true }),
  };
};

const cleanEnv = (): NodeJS.ProcessEnv => {
  const env = { ...process.env };
  delete env.CUSTOMDEV_DIR;
  return env;
};

const runCli = (args: readonly string[], env: NodeJS.ProcessEnv) =>
  spawnSync(process.execPath, ['--experimental-strip-types', CLI, ...args], {
    encoding: 'utf8',
    env,
  });

await test('локальный рендер: явный webFile, иначе -720p при двух файлах, а webFile строки — хвост URL', () => {
  const fixtureTree = fixture();
  try {
    const rows = buildLandingRows(fixtureTree.deps);
    assert.deepEqual(
      rows.map((row) => row.film),
      ['landing-before-after', 'landing-team-long', 'landing-custom'],
    );
    assert.equal(rows[0]?.renderFile, 'landing-before-after-720p.mp4');
    assert.equal(rows[0]?.webFile, 'landing-before-after.mp4');
    assert.equal(
      rows[0]?.webSha,
      hashFile(
        join(renderDir(fixtureTree.root, 'landing-before-after'), 'landing-before-after-720p.mp4'),
      ),
    );
    assert.equal(rows[1]?.renderFile, 'landing-team-long-720p.mp4');
    assert.equal(rows[1]?.webFile, 'landing-team-long-720p.mp4');
    assert.equal(rows[1]?.duration, 522.6);
    assert.equal(rows[2]?.renderFile, 'landing-custom-accepted-720p.mp4');
    assert.equal(rows[2]?.webFile, 'landing-custom.mp4');
    assert.equal(
      rows[2]?.webSha,
      hashFile(
        join(renderDir(fixtureTree.root, 'landing-custom'), 'landing-custom-accepted-720p.mp4'),
      ),
    );
    assert.equal(fixtureTree.writes(), 0, '--dry не пишет CD-манифест');
  } finally {
    fixtureTree.cleanup();
  }
});

await test('план загрузки: в релизе — хвост принятого URL, локальный файл — только в подсказке ←', () => {
  const fixtureTree = fixture();
  try {
    const plan = formatLandingPlan(buildLandingRows(fixtureTree.deps), true).join('\n');
    const line = (film: string): string =>
      plan.split('\n').find((row) => row.startsWith(`  ${film} `)) ?? '';
    const beforeAfter = line('landing-before-after');
    assert.match(beforeAfter, /media-v1\/[0-9a-f]{12}-landing-before-after\.mp4/u);
    assert.match(beforeAfter, /← film\/renders\/landing-before-after-720p\.mp4/u);
    assert.ok(
      beforeAfter.includes('landing-before-after.mp4') &&
        beforeAfter.includes('landing-before-after-720p.mp4'),
      'в строке видно имя пакета релиза и локальный файл',
    );
    const custom = line('landing-custom');
    assert.match(custom, /media-v1\/[0-9a-f]{12}-landing-custom\.mp4/u);
    assert.match(custom, /← film\/renders\/landing-custom-accepted-720p\.mp4/u);
    const team = line('landing-team-long');
    assert.match(team, /media-v1\/[0-9a-f]{12}-landing-team-long-720p\.mp4/u);
    assert.doesNotMatch(team, /←/u, 'имя в релизе совпало с локальным — подсказка не нужна');
  } finally {
    fixtureTree.cleanup();
  }
});

await test('без --dry пины пишутся в CD-манифест: file из CD, url без -720p, производный webFile не пишется', () => {
  const fixtureTree = fixture();
  try {
    const rows = buildLandingRows({ ...fixtureTree.deps, dry: false });
    assert.equal(fixtureTree.writes(), 1);
    const written = readJson(fixtureTree.manifestPath);
    const beforeAfter = written['landing-before-after.mp4'];
    assert.ok(isRecord(beforeAfter));
    assert.equal(beforeAfter.file, 'landing-before-after.mp4');
    assert.equal('webFile' in beforeAfter, false);
    assert.equal(beforeAfter.version, rows[0]?.webVer);
    assert.equal(beforeAfter.sha256, rows[0]?.webSha);
    assert.equal(beforeAfter.url, mediaUrl('landing-before-after.mp4', rows[0]?.webSha ?? ''));
    const master = beforeAfter.master;
    assert.ok(isRecord(master));
    assert.equal('version' in master, false);
    const custom = written['landing-custom.mp4'];
    assert.ok(isRecord(custom));
    assert.equal(custom.webFile, 'landing-custom-accepted-720p.mp4');
    assert.equal(custom.url, mediaUrl('landing-custom.mp4', rows[2]?.webSha ?? ''));
    const team = written['landing-team-long.mp4'];
    assert.ok(isRecord(team));
    assert.equal('webFile' in team, false);
    const teamMaster = team.master;
    assert.ok(isRecord(teamMaster));
    assert.equal(teamMaster.version, rows[1]?.mVer, 'master.version сохраняется, если был');
  } finally {
    fixtureTree.cleanup();
  }
});

await test('нет локального рендера: у записи с явным webFile проверяется только он', () => {
  const fixtureTree = fixture();
  try {
    rmSync(join(renderDir(fixtureTree.root, 'landing-custom'), 'landing-custom-accepted-720p.mp4'));
    assert.throws(
      () => buildLandingRows(fixtureTree.deps),
      /landing-custom: нет web-рендера \(landing-custom-accepted-720p\.mp4\)/u,
    );
  } finally {
    fixtureTree.cleanup();
  }
});

await test('CLI: путь к CD из аргумента или CUSTOMDEV_DIR, иначе режим выключен', () => {
  assert.deepEqual(parseLandingMode(['node', 'cli', '--landing-manifest', '/cd', '--dry'], {}), {
    mode: 'on',
    cdRoot: '/cd',
  });
  assert.deepEqual(
    parseLandingMode(['node', 'cli', '--landing-manifest', '--dry'], { CUSTOMDEV_DIR: '/env-cd' }),
    { mode: 'on', cdRoot: '/env-cd' },
  );
  assert.deepEqual(parseLandingMode(['node', 'cli', '--landing-manifest', '--dry'], {}), {
    mode: 'missing-path',
  });
  assert.deepEqual(parseLandingMode(['node', 'cli', '--dry'], { CUSTOMDEV_DIR: '/env-cd' }), {
    mode: 'off',
  });
});

await test('CLI: --landing-manifest с путём включает режим landing (печатает 0 роликов на пустом CD)', () => {
  const cd = emptyCd();
  try {
    const result = runCli(['--landing-manifest', cd.cdRoot, '--dry'], cleanEnv());
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /записей landing-video-manifest\.json 0/u);
  } finally {
    cd.cleanup();
  }
});

await test('CLI: без аргумента путь к CD берётся из CUSTOMDEV_DIR', () => {
  const cd = emptyCd();
  try {
    const result = runCli(['--landing-manifest', '--dry'], {
      ...cleanEnv(),
      CUSTOMDEV_DIR: cd.cdRoot,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /записей landing-video-manifest\.json 0/u);
  } finally {
    cd.cleanup();
  }
});

await test('CLI: --dry не меняет CD-манифест, без --dry — переписывает пины', () => {
  const fixtureTree = cliFixture();
  try {
    const cliPath = join(fixtureTree.root, 'scripts', 'video-delivery-manifests.ts');
    const env = { ...cleanEnv(), PATH: `${fixtureTree.bin}:${process.env.PATH ?? ''}` };
    const run = (args: readonly string[]) =>
      spawnSync(process.execPath, ['--experimental-strip-types', cliPath, ...args], {
        encoding: 'utf8',
        env,
      });
    const before = hashFile(fixtureTree.manifestPath);
    const dry = run(['--landing-manifest', fixtureTree.cdRoot, '--dry']);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(hashFile(fixtureTree.manifestPath), before, '--dry не пишет CD-манифест');
    assert.match(dry.stdout, /← film\/renders\/landing-before-after-720p\.mp4/u);
    const wet = run(['--landing-manifest', fixtureTree.cdRoot]);
    assert.equal(wet.status, 0, wet.stderr);
    assert.notEqual(hashFile(fixtureTree.manifestPath), before, 'без --dry пины обновляются');
    const written = readJson(fixtureTree.manifestPath)['landing-before-after.mp4'];
    assert.ok(isRecord(written));
    assert.equal(
      written.version,
      hashFile(
        join(renderDir(fixtureTree.root, 'landing-before-after'), 'landing-before-after-720p.mp4'),
      ).slice(0, 12),
    );
  } finally {
    fixtureTree.cleanup();
  }
});

await test('CLI: без пути и без CUSTOMDEV_DIR — EXIT 1 и понятная ошибка без стека', () => {
  const result = runCli(['--landing-manifest', '--dry'], cleanEnv());
  assert.equal(result.status, 1);
  assert.match(result.stderr, /укажи --landing-manifest <путь к CD> или переменную CUSTOMDEV_DIR/u);
  assert.doesNotMatch(result.stderr, /Node\.js v|^\s+at /mu, 'без стека вызовов');
});
