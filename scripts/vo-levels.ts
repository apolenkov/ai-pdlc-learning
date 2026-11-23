#!/usr/bin/env node
// Громкость озвучки по сценам: измерение ebur128 и выравнивание к цели.
//
//   node --experimental-strip-types scripts/vo-levels.ts                 отчёт, ничего не пишет
//   node --experimental-strip-types scripts/vo-levels.ts --apply         выровнять (volume + libmp3lame -q:a 2)
//   node --experimental-strip-types scripts/vo-levels.ts --film block-0  только один ролик
//   node --experimental-strip-types scripts/vo-levels.ts --json <path>   та же таблица в JSON
//
// Приёмка Fable: разброс громкости сцен внутри ролика ≤ SPREAD_MAX дБ, пик каждой сцены ≤ PEAK_MAX dBTP.
// Гейн = TARGET_LUFS − I, ограничен так, чтобы Peak + gain ≤ PEAK_CAP; при |gain| < SKIP_DB файл не
// перекодируется, поэтому повторный прогон ничего не меняет (идемпотентность).
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VIDEO = 'video';
const FILMS = [
  'block-0',
  'block-0a',
  'block-sdd',
  'block-p4',
  'block-r1',
  'block-r2',
  'block-r3',
  'block-r4',
  'block-r4new',
  'block-r4legacy',
  'block-team',
  'block-delivery',
  'block-dark-factory',
];
const TARGET_LUFS = -19; // цель выравнивания озвучки сцены
const PEAK_CAP = -1.5; // предел пика с запасом к приёмочному −1 dBTP
const PEAK_MAX = -1; // приёмка: пик каждой сцены не выше
const SPREAD_MAX = 1; // приёмка: разброс громкости сцен внутри ролика
const SKIP_DB = 0.05; // меньше этого гейн не применяем (повторный прогон)

type Measured = { file: string; lufs: number; peak: number };

const run = (bin: string, args: string[]) =>
  execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function measure(file: string): Measured {
  const res = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`; // отчёт ebur128 ffmpeg печатает в stderr
  const lufs = [...out.matchAll(/I:\s+(-?[\d.]+)\s+LUFS/g)].at(-1)?.[1];
  const peak = [...out.matchAll(/Peak:\s+(-?[\d.]+)\s+dBFS/g)].at(-1)?.[1];
  if (lufs === undefined || peak === undefined)
    throw new Error(`ebur128: не разобрал отчёт для ${file}`);
  return { file, lufs: Number(lufs), peak: Number(peak) };
}

const duration = (file: string) =>
  Number(
    run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      file,
    ]).trim(),
  );

function applyGain(file: string, gainDb: number): void {
  const tmp = `${file}.leveled.mp3`;
  run('ffmpeg', [
    '-hide_banner',
    '-y',
    '-i',
    file,
    '-af',
    `volume=${gainDb.toFixed(2)}dB`,
    '-c:a',
    'libmp3lame',
    '-q:a',
    '2',
    tmp,
  ]);
  renameSync(tmp, file);
}

const round = (n: number, d = 2) => Number(n.toFixed(d));
const spread = (xs: number[]) => (xs.length ? round(Math.max(...xs) - Math.min(...xs)) : 0);

const argValue = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  if (i < 0) return undefined;
  const value = process.argv[i + 1];
  if (!value) throw new Error(`нет значения для ${flag}`);
  return value;
};

const filmArg = argValue('--film');
const films = filmArg ? [filmArg] : FILMS;
const apply = process.argv.includes('--apply');
const jsonAt = argValue('--json');

type FilmReport = {
  film: string;
  scenes: number;
  before: { lufs: number[]; peak: number[]; spread: number; peakMax: number };
  gains: {
    scene: string;
    gain: number;
    capped: boolean;
    skipped: boolean;
    dur: number;
    durAfter: number;
  }[];
};

const reports: FilmReport[] = [];
for (const film of films) {
  const dir = resolve(VIDEO, film, 'film', 'assets', 'vo');
  const files = readdirSync(dir)
    .filter((f) => /^scene-.*\.mp3$/.test(f))
    .sort();
  if (!files.length) throw new Error(`${dir}: нет scene-*.mp3`);
  const gains: FilmReport['gains'] = [];
  const before: number[] = [];
  const beforePeak: number[] = [];
  for (const f of files) {
    const path = resolve(dir, f);
    const m = measure(path);
    before.push(m.lufs);
    beforePeak.push(m.peak);
    const want = TARGET_LUFS - m.lufs;
    const cap = PEAK_CAP - m.peak;
    const gain = Math.min(want, cap);
    const capped = cap < want - 1e-9;
    const dur = duration(path);
    let durAfter = dur;
    const skip = Math.abs(gain) < SKIP_DB;
    if (apply && !skip) {
      applyGain(path, gain);
      durAfter = duration(path);
    }
    gains.push({
      scene: f.replace(/^scene-|\.mp3$/g, ''),
      gain: round(gain),
      capped,
      skipped: skip,
      dur: round(dur, 3),
      durAfter: round(durAfter, 3),
    });
  }
  reports.push({
    film,
    scenes: files.length,
    before: {
      lufs: before.map((x) => round(x)),
      peak: beforePeak.map((x) => round(x)),
      spread: spread(before),
      peakMax: round(Math.max(...beforePeak)),
    },
    gains,
  });
}

const after: Record<string, { lufs: number[]; peak: number[]; spread: number; peakMax: number }> =
  {};
for (const r of reports) {
  if (!apply) {
    after[r.film] = {
      lufs: r.before.lufs,
      peak: r.before.peak,
      spread: r.before.spread,
      peakMax: r.before.peakMax,
    };
    continue;
  }
  const dir = resolve(VIDEO, r.film, 'film', 'assets', 'vo');
  const lufs: number[] = [];
  const peak: number[] = [];
  for (const f of readdirSync(dir)
    .filter((f) => /^scene-.*\.mp3$/.test(f))
    .sort()) {
    const m = measure(resolve(dir, f));
    lufs.push(round(m.lufs));
    peak.push(round(m.peak));
  }
  after[r.film] = { lufs, peak, spread: spread(lufs), peakMax: round(Math.max(...peak)) };
}

const afterOf = (film: string) => {
  const a = after[film];
  if (!a) throw new Error(`нет измерений «после» для ${film}`);
  return a;
};

let ok = true;
console.log(
  `режим: ${apply ? 'APPLY' : 'отчёт'} · цель ${TARGET_LUFS} LUFS · пик ≤ ${PEAK_CAP} dBTP (приёмка ≤ ${PEAK_MAX}, разброс ≤ ${SPREAD_MAX})\n`,
);
console.log(
  'фильм                 сцен  I до (min…max)     разброс до  пик до   I после (min…max)   разброс после  пик после  гейны',
);
for (const r of reports) {
  const a = afterOf(r.film);
  const b = r.before;
  const row = [
    r.film.padEnd(21),
    String(r.scenes).padStart(4),
    `${Math.min(...b.lufs).toFixed(1)}…${Math.max(...b.lufs).toFixed(1)}`.padStart(15),
    `${b.spread.toFixed(1)}`.padStart(10),
    `${b.peakMax.toFixed(1)}`.padStart(8),
    `${Math.min(...a.lufs).toFixed(1)}…${Math.max(...a.lufs).toFixed(1)}`.padStart(18),
    `${a.spread.toFixed(1)}`.padStart(13),
    `${a.peakMax.toFixed(1)}`.padStart(9),
    `  ${[...new Set(r.gains.map((g) => g.gain))].sort((x, y) => x - y).join(', ')}`,
  ].join(' ');
  console.log(row);
  const filmOk = a.spread <= SPREAD_MAX + 1e-9 && a.peakMax <= PEAK_MAX + 1e-9;
  if (!filmOk) ok = false;
  const durShift = r.gains.filter((g) => !g.skipped && Math.abs(g.durAfter - g.dur) > 0.02);
  if (durShift.length)
    console.log(
      `  ! длительность изменилась > 0,02 с: ${durShift.map((g) => `${g.scene} ${g.dur}→${g.durAfter}`).join(', ')}`,
    );
  const cappedList = r.gains.filter((g) => g.capped);
  if (cappedList.length)
    console.log(
      `  · гейн ограничен пиком: ${cappedList.map((g) => `${g.scene} ${g.gain}`).join(', ')}`,
    );
}
const all = reports.flatMap((r) => afterOf(r.film).lufs);
console.log(
  `\nвсего сцен: ${all.length}, общий разброс после: ${spread(all).toFixed(2)} дБ, максимум пика: ${Math.max(...reports.map((r) => afterOf(r.film).peakMax)).toFixed(2)} dBTP`,
);
console.log(
  ok ? 'PASS: разброс и пики в допуске по всем роликам' : 'FAIL: есть ролики вне допуска',
);
if (jsonAt) {
  writeFileSync(
    jsonAt,
    JSON.stringify({ target: TARGET_LUFS, peakCap: PEAK_CAP, apply, reports, after }, null, 1),
  );
  console.log(`JSON: ${jsonAt}`);
}
if (apply && !ok) process.exitCode = 1;
