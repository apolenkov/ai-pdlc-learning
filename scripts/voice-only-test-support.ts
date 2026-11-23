import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseConfig,
  parseMeasured,
  sha256Text,
  type Config,
  type Options,
  type RunResult,
  type Runner,
} from '../video/_shared/tools/voice-only.ts';

export const FF_PROBE = '/x/ffprobe';
export function sandbox() {
  const root = join(import.meta.dirname, '../.cache/voice-only-tests');
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(root, 'run-'));
  const files: Record<string, string> = {
    'in.mp4': 'video',
    'a.mp3': 'aaa',
    'b.mp3': 'bbb',
    ffmpeg: 'bin',
  };
  for (const [n, d] of Object.entries(files)) writeFileSync(join(dir, n), d);
  const h = (n: string) => sha256Text(files[n] ?? '');
  const config = (): Config =>
    parseConfig(
      {
        schema: 'task671-rollout-config/v1',
        id: 'fake',
        pin: { path: 'in.mp4', sha256: h('in.mp4'), size: 5 },
        video: { timeBase: '1/15360', packets: 1, durationS: 100000 / 48000 },
        base: { samples48: 100000 },
        expectedDelta16: 80,
        replicas: [
          { id: 'a', path: 'a.mp3', sha256: h('a.mp3'), dataStart: 0, dataDuration: 1, volume: 1 },
          {
            id: 'b',
            path: 'b.mp3',
            sha256: h('b.mp3'),
            dataStart: 1.5,
            dataDuration: 0.5,
            volume: 1,
          },
        ],
        results: { root: 'results' },
      },
      'pin',
      dir,
    );
  const opts: Options = {
    ffmpeg: { path: join(dir, 'ffmpeg'), sha256: h('ffmpeg') },
    ffprobe: FF_PROBE,
    outDir: join(dir, 'out'),
    outFile: 'fake.mp4',
  };
  return { dir, config, opts };
}

export const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const NO_RUN: Runner = () => {
  throw new Error('runner must not be called');
};
export const loudnorm = (type: string, outI = '-16.31', outTp = '-2.50') =>
  `[Parsed_loudnorm_5 @ 0x600000a4c000] \n{\n\t"input_i" : "-19.09",\n\t"input_tp" : "-1.52",\n\t"input_lra" : "3.30",\n\t"input_thresh" : "-29.23",\n\t"output_i" : "${outI}",\n\t"output_tp" : "${outTp}",\n\t"output_lra" : "3.20",\n\t"output_thresh" : "-26.45",\n\t"normalization_type" : "${type}",\n\t"target_offset" : "0.31"\n}\n`;
export const result = (stderr: string, stdout = ''): RunResult => ({
  status: 0,
  signal: null,
  stdout,
  stderr,
  error: null,
});

/** JSON ffprobe для MP3 44,1 кГц с n44 отсчётами воспроизведения (пакеты по 1152, skip 1105, остаток в padding). */
export function probeJson(n44: number): string {
  const packets = Math.ceil((n44 + 1105) / 1152);
  const pad = packets * 1152 - 1105 - n44;
  return JSON.stringify({
    streams: [{ codec_name: 'mp3', sample_rate: '44100', time_base: '1/14112000' }],
    packets: Array.from({ length: packets }, (_, k) => ({
      duration: 368640,
      side_data_list: [
        {
          side_data_type: 'Skip Samples',
          skip_samples: k === 0 ? 1105 : 0,
          discard_padding: k === packets - 1 ? pad : 0,
        },
      ],
    })),
  });
}

/**
 * stdout замера готового файла (ebur128 + ametadata): последнее значение — итоговое;
 * tpDb — dBTP, из него линейное значение; iLufs — громкость I всего файла (по умолчанию в окне приёмки).
 */
export const truePeakOut = (tpDb: number, iLufs = -16.2): string =>
  `frame:0 pts:0 pts_time:0.1\nlavfi.r128.I=-30.5\nlavfi.r128.true_peak=0.01\nframe:1 pts:1 pts_time:0.2\nlavfi.r128.I=${iLufs.toFixed(3)}\nlavfi.r128.true_peak=${(10 ** (tpDb / 20)).toFixed(6)}\n`;

/** Подмена ffmpeg: первый проход, второй проход и замер именно созданного файла. */
export const fake =
  (
    calls: string[][],
    type = 'dynamic',
    onPass2?: () => void,
    tp: Record<string, number> = { aac: -2.4, aac_at: -2.4 },
    measured: string[] = [],
  ): Runner =>
  (program, argv) => {
    if (program === FF_PROBE) return result('', probeJson(argv.includes('a.mp3') ? 44100 : 22050));
    if (argv.some((t) => t.startsWith('ebur128='))) {
      const enc = measuredEncoder(argv);
      return result('', truePeakOut(tp[enc] ?? -2.4));
    }
    calls.push(argv);
    if (argv.includes('-f')) return result(loudnorm(type));
    onPass2?.();
    measured.push(argv[argv.indexOf('-c:a') + 1] ?? '');
    writeFileSync(argv[argv.length - 1] ?? '', `mp4-bytes-${measured[measured.length - 1] ?? ''}`);
    return result(loudnorm(type));
  };

/** Кодер готового файла — из файла, переданного в argv `-i`: фейковый замер ebur128 меряет именно его. */
export const measuredEncoder = (argv: string[]): string => {
  const file = argv[argv.indexOf('-i') + 1] ?? '';
  return readFileSync(file, 'utf8').replace(/^mp4-bytes-/, '');
};

const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const isNumbers = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'number');

export function loadFixture() {
  const raw: unknown = JSON.parse(
    readFileSync(
      join(import.meta.dirname, '../video/_shared/tools/voice-only.fixtures/r3-reference.json'),
      'utf8',
    ),
  );
  assert.ok(isRec(raw));
  const { config, measured, pass1Argv, pass2Argv, mp3Samples48: samples } = raw;
  assert.ok(isRec(config) && isRec(measured) && isNumbers(samples));
  assert.ok(isStrings(pass1Argv) && isStrings(pass2Argv));
  const strs: Record<string, string> = {};
  for (const [k, v] of Object.entries(measured)) strs[k] = String(v);
  return { config, samples, measured: parseMeasured(strs, 'fixture'), pass1Argv, pass2Argv };
}
