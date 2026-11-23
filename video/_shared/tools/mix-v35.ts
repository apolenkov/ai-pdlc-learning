#!/usr/bin/env node
// Сведение стемов ролика (TASK-588): тихая подложка под голосом с даком, мастер −16 LUFS / ≤ −1,5 dBTP.
//   node --experimental-strip-types video/_shared/tools/mix-v35.ts \
//     --voice <voice.wav> --sfx <sfx.wav> --bed <bed.wav> --video <ролик с картинкой.mp4> --out <выход.mp4> [--stems <каталог>] [--tp -4.5] [--duck-attack 100]
// voice.wav и sfx.wav — стемы sfx-mix.ts --stems, bed.wav — подложка (−35 LUFS, источники вне Git,
// см. video/_shared/music/credits.txt). Картинка копируется (`-c:v copy`), звук — AAC 192k.
// Дак — цепь v3.3 (video/_shared/tools/sfx-mix.ts): сайдчейн-голос сперва выравнивается acompressor, поэтому глубина
// дака не плавает вместе с громкостью слова; глубина не зависит от уровня музыки, только от голоса.
// Замер дака по словам и квитанция: duck.py → video/_shared/tools/sfx-gate.ts --music --duck. С --stems скрипт кладёт
// четыре стема (voice, sfx, music, music-ducked) для замера.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TARGET_LUFS = -16;
const FLAT = 'acompressor=threshold=0.003:ratio=20:attack=5:release=60:makeup=1:knee=1';

const argv = process.argv.slice(2);
const attackAt = argv.indexOf('--duck-attack');
const attackMs = attackAt < 0 ? 150 : Number(argv[attackAt + 1]);
if (!Number.isFinite(attackMs) || attackMs < 1 || attackMs > 1000)
  throw new Error('--duck-attack must be between 1 and 1000 ms');
const DUCK =
  `sidechaincompress=threshold=0.000976563:ratio=1.5:attack=${attackMs}:release=300:makeup=1:level_sc=2.18`;
const tpAt = argv.indexOf('--tp');
const TARGET_TP = tpAt < 0 ? -1.5 : Number(argv[tpAt + 1]);
if (!Number.isFinite(TARGET_TP) || TARGET_TP >= 0)
  throw new Error('--tp must be a negative dBTP value');
const arg = (name: string): string => {
  const i = argv.indexOf(name);
  return i < 0 || !argv[i + 1] ? '' : resolve(argv[i + 1]!);
};
const [voice, sfx, bed, video, out] = ['--voice', '--sfx', '--bed', '--video', '--out'].map(arg);
const stems = arg('--stems');
if (!voice || !sfx || !bed || !video || !out)
  throw new Error(
    'usage: mix-v35.ts --voice w --sfx w --bed w --video mp4 --out mp4 [--stems dir]',
  );

const ffmpeg = (args: string[]) =>
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const ffLog = (args: string[]): string =>
  spawnSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8' }).stderr;
const dur = Number(
  execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video],
    { encoding: 'utf8' },
  ),
);

const inputs = ['-i', voice, '-i', sfx, '-i', bed, '-i', video];
const bedLeg = `[2:a]aformat=channel_layouts=stereo,aresample=48000,atrim=0:${dur},asetpts=PTS-STARTPTS[mpre]`;
const duck = (v: string, m: string, o: string) =>
  `[${v}]aformat=channel_layouts=stereo,${FLAT}[flat];[${m}][flat]${DUCK}[${o}]`;
const mix =
  `[0:a]aformat=channel_layouts=stereo,asplit=2[v][vsc];[1:a]aformat=channel_layouts=stereo[s];${bedLeg};` +
  `${duck('vsc', 'mpre', 'md')};[v][md][s]amix=inputs=3:normalize=0:duration=first[m]`;

if (stems) {
  mkdirSync(stems, { recursive: true });
  const pcm = ['-c:a', 'pcm_s24le'];
  copyFileSync(voice, join(stems, 'voice.wav'));
  copyFileSync(sfx, join(stems, 'sfx.wav'));
  ffmpeg([
    ...inputs,
    '-filter_complex',
    bedLeg,
    '-map',
    '[mpre]',
    ...pcm,
    join(stems, 'music.wav'),
  ]);
  ffmpeg([
    '-i',
    voice,
    '-i',
    sfx,
    '-i',
    bed,
    '-filter_complex',
    `${bedLeg};[0:a]aformat=channel_layouts=stereo[vv];${duck('vv', 'mpre', 'md')}`,
    '-map',
    '[md]',
    ...pcm,
    join(stems, 'music-ducked.wav'),
  ]);
}

// проход 1: замер; проход 2: линейный loudnorm, остаток true peak после AAC срезает алимитер
const ln = `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=11`;
const l1 = ffLog([
  ...inputs,
  '-filter_complex',
  `${mix};[m]${ln}:print_format=json[x]`,
  '-map',
  '[x]',
  '-f',
  'null',
  '-',
]);
if (!l1.includes('{')) throw new Error(`loudnorm проход 1 без замера:\n${l1.slice(-1500)}`);
const m = JSON.parse(l1.slice(l1.indexOf('{'), l1.lastIndexOf('}') + 1)) as Record<string, string>;
const pass2 =
  `${ln}:linear=true:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:` +
  `measured_thresh=${m.input_thresh}:offset=${m.target_offset}:print_format=summary`;
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
  return Number([...r.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].at(-1)![1]);
};
let ceilDb = TARGET_TP;
let finalTp = Infinity;
for (let tries = 0; ; tries++) {
  const lim = `alimiter=limit=${(10 ** (ceilDb / 20)).toFixed(6)}:level=disabled`;
  ffmpeg([
    ...inputs,
    '-filter_complex',
    `${mix};[m]${pass2},aresample=48000,${lim}[x]`,
    '-map',
    '3:v',
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
  finalTp = truePeak(out);
  if (finalTp <= TARGET_TP - 0.05 || tries >= 4) {
    console.log(`mix-v35: ${out}, true peak ${finalTp} dBTP, лимитер ${ceilDb.toFixed(2)} дБ`);
    break;
  }
  ceilDb -= finalTp - TARGET_TP + 0.1;
}
if (finalTp > TARGET_TP)
  throw new Error(`mix-v35: encoded true peak ${finalTp} exceeds ${TARGET_TP}`);
writeFileSync(`${out}.loudnorm.json`, JSON.stringify(m, null, 1) + '\n');
