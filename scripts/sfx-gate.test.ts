import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import type { DuckReceipt } from '../video/_shared/tools/sfx-receipt.ts';

const GATE = resolve(import.meta.dirname, '../video/_shared/tools/sfx-gate.ts');
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

/** Моно PCM16 48 кГц: синус заданной амплитуды (пик в дБ — по amp). */
const wav = (amp: number): Buffer => {
  const n = 4800;
  const d = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) d.writeInt16LE(Math.round(amp * 32767 * Math.sin(i / 7)), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + d.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(48000, 24);
  h.writeUInt32LE(96000, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(d.length, 40);
  return Buffer.concat([h, d]);
};

interface Opts {
  sfxAmp?: number;
  /** правка квитанции после сборки: подставная, пустая, чужая */
  edit?: (r: DuckReceipt) => void;
  /** порча файла после снятия квитанции */
  tamper?: 'voice';
  /** метрики подставного earshot (по умолчанию в норме единого стандарта) */
  lufs?: number;
  tp?: number;
  /** профиль без музыки (без --music --duck) */
  noMusic?: boolean;
}

/** Каталог с «роликом», стемами, alignment (4 слова: «а», «не», «речь», «—») и честной квитанцией. */
const fixture = (o: Opts = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'sfx-gate-'));
  const p = (n: string) => join(dir, n);
  const write = (n: string, b: Buffer | string) => (writeFileSync(p(n), b), p(n));
  const ref = (path: string) => ({ path, sha256: sha(readFileSync(path)) });
  const files: Record<string, string> = {
    mp4: write('film.mp4', 'видео-как-байты'),
    voice: write('voice.wav', wav(0.5)),
    sfx: write('sfx.wav', wav(o.sfxAmp ?? 0.02)),
    music: write('music.wav', wav(0.1)),
    'music-ducked': write('music-ducked.wav', wav(0.05)),
  };
  // отчёт микса, как его пишет sfx-mix.ts: старый гейт верил ему и константам
  write(
    'film.mp4.sfx.json',
    JSON.stringify({
      voicePeakDb: -2.4,
      gainDb: 1.2,
      sfxPeakDb: { pop: -22 },
      sfxGainDb: 0,
      events: [],
    }),
  );
  const al = {
    characters: [...'а не речь —'],
    character_start_times_seconds: [...'а не речь —'].map((_, i) => i * 0.1),
    character_end_times_seconds: [...'а не речь —'].map((_, i) => i * 0.1 + 0.1),
  };
  const alPath = write('scene-01.alignment.json', JSON.stringify(al));
  const receipt: DuckReceipt = {
    mp4: ref(files.mp4!),
    stems: {
      voice: ref(files.voice!),
      sfx: ref(files.sfx!),
      music: ref(files.music!),
      'music-ducked': ref(files['music-ducked']!),
    },
    alignment: [ref(alPath)],
    alignmentWords: 4,
    perWord: [
      { word: 'а', db: 4.6 },
      { word: 'не', db: 5.1 },
      { word: 'речь', db: 5.4 },
    ],
    skipped: [{ word: '—', t0: 0.9, t1: 1, reason: 'no-letters' }],
    min: 4.6,
    median: 5.1,
    max: 5.4,
    words: 3,
  };
  o.edit?.(receipt);
  if (o.tamper) writeFileSync(files.voice!, wav(0.4));
  const duck = write('duck.json', JSON.stringify(receipt));
  // подставной earshot: пишет заранее известные метрики в --out
  const earshot = write(
    'earshot.sh',
    `#!/bin/sh\nprintf '%s' '{"metrics":[{"metric":"lufs_i","value":${o.lufs ?? -16}},{"metric":"true_peak","value":${o.tp ?? -4.2}},{"metric":"music_frac","value":0.9},{"metric":"end_silence_s","value":0.1}]}' > "$6"\n`,
  );
  chmodSync(earshot, 0o755);
  const run = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      GATE,
      files.mp4!,
      ...(o.noMusic ? [] : ['--music', '--duck', duck]),
    ],
    { env: { ...process.env, EARSHOT_BIN: earshot }, encoding: 'utf8' },
  );
  rmSync(dir, { recursive: true, force: true });
  return { code: run.status, out: run.stdout + run.stderr };
};

await test('настоящая квитанция: гейт PASS и называет покрытие слов', () => {
  const r = fixture();
  assert.equal(r.code, 0, r.out);
  assert.match(
    r.out,
    /PASS {2}квитанция дака связана с MP4 и стемами.*3 замеров \+ 1 пропусков = 4 слов/,
  );
});

await test('подставная квитанция {min:5,max:5,words:0} не принимается', () => {
  const r = fixture({
    edit: (q) =>
      Object.assign(q, { min: 5, max: 5, median: 5, words: 0, perWord: [], skipped: [] }),
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /FAIL {2}квитанция дака/);
  assert.match(r.out, /FAIL {2}дак музыки/);
});

await test('квитанция, снятая с другого MP4, не принимается', () => {
  const r = fixture({ edit: (q) => (q.mp4.sha256 = sha('чужой ролик')) });
  assert.equal(r.code, 1);
  assert.match(r.out, /снята с другого MP4/);
});

await test('стем изменён после квитанции — FAIL', () => {
  const r = fixture({ tamper: 'voice' });
  assert.equal(r.code, 1);
  assert.match(r.out, /стем voice: хеш не совпал/);
});

await test('число слов не сходится с alignment — FAIL', () => {
  const r = fixture({ edit: (q) => (q.skipped = []) });
  assert.equal(r.code, 1);
  assert.match(r.out, /≠ слов alignment 4/);
});

await test('реальное слово среди пропусков — FAIL, а не молчаливое исключение', () => {
  const r = fixture({
    edit: (q) => {
      q.perWord.shift();
      q.words = 2;
      q.skipped.push({ word: 'а', t0: 0, t1: 0.1, reason: 'too-short' });
      q.min = 5.1;
      q.median = 5.25;
    },
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /слово «а» не измерено/);
});

await test('усиленная шина эффектов видна по стему, а не по константам', () => {
  const r = fixture({ sfxAmp: 0.4 });
  assert.equal(r.code, 1);
  assert.match(r.out, /FAIL {2}SFX ≥ 9 дБ под голосом \(по стемам\): 1\.9 дБ/);
});

await test('единый стандарт: −14 LUFS и TP −1,4 не проходят в профиле с музыкой', () => {
  assert.match(fixture({ lufs: -14 }).out, /FAIL {2}громкость −16 ± 1 LUFS/);
  assert.match(fixture({ tp: -1.4 }).out, /FAIL {2}true peak ≤ −1,5 dBTP/);
  const ok = fixture({ lufs: -16.9, tp: -1.6 });
  assert.equal(ok.code, 0, ok.out);
});

await test('единый стандарт: профиль без музыки — −16 ± 1 LUFS и TP ≤ −1,5', () => {
  assert.equal(fixture({ noMusic: true, lufs: -16.2, tp: -1.6 }).code, 0);
  const old = fixture({ noMusic: true, lufs: -14.1, tp: -1.2 });
  assert.equal(old.code, 1);
  assert.match(old.out, /FAIL {2}громкость −16 ± 1 LUFS/);
  assert.match(old.out, /FAIL {2}true peak ≤ −1,5 dBTP/);
});
