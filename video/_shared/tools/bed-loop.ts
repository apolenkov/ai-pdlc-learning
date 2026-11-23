#!/usr/bin/env node
// Mix two existing recordings with A→B and B→A crossfades, then level the bed to −35 LUFS.
// node --experimental-strip-types bed-loop.ts --a track-3.mp3 --b track-4.mp3 --duration 191.1 --out bed.wav
import { execFileSync, spawnSync } from 'node:child_process';
import { renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name: string): string => {
  const at = argv.indexOf(name);
  return at < 0 ? '' : (argv[at + 1] ?? '');
};
const a = resolve(arg('--a'));
const b = resolve(arg('--b'));
const out = resolve(arg('--out'));
const duration = Number(arg('--duration'));
const fade = Number(arg('--crossfade') || Math.min(5, duration / 4));
const segment = Number(arg('--segment') || Math.min(60, (duration + fade) / 2));
if (
  !arg('--a') ||
  !arg('--b') ||
  !arg('--out') ||
  !Number.isFinite(duration) ||
  duration <= 0 ||
  !Number.isFinite(segment) ||
  !Number.isFinite(fade) ||
  fade <= 0 ||
  segment <= fade
)
  throw new Error(
    'usage: bed-loop.ts --a track3 --b track4 --duration seconds --out bed.wav [--segment 60 --crossfade 5]',
  );

const probe = (file: string): number =>
  Number(
    execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
      { encoding: 'utf8' },
    ).trim(),
  );
if (probe(a) < segment || probe(b) < segment)
  throw new Error('both recordings must be at least --segment seconds long');

const cycle = 2 * segment - fade;
const count = Math.max(1, Math.ceil((duration - fade) / (cycle - fade)));
const parts = [
  `[0:a]atrim=0:${segment},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,aresample=48000[a]`,
  `[1:a]atrim=0:${segment},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,aresample=48000[b]`,
  `[a][b]acrossfade=d=${fade}:c1=tri:c2=tri[cycle]`,
];
if (count > 1)
  parts.push(
    `[cycle]asplit=${count}${Array.from({ length: count }, (_, i) => `[c${i}]`).join('')}`,
  );
let last = count > 1 ? 'c0' : 'cycle';
for (let i = 1; i < count; i++) {
  parts.push(`[${last}][c${i}]acrossfade=d=${fade}:c1=tri:c2=tri[j${i}]`);
  last = `j${i}`;
}
parts.push(`[${last}]atrim=0:${duration},asetpts=PTS-STARTPTS,loudnorm=I=-35:TP=-3:LRA=11[bed]`);
const run = spawnSync(
  'ffmpeg',
  [
    '-hide_banner',
    '-v',
    'error',
    '-y',
    '-i',
    a,
    '-i',
    b,
    '-filter_complex',
    parts.join(';'),
    '-map',
    '[bed]',
    '-c:a',
    'pcm_s24le',
    out,
  ],
  { encoding: 'utf8' },
);
if (run.status !== 0) throw new Error(run.stderr || `ffmpeg exited ${run.status}`);
const measure = spawnSync(
  'ffmpeg',
  ['-hide_banner', '-nostats', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
  { encoding: 'utf8' },
);
if (measure.status !== 0) throw new Error(measure.stderr || 'ebur128 failed');
const measured = Number([...measure.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1]);
if (!Number.isFinite(measured)) throw new Error('ebur128 did not report integrated loudness');
if (Math.abs(measured + 35) > 0.1) {
  const levelled = `${out}.level.wav`;
  try {
    const adjust = spawnSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-y',
        '-i',
        out,
        '-af',
        `volume=${(-35 - measured).toFixed(2)}dB`,
        '-c:a',
        'pcm_s24le',
        levelled,
      ],
      { encoding: 'utf8' },
    );
    if (adjust.status !== 0) throw new Error(adjust.stderr || 'bed level adjustment failed');
    renameSync(levelled, out);
  } finally {
    rmSync(levelled, { force: true });
  }
}
console.log(
  `bed-loop: ${duration}s, ${count} cycles, ${segment}s A→B, ${fade}s crossfades → ${out}`,
);
