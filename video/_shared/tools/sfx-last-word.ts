// Проверка последнего слова в исходной озвучке и конечном AAC.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface LastWordResult {
  scene: string;
  word: string;
  t0: number;
  t1: number;
  peakDbfs: number | null;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  reason?: string;
}

type Scene = {
  n?: string | number;
  duration: number;
  overlay?: boolean;
  audio?: string | null;
  audioDuration?: number;
};
type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

const lastWord = (a: Alignment): { word: string; t0: number; t1: number } | undefined => {
  const tokens: { word: string; t0: number; t1: number }[] = [];
  let current: { word: string; t0: number; t1: number } | undefined;
  for (const [i, ch] of a.characters.entries()) {
    const start = a.character_start_times_seconds[i];
    const end = a.character_end_times_seconds[i];
    if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
    if (!ch.trim()) {
      if (current) tokens.push(current);
      current = undefined;
    } else if (current) {
      current.word += ch;
      current.t1 = end!;
    } else {
      current = { word: ch, t0: start!, t1: end! };
    }
  }
  if (current) tokens.push(current);
  return tokens.findLast((token) => /[\p{L}\p{N}]/u.test(token.word));
};

export const checkLastWords = (film: string): LastWordResult[] => {
  const dir = resolve(film);
  const scenes = JSON.parse(readFileSync(join(dir, 'scenes.json'), 'utf8')) as Scene[];
  const results: LastWordResult[] = [];
  for (const scene of scenes) {
    if (!scene.audio) continue;
    const id = String(scene.n);
    const alignment = [`scene-${id}`, `scene-${id.padStart(2, '0')}`]
      .map((name) => join(dir, 'assets/vo', `${name}.alignment.json`))
      .find(existsSync);
    const audio = resolve(dir, scene.audio);
    if (!alignment || !existsSync(audio)) {
      results.push({
        scene: id,
        word: '',
        t0: 0,
        t1: 0,
        peakDbfs: null,
        status: 'UNKNOWN',
        reason: !alignment ? 'alignment missing' : 'audio missing',
      });
      continue;
    }
    try {
      const token = lastWord(JSON.parse(readFileSync(alignment, 'utf8')) as Alignment);
      if (!token || token.t1 <= token.t0) throw new Error('last word alignment invalid');
      const audioDuration = scene.audioDuration;
      if (
        typeof audioDuration !== 'number' ||
        !Number.isFinite(audioDuration) ||
        audioDuration <= 0
      )
        throw new Error('audio duration missing or invalid');
      const pcm = execFileSync(
        'ffmpeg',
        ['-v', 'error', '-i', audio, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'],
        {
          maxBuffer: 128 * 1024 * 1024,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      const from = Math.max(0, Math.floor(token.t0 * 48000));
      const to = Math.min(pcm.length / 4, Math.ceil(token.t1 * 48000));
      if (from >= to) {
        results.push({
          scene: id,
          ...token,
          peakDbfs: -240,
          status: 'FAIL',
          reason: 'last word outside audio',
        });
        continue;
      }
      // Alignment can extend past the MP3; compare its audible part to the centisecond clip length.
      if (Math.min(token.t1, pcm.length / 4 / 48000) > audioDuration + 0.005) {
        results.push({
          scene: id,
          ...token,
          peakDbfs: null,
          status: 'FAIL',
          reason: 'last word exceeds audio duration',
        });
        continue;
      }
      let peak = 0;
      for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(pcm.readFloatLE(i * 4)));
      const peakDbfs = Number((20 * Math.log10(Math.max(peak, 1e-12))).toFixed(2));
      results.push({ scene: id, ...token, peakDbfs, status: peakDbfs > -60 ? 'PASS' : 'FAIL' });
    } catch (error) {
      results.push({
        scene: id,
        word: '',
        t0: 0,
        t1: 0,
        peakDbfs: null,
        status: 'UNKNOWN',
        reason: String(error),
      });
    }
  }
  return results;
};

export const checkLastWordsMp4 = (film: string, mp4: string): LastWordResult[] => {
  const dir = resolve(film);
  const scenes = JSON.parse(readFileSync(join(dir, 'scenes.json'), 'utf8')) as Scene[];
  const pcm = execFileSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      resolve(mp4),
      '-map',
      '0:a:0',
      '-ac',
      '1',
      '-ar',
      '48000',
      '-f',
      'f32le',
      '-',
    ],
    { maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const samples = pcm.length / 4;
  const results: LastWordResult[] = [];
  let start = 0;
  for (const scene of scenes) {
    if (scene.overlay) continue;
    if (!Number.isFinite(scene.duration) || scene.duration <= 0)
      throw new Error('scene duration invalid');
    if (scene.audio) {
      const id = String(scene.n);
      const alignment = [`scene-${id}`, `scene-${id.padStart(2, '0')}`]
        .map((name) => join(dir, 'assets/vo', `${name}.alignment.json`))
        .find(existsSync);
      if (!alignment) {
        results.push({
          scene: id,
          word: '',
          t0: start,
          t1: start,
          peakDbfs: null,
          status: 'UNKNOWN',
          reason: 'alignment missing',
        });
      } else {
        try {
          const token = lastWord(JSON.parse(readFileSync(alignment, 'utf8')) as Alignment);
          if (!token || token.t1 <= token.t0) throw new Error('last word alignment invalid');
          // TTS stretches final punctuation/letters into silence. Anchor the window to the
          // source voice, never to the AAC under test: a cut AAC must still fail.
          const voice = execFileSync(
            'ffmpeg',
            [
              '-v',
              'error',
              '-i',
              resolve(dir, scene.audio),
              '-ss',
              String(token.t0),
              '-t',
              String(token.t1 - token.t0),
              '-ac',
              '1',
              '-ar',
              '48000',
              '-f',
              'f32le',
              '-',
            ],
            { maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
          );
          let last = voice.length / 4 - 1;
          while (last >= 0 && Math.abs(voice.readFloatLE(last * 4)) <= 0.01) last--;
          if (last < 0) {
            results.push({
              scene: id,
              ...token,
              t0: start + token.t0,
              t1: start + token.t1,
              peakDbfs: null,
              status: 'FAIL',
              reason: 'last word silent in source voice',
            });
            start += scene.duration;
            continue;
          }
          const wordEnd = token.t0 + (last + 1) / 48000;
          const windowStart = start + Math.max(token.t0, wordEnd - 0.3);
          const from = Math.max(0, Math.floor(windowStart * 48000));
          const to = Math.min(samples, Math.ceil((start + wordEnd) * 48000));
          let peak = 0;
          for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(pcm.readFloatLE(i * 4)));
          const peakDbfs = Number((20 * Math.log10(Math.max(peak, 1e-12))).toFixed(2));
          results.push({
            scene: id,
            word: token.word,
            t0: windowStart,
            t1: start + wordEnd,
            peakDbfs,
            status: from < to && peakDbfs > -40 ? 'PASS' : 'FAIL',
            ...(from >= to ? { reason: 'last word outside final AAC' } : {}),
          });
        } catch (error) {
          results.push({
            scene: id,
            word: '',
            t0: start,
            t1: start,
            peakDbfs: null,
            status: 'UNKNOWN',
            reason: String(error),
          });
        }
      }
    }
    start += scene.duration;
  }
  return results;
};
