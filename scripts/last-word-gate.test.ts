import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const gate = resolve(import.meta.dirname, '../video/_shared/tools/sfx-gate.ts');

const encodeFinal = (wav: string, mp4: string, cutFinal: boolean) => {
  const encode = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=s=16x16:r=1:d=1',
      '-i',
      wav,
      '-c:v',
      'mpeg4',
      '-c:a',
      'aac',
      ...(cutFinal ? ['-af', 'atrim=end=0.2,apad'] : []),
      '-shortest',
      mp4,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(encode.status, 0, encode.stderr);
};

const check = (
  lastWordAudible: boolean,
  audioDuration = 1,
  sampleDuration = 1,
  encoded = false,
  paddedTail = false,
  cutFinal = false,
) => {
  const film = mkdtempSync(join(tmpdir(), 'last-word-'));
  try {
    const vo = join(film, 'assets/vo');
    mkdirSync(vo, { recursive: true });
    writeFileSync(
      join(film, 'scenes.json'),
      JSON.stringify([{ n: 1, duration: 1, audio: 'assets/vo/scene-1.wav', audioDuration }]),
    );
    writeFileSync(
      join(vo, 'scene-1.alignment.json'),
      JSON.stringify({
        characters: [...'да нет.'],
        character_start_times_seconds: [
          0.1,
          0.125,
          0.15,
          0.3,
          0.325,
          0.35,
          paddedTail ? 0.8 : 0.375,
        ],
        character_end_times_seconds: [
          0.125,
          0.15,
          0.175,
          0.325,
          0.35,
          paddedTail ? 0.8 : 0.375,
          paddedTail ? 0.95 : 0.375,
        ],
      }),
    );
    const sampleRate = 48000;
    const samples = Math.round(sampleRate * sampleDuration);
    const pcm = Buffer.alloc(samples * 2);
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const on = (t >= 0.1 && t < 0.18) || (lastWordAudible && t >= 0.3 && t < 0.4);
      pcm.writeInt16LE(on ? Math.round(6000 * Math.sin(i / 7)) : 0, i * 2);
    }
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    const wav = join(vo, 'scene-1.wav');
    writeFileSync(wav, Buffer.concat([header, pcm]));
    const mp4 = join(film, 'final.mp4');
    if (encoded) encodeFinal(wav, mp4, cutFinal);
    const r = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        gate,
        encoded ? '--last-word-mp4' : '--last-word-only',
        film,
        ...(encoded ? [mp4] : []),
      ],
      { encoding: 'utf8' },
    );
    return { code: r.status, output: r.stdout + r.stderr };
  } finally {
    rmSync(film, { recursive: true, force: true });
  }
};

await test('гейт последнего слова принимает звучащий хвост и отвергает обрезанный', () => {
  const voiced = check(true);
  assert.equal(voiced.code, 0, voiced.output);
  assert.match(voiced.output, /PASS.*нет/);
  const cut = check(false);
  assert.equal(cut.code, 1, cut.output);
  assert.match(cut.output, /FAIL.*нет/);
});

await test('гейт отвергает слово, которое выходит за объявленную длину аудиоклипа', () => {
  const cut = check(true, 0.35);
  assert.equal(cut.code, 1, cut.output);
  assert.match(cut.output, /FAIL.*нет.*last word exceeds audio duration/u);
  const paddedAlignment = check(true, 0.35, 0.35);
  assert.equal(paddedAlignment.code, 0, paddedAlignment.output);
});

await test('гейт проверяет последнее слово в декодированном AAC конечного MP4', () => {
  const voiced = check(true, 1, 1, true);
  assert.equal(voiced.code, 0, voiced.output);
  assert.match(voiced.output, /PASS.*нет/);
  const cut = check(false, 1, 1, true);
  assert.equal(cut.code, 1, cut.output);
  assert.match(cut.output, /FAIL.*нет/);
});

await test('AAC-окно следует хвосту исходного слова, а не паузе alignment; обрезка AAC остаётся FAIL', () => {
  const padded = check(true, 1, 1, true, true);
  assert.equal(padded.code, 0, padded.output);
  assert.match(padded.output, /PASS.*нет/);
  const cut = check(true, 1, 1, true, true, true);
  assert.equal(cut.code, 1, cut.output);
  assert.match(cut.output, /FAIL.*нет/);
});
