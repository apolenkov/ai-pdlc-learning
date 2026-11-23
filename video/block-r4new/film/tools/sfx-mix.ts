#!/usr/bin/env node
// Звук ролика (TASK-588): SFX из video/_shared/sfx поверх озвучки готового mp4. Картинка не перекодируется.
//   node --experimental-strip-types video/_shared/tools/sfx-mix.ts <каталог film> <исходный.mp4> <выход.mp4>
// Берёт <film>/sfx.json, <film>/scenes.json, <film>/assets/vo/scene-NN.alignment.json; мастер доводится до −16 LUFS (единый стандарт),
// true peak ≤ −1,5 dBTP (alimiter). Рядом кладёт <выход>.sfx.json — отчёт для sfx-gate.ts.
//
// Ролик с музыкой (v3.3, решение 008 «звук»): добавляется ключ `--music <файл>`, тогда мастер идёт
// через loudnorm в два прохода (линейный гейн и лимитер на TP), а музыка ныряет под голос:
//   --music-offset <с>   позиция в треке, звучащая на 0 с ролика (сетку долей даёт 588/hero-v33/grid.py)
//   --music-gain <дБ>    уровень подложки; --music-fade <с> — затухание в конце (по умолчанию 1.5)
//   --sfx-gain <дБ>      уровень шины эффектов
//   --duck-threshold <л> --duck-ratio <n> --duck-attack <мс> --duck-release <мс> — sidechaincompress под голос
//   --lufs <n> --tp <n>  goals: I и true peak (для роликов с музыкой −16 ±1 LU и ≤ −4 dBTP)
//   --stems <каталог>    сохранить стемы (voice/music/music-ducked/sfx) — доказательства и замер дака
// Без музыки путь прежний: −16 LUFS, alimiter, потолок снижается, пока true peak в допуске.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planEvents, type Alignment, type SfxConfig, type SfxKind } from './sfx-plan.ts';

const here = dirname(fileURLToPath(import.meta.url));
const SFX = resolve(here, '../sfx');
const TARGET_LUFS = -16;
const CEILING = 0.82; // −1,7 dBFS: запас под true peak после AAC; если кодек всё равно выше −1,55, потолок снижается
const PEAK_DB: Record<SfxKind, number> = {
  // пики файлов набора, см. sfx/README.md
  swipe: -22,
  hover: -24,
  subdrop: -22,
  pop: -22,
  click: -24,
};

// --- аргументы: «--ключ значение» забирает значение, остальное — позиционные ---
const argv = process.argv.slice(2);
const WITH_VALUE = new Set([
  '--music',
  '--music-offset',
  '--music-gain',
  '--music-fade',
  '--sfx-gain',
  '--duck-threshold',
  '--duck-ratio',
  '--duck-attack',
  '--duck-release',
  '--duck-level-sc',
  '--duck-flat-ratio',
  '--duck-flat-threshold',
  '--duck-flat-attack',
  '--duck-flat-release',
  '--lufs',
  '--tp',
  '--stems',
]);
const positional: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (WITH_VALUE.has(argv[i]!)) i++;
  else positional.push(argv[i]!);
}
const flag = (name: string, dflt: string): string => {
  const i = argv.indexOf(name);
  return i < 0 ? dflt : String(argv[i + 1]);
};
const num = (name: string, dflt: number): number => Number(flag(name, String(dflt)));
const [film, src, out] = positional.map((p) => (p ? resolve(p) : ''));
if (!film || !src || !out)
  throw new Error('usage: sfx-mix.ts <film dir> <source.mp4> <out.mp4> [--music …]');
const music = flag('--music', '') ? resolve(flag('--music', '')) : '';
const musicOffset = num('--music-offset', 0);
const musicGain = num('--music-gain', 0);
const musicFade = num('--music-fade', 1.5);
const sfxGain = num('--sfx-gain', 0);
const duckThreshold = num('--duck-threshold', 0.000976563);
const duckRatio = num('--duck-ratio', 1.5);
// level_sc — штатный гейн сайдчейна: порог sidechaincompress ограничен снизу −60 дБ, нужную
// глубину добираем подъёмом сайдчейна (k>1 — как более низкий порог)
const duckLevelSc = num('--duck-level-sc', 2.18);
const attackMs = num('--duck-attack', 150);
const releaseMs = num('--duck-release', 300);
// выравниватель сайдчейна: голос сжимается сильно и с низким порогом, чтобы уровень под даками
// почти не зависел от громкости слова (иначе дак плавает вместе с фразой); 1 — выключен
const flatRatio = num('--duck-flat-ratio', 20);
const flatThreshold = num('--duck-flat-threshold', 0.003);
const flatAttackMs = num('--duck-flat-attack', 5);
const flatReleaseMs = num('--duck-flat-release', 60);
const targetLufs = num('--lufs', TARGET_LUFS);
const targetTp = num('--tp', -1.5);
let stemsDir = flag('--stems', '') ? resolve(flag('--stems', '')) : '';

const json = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const ff = (args: string[]) =>
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
// ffmpeg пишет измерения в stderr
const ffLog = (args: string[]): string =>
  spawnSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8' }).stderr;
const cfg = json<SfxConfig>(join(film, 'sfx.json'));
const scenes = json<{ n: number; duration: number }[]>(join(film, 'scenes.json'));
const aligns = scenes.map((s) =>
  json<Alignment>(join(film, `assets/vo/scene-${String(s.n).padStart(2, '0')}.alignment.json`)),
);
const filmDur = scenes.reduce((a, s) => a + s.duration, 0);
const events = planEvents(
  scenes.map((s) => s.duration),
  aligns,
  cfg,
);
const musicIndex = events.length + 1;

// пик голоса — для отчёта (volumedetect пишет в stderr)
const peakOf = (args: string[]): number => {
  const r = ffLog(['-i', src, ...args, '-af', 'volumedetect', '-f', 'null', '-']);
  return Number(/max_volume: (-?[\d.]+) dB/.exec(r)![1]);
};
const voicePeak = peakOf(['-vn']);

const inputs = ['-i', src, ...events.flatMap((e) => ['-i', join(SFX, `${e.kind}.wav`)])];
if (music) inputs.push('-i', music);
const legs = events.map((e, i) => {
  const ms = Math.round(e.t * 1000),
    l = 1 - Math.max(e.pan, 0),
    r = 1 + Math.min(e.pan, 0);
  return `[${i + 1}:a]adelay=${ms}|${ms},pan=stereo|c0=${l}*c0|c1=${r}*c0[e${i}]`;
});
const sfxBus =
  `${events.map((_, i) => `[e${i}]`).join('')}amix=inputs=${events.length}:normalize=0:duration=longest,` +
  `volume=${sfxGain}dB[sfx]`;
const voice = '[0:a]aformat=channel_layouts=stereo,aresample=48000[v]';
// в миксе с музыкой голос нужен дважды (в шину и в цепь дака) — ярлык отдаётся один раз, поэтому asplit
const voiceSplit = '[0:a]aformat=channel_layouts=stereo,aresample=48000,asplit=2[v][vsc]';
const musicLeg =
  `[${musicIndex}:a]atrim=${musicOffset}:${(musicOffset + filmDur).toFixed(4)},asetpts=PTS-STARTPTS,` +
  `aformat=channel_layouts=stereo,aresample=48000,volume=${musicGain}dB,` +
  `afade=t=out:st=${(filmDur - musicFade).toFixed(4)}:d=${musicFade}[mpre]`;
/**
 * Цепь дака: музыка `music` ныряет под голос `voice` на выход `out`.
 * Сайдчейн заранее выравнивается компрессором с низким порогом, поэтому глубина дака держится
 * в узком коридоре при разной громкости слов; атака/отпуск дака — по брифу (150/300 мс).
 */
const duckChain = (voiceLabel: string, musicLabel: string, outLabel: string): string => {
  const sc =
    `sidechaincompress=threshold=${duckThreshold}:ratio=${duckRatio}:attack=${attackMs}:` +
    `release=${releaseMs}:makeup=1:level_sc=${duckLevelSc}`;
  if (flatRatio <= 1) return `[${musicLabel}][${voiceLabel}]${sc}[${outLabel}]`;
  return (
    `[${voiceLabel}]acompressor=threshold=${flatThreshold}:ratio=${flatRatio}:attack=${flatAttackMs}:` +
    `release=${flatReleaseMs}:makeup=1:knee=1[flat];[${musicLabel}][flat]${sc}[${outLabel}]`
  );
};
/** Граф микса. music=true — голос + музыка под даками + эффекты; иначе прежний путь с alimiter. */
const mixGraph = (withMusic: boolean, gainDb = 0, ceiling = CEILING): string =>
  withMusic
    ? `${voiceSplit};${legs.join(';')};${sfxBus};${musicLeg};${duckChain('vsc', 'mpre', 'md')};` +
      `[v][md][sfx]amix=inputs=3:normalize=0:duration=first,volume=${gainDb}dB[m]`
    : `${voice};${legs.join(';')};[v]${events.map((_, i) => `[e${i}]`).join('')}` +
      `amix=inputs=${events.length + 1}:normalize=0:duration=first,volume=${gainDb}dB,alimiter=limit=${ceiling}:level=disabled[m]`;
const loudness = (graph: string): number => {
  const r = ffLog([
    ...inputs,
    '-filter_complex',
    `${graph};[m]ebur128=peak=true[x]`,
    '-map',
    '[x]',
    '-f',
    'null',
    '-',
  ]);
  const all = [...r.matchAll(/I:\s+(-?[\d.]+) LUFS/g)];
  return Number(all[all.length - 1]![1]);
};
const truePeak = (file: string): number => {
  const r = ffLog([
    '-i',
    file,
    '-filter_complex',
    '[0:a]ebur128=peak=true[x]',
    '-map',
    '[x]',
    '-f',
    'null',
    '-',
  ]);
  const all = [...r.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)];
  return Number(all[all.length - 1]![1]);
};

/** Стемы для доказательств и замера дака (в отчёт гейта не входят). */
const writeStems = (): void => {
  if (!stemsDir) return;
  mkdirSync(stemsDir, { recursive: true });
  const pcm = ['-c:a', 'pcm_s24le'];
  ff([...inputs, '-filter_complex', voice, '-map', '[v]', ...pcm, join(stemsDir, 'voice.wav')]);
  ff([
    ...inputs,
    '-filter_complex',
    `${legs.join(';')};${sfxBus}`,
    '-map',
    '[sfx]',
    ...pcm,
    join(stemsDir, 'sfx.wav'),
  ]);
  ff([
    ...inputs,
    '-filter_complex',
    `${voice};${musicLeg};[mpre]asplit=2[m1][m2];${duckChain('v', 'm2', 'md')}`,
    '-map',
    '[m1]',
    ...pcm,
    join(stemsDir, 'music.wav'),
    '-map',
    '[md]',
    ...pcm,
    join(stemsDir, 'music-ducked.wav'),
  ]);
};

let gain: number;
let musicReport: Record<string, unknown> = {};
if (!music) {
  gain = targetLufs - loudness(mixGraph(false));
  writeStems();
  for (let ceiling = CEILING, tries = 0; ; ceiling *= 0.97, tries++) {
    ff([
      ...inputs,
      '-filter_complex',
      mixGraph(false, gain, ceiling),
      '-map',
      '0:v',
      '-map',
      '[m]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      out,
    ]);
    if (truePeak(out) <= targetTp - 0.05 || tries >= 5) break;
  }
} else {
  writeStems();
  const l1 = ffLog([
    ...inputs,
    '-filter_complex',
    `${mixGraph(true)};[m]loudnorm=I=${targetLufs}:TP=${targetTp}:LRA=11:print_format=json[x]`,
    '-map',
    '[x]',
    '-f',
    'null',
    '-',
  ]);
  writeFileSync(`${out}.loudnorm-pass1.log`, l1);
  if (!l1.includes('{')) throw new Error(`loudnorm проход 1 без замера:\n${l1.slice(-1500)}`);
  const measured = JSON.parse(l1.slice(l1.indexOf('{'), l1.lastIndexOf('}') + 1)) as Record<
    string,
    string
  >;
  writeFileSync(`${out}.loudnorm.json`, JSON.stringify(measured, null, 1) + '\n');
  gain = targetLufs - Number(measured.input_i);
  const ln =
    `loudnorm=I=${targetLufs}:TP=${targetTp}:LRA=11:linear=true:` +
    `measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:` +
    `measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:print_format=summary`;
  // loudnorm линейного прохода не знает про перегрузку AAC: после кодека true peak выше цели на ~0,2 дБ.
  // Остаток срезаем алимитером (не глобальным тримом: трим уводит I ниже цели), повторяя экспорт,
  // пока MP4 не уложится в TP (как в пути без музыки).
  let ceilDb = targetTp;
  let outTp = Infinity;
  for (let tries = 0; ; tries++) {
    const lim = `alimiter=limit=${(10 ** (ceilDb / 20)).toFixed(6)}:level=disabled`;
    ff([
      ...inputs,
      '-filter_complex',
      `${mixGraph(true)};[m]${ln},aresample=48000,${lim}[x]`,
      '-map',
      '0:v',
      '-map',
      '[x]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      out,
    ]);
    outTp = truePeak(out);
    if (outTp <= targetTp - 0.05 || tries >= 4) break;
    ceilDb -= outTp - targetTp + 0.1;
  }
  musicReport = {
    file: music.split('/').pop(),
    offsetS: musicOffset,
    gainDb: musicGain,
    fadeS: musicFade,
    loudnorm: {
      I: targetLufs,
      TP: targetTp,
      measured_input_i: Number(measured.input_i),
      measured_input_tp: Number(measured.input_tp),
      measured_input_lra: Number(measured.input_lra),
    },
    limiterMarginDb: Number((targetTp - ceilDb).toFixed(2)),
    limiterCeilDb: Number(ceilDb.toFixed(2)),
    truePeakDbFS: Number(outTp.toFixed(2)),
    duck: {
      attackMs,
      releaseMs,
      threshold: duckThreshold,
      ratio: duckRatio,
      levelSc: duckLevelSc,
      flat: {
        ratio: flatRatio,
        threshold: flatThreshold,
        attackMs: flatAttackMs,
        releaseMs: flatReleaseMs,
      },
    },
  };
}

const sfxPeaks = Object.fromEntries(
  (Object.keys(PEAK_DB) as SfxKind[]).map((k) => [k, PEAK_DB[k]]),
);
writeFileSync(
  `${out}.sfx.json`,
  JSON.stringify(
    {
      voicePeakDb: voicePeak,
      gainDb: Number(gain.toFixed(2)),
      targetLufs,
      targetTp,
      sfxGainDb: sfxGain,
      sfxPeakDb: sfxPeaks,
      events,
      music: music ? musicReport : undefined,
      stems: stemsDir || undefined,
    },
    null,
    1,
  ) + '\n',
);
console.log(
  `sfx-mix: ${events.length} событий${music ? `, музыка ${musicOffset} с` : ''}, мастер ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} дБ → ${out}`,
);
