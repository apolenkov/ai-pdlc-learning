import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

await test('подложка длиннее исходного короткого цикла остаётся заданной длины и уровня', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bed-loop-'));
  const root = resolve(import.meta.dirname, '..');
  const out = join(dir, 'bed.wav');
  try {
    execFileSync(process.execPath, [
      '--experimental-strip-types',
      join(root, 'video/_shared/tools/bed-loop.ts'),
      '--a',
      join(root, 'video/_shared/sfx/pop.wav'),
      '--b',
      join(root, 'video/_shared/sfx/click.wav'),
      '--duration',
      '0.7',
      '--segment',
      '0.08',
      '--crossfade',
      '0.02',
      '--out',
      out,
    ]);
    const seconds = Number(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out],
        { encoding: 'utf8' },
      ).trim(),
    );
    assert.ok(Math.abs(seconds - 0.7) < 0.002, `duration ${seconds}`);
    const measure = spawnSync(
      'ffmpeg',
      ['-hide_banner', '-nostats', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
      { encoding: 'utf8' },
    );
    assert.equal(measure.status, 0, measure.stderr);
    const integrated = Number(
      /Integrated loudness:[\s\S]*?I:\s+(-?[\d.]+) LUFS/.exec(measure.stderr)?.[1],
    );
    assert.ok(Math.abs(integrated + 35) <= 1, `I ${integrated} LUFS`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
