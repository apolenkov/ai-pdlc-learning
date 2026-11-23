// Конфиг, план и argv сборщика «только голос» (см. voice-only.ts): чистые функции без запуска процессов.
import { isAbsolute, resolve } from 'node:path';

export const SR = 48000;
export const CONFIG_SCHEMA = 'task671-rollout-config/v1';
export const DELTA16_TO_48 = 3; // expectedDelta16 (16 кГц) → отсчёты 48 кГц
export const DEFAULT_TRIM_TOLERANCE_S = 0.01; // data-duration округлён до 0,01 с
export const DURATION_TOLERANCE_S = 0.001;
export const FORBIDDEN_TOKENS = [
  '-shortest',
  '-t',
  '-to',
  '-ss',
  '-vf',
  '-af',
  '-filter:a',
  '-filter:v',
  '-y',
  '-fs',
];
const MEASURED_SYNTAX = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const MEASURED_RANGES: Record<string, [number, number]> = {
  input_i: [-99, 0],
  input_tp: [-99, 99],
  input_lra: [0, 99],
  input_thresh: [-99, 0],
  target_offset: [-99, 99],
};
const LOUDNORM_BLOCK = /\[Parsed_loudnorm_\d+ @ 0x[0-9a-f]+\] *\r?\n(\{[^{}]*\})/g;
const HEAD = [
  '-n',
  '-nostdin',
  '-hide_banner',
  '-loglevel',
  'info',
  '-filter_threads',
  '1',
  '-filter_complex_threads',
  '1',
  '-copyts',
];

export type Mode = 'pin' | 'render';
/** Кодер AAC второго прохода: родной ffmpeg `aac` (как r3) или AudioToolbox `aac_at` (запасной при TP > −1,5). */
export type AudioEncoder = 'aac' | 'aac_at';
export const AUDIO_ENCODERS: readonly AudioEncoder[] = ['aac', 'aac_at'];
export const DEFAULT_ENCODER: AudioEncoder = 'aac';
export const FALLBACK_ENCODER: AudioEncoder = 'aac_at';
export type AudioBitrate = '128k' | '192k';
export const AUDIO_BITRATES: readonly AudioBitrate[] = ['128k', '192k'];
export const DEFAULT_AUDIO_BITRATE: AudioBitrate = '128k';
export function parseAudioBitrate(value: unknown = DEFAULT_AUDIO_BITRATE): AudioBitrate {
  const bitrate = AUDIO_BITRATES.find((b) => b === value);
  must(bitrate !== undefined, `--audio-bitrate: 128k или 192k, получено «${String(value)}»`);
  return bitrate ?? DEFAULT_AUDIO_BITRATE;
}
/** Потолок перед кодером (--pre-encoder-ceiling-db): допустимый диапазон значения, dBFS. */
export const CEILING_RANGE_DB = { min: -20, max: -1.5 } as const;
export interface FileRef {
  path: string;
  sha256: string;
  size: number;
}
export interface Reply {
  id: string;
  path: string;
  sha256: string;
  dataStart: number;
  dataDuration: number;
  volume: number;
}
/** Сборщик читает из rollout/config.schema.json только эти поля; остальное — забота независимых проверок. */
export interface Config {
  id: string;
  dir: string; // каталог конфига: от него считаются относительные пути, он же cwd процессов
  input: FileRef; // pin (--from-pin) или голый рендер (--from-render)
  timescale: number; // -video_track_timescale (знаменатель video.timeBase)
  durationS: number;
  baseSamples48: number;
  delta: number; // δ в отсчётах 48 кГц
  trimTolerance: number; // отсчётов 48 кГц
  replies: Reply[];
  resultsRoot: string;
}
export interface Options {
  ffmpeg: { path: string; sha256: string };
  encoder?: AudioEncoder; // по умолчанию aac
  audioBitrate?: AudioBitrate; // только второй проход, по умолчанию 128k
  preEncoderCeilingDb?: number | null; // потолок alimiter после loudnorm, dBFS; по умолчанию выключен
  ffprobe: string;
  outDir: string;
  outFile: string;
}
export interface Row {
  index: number;
  id: string;
  path: string;
  delay: number;
  length: number;
  trimTo: number | null;
  volume: number;
  mp3Samples: number;
  dataStart: number;
  dataDuration: number;
}
export interface Plan {
  id: string;
  mode: Mode;
  delta: number;
  base: number;
  rows: Row[];
  minGap: number | null;
  lastEnd: number;
}
export type Measured = Record<
  'input_i' | 'input_tp' | 'input_lra' | 'input_thresh' | 'target_offset',
  string
>;
export interface RunResult {
  status: number | null;
  signal: string | null;
  stderr: string;
  stdout: string;
  error: string | null;
}
export type Runner = (
  program: string,
  argv: string[],
  opts: { cwd: string; timeoutMs: number },
) => RunResult;

export const must = (ok: unknown, why: string): void => {
  if (!ok) throw new Error(`voice-only: ${why}`);
};
export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// ---------- конфиг (rollout/config.schema.json, task671-rollout-config/v1) ----------
const str = (o: Record<string, unknown>, k: string, what: string): string => {
  const v = o[k];
  must(typeof v === 'string' && v.length > 0, `${what}.${k} должен быть непустой строкой`);
  return String(v);
};
const num = (o: Record<string, unknown>, k: string, what: string): number => {
  const v = o[k];
  must(typeof v === 'number' && Number.isFinite(v), `${what}.${k} должен быть конечным числом`);
  return Number(v);
};
const int = (o: Record<string, unknown>, k: string, what: string, min: number): number => {
  const v = num(o, k, what);
  must(Number.isSafeInteger(v) && v >= min, `${what}.${k} должен быть целым ≥ ${min}`);
  return v;
};
const sha = (o: Record<string, unknown>, k: string, what: string): string => {
  const v = str(o, k, what);
  must(/^[0-9a-f]{64}$/.test(v), `${what}.${k} должен быть SHA-256 (64 hex, нижний регистр)`);
  return v;
};
const rec = (o: Record<string, unknown>, k: string, what: string): Record<string, unknown> => {
  const v = o[k];
  must(isRecord(v), `${what}.${k} должен быть объектом`);
  return isRecord(v) ? v : {};
};
export function assertPath(p: string, what: string): string {
  must(
    !p.split('/').includes('..') && !p.includes('\0'),
    `${what}: «..» и NUL в пути запрещены: ${p}`,
  );
  return p;
}
function parseReply(v: unknown, i: number): Reply {
  const what = `replicas[${i}]`;
  must(isRecord(v), `${what} должен быть объектом`);
  const o = isRecord(v) ? v : {};
  const start = num(o, 'dataStart', what);
  const dur = num(o, 'dataDuration', what);
  const volume = num(o, 'volume', what);
  must(start >= 0 && dur > 0 && volume > 0, `${what}: dataStart ≥ 0, dataDuration > 0, volume > 0`);
  return {
    id: str(o, 'id', what),
    path: assertPath(str(o, 'path', what), what),
    sha256: sha(o, 'sha256', what),
    dataStart: start,
    dataDuration: dur,
    volume,
  };
}
function parseTimescale(video: Record<string, unknown>): number {
  const m = /^1\/([1-9][0-9]*)$/.exec(str(video, 'timeBase', 'video'));
  must(m !== null, 'video.timeBase должен быть вида 1/N (r3: 1/15360)');
  return Number(m?.[1]);
}
function parseDelta(o: Record<string, unknown>, mode: Mode): number {
  const d16 = int(o, 'expectedDelta16', 'config', 0);
  must(
    mode === 'pin' ? d16 <= 1600 : d16 === 0,
    mode === 'pin'
      ? 'expectedDelta16 для --from-pin должен быть в [0, 1600] (≤ 100 мс)'
      : '--from-render: δ = 0, expectedDelta16 должен быть 0',
  );
  return d16 * DELTA16_TO_48;
}
export function parseConfig(raw: unknown, mode: Mode, configDir: string): Config {
  must(isRecord(raw), 'конфиг должен быть объектом JSON');
  const o = isRecord(raw) ? raw : {};
  must(o['schema'] === CONFIG_SCHEMA, `schema должна быть ${CONFIG_SCHEMA}`);
  const id = str(o, 'id', 'config');
  const pin = rec(o, 'pin', 'config');
  const video = rec(o, 'video', 'config');
  const replicas = o['replicas'];
  must(Array.isArray(replicas) && replicas.length > 0, 'replicas должен быть непустым массивом');
  const tol = o['replicaTrimToleranceS'];
  const tolS =
    tol === undefined ? DEFAULT_TRIM_TOLERANCE_S : num(o, 'replicaTrimToleranceS', 'config');
  must(tolS >= 0, 'replicaTrimToleranceS ≥ 0');
  return {
    id,
    dir: resolve(configDir),
    input: {
      path: assertPath(str(pin, 'path', 'pin'), 'pin'),
      sha256: sha(pin, 'sha256', 'pin'),
      size: int(pin, 'size', 'pin', 1),
    },
    timescale: parseTimescale(video),
    durationS: num(video, 'durationS', 'video'),
    baseSamples48: int(rec(o, 'base', 'config'), 'samples48', 'base', 1),
    delta: parseDelta(o, mode),
    trimTolerance: Math.round(tolS * SR),
    replies: (Array.isArray(replicas) ? replicas : []).map((r: unknown, i: number) =>
      parseReply(r, i),
    ),
    resultsRoot: resolve(configDir, str(rec(o, 'results', 'config'), 'root', 'results')),
  };
}
export function resolveFrom(c: Config, p: string): string {
  return isAbsolute(p) ? p : resolve(c.dir, p);
}

// ---------- длина MP3 (метод r3: пакеты минус skip/padding, ffprobe -show_packets) ----------
/** Сумма длительностей пакетов (в тиках time_base) и отсчёты skip/padding из side data. */
function sumPackets(packets: unknown[], what: string): { ts: bigint; cut: bigint } {
  let ts = 0n;
  let cut = 0n;
  for (const pk of packets) {
    must(isRecord(pk) && Number.isSafeInteger(pk['duration']), `${what}: duration пакета`);
    const rec = isRecord(pk) ? pk : {};
    ts += BigInt(Number(rec['duration']));
    const sd: unknown[] = Array.isArray(rec['side_data_list']) ? rec['side_data_list'] : [];
    for (const d of sd)
      if (isRecord(d) && d['side_data_type'] === 'Skip Samples')
        cut += BigInt(Number(d['skip_samples'] ?? 0)) + BigInt(Number(d['discard_padding'] ?? 0));
  }
  return { ts, cut };
}
export function mp3Samples48(probe: unknown, what: string): number {
  must(isRecord(probe), `${what}: ffprobe JSON не объект`);
  const p = isRecord(probe) ? probe : {};
  const streams: unknown[] = Array.isArray(p['streams']) ? p['streams'] : [];
  const packets: unknown[] = Array.isArray(p['packets']) ? p['packets'] : [];
  const s0 = streams[0];
  must(
    streams.length === 1 && isRecord(s0) && s0['codec_name'] === 'mp3',
    `${what}: нужен один поток mp3`,
  );
  const s = isRecord(s0) ? s0 : {};
  const rate = Number(s['sample_rate']);
  const tb = /^1\/([1-9][0-9]*)$/.exec(String(s['time_base']));
  must(Number.isSafeInteger(rate) && rate > 0 && tb !== null, `${what}: sample_rate/time_base`);
  must(packets.length > 0, `${what}: нет пакетов`);
  const { ts, cut } = sumPackets(packets, what);
  const den = BigInt(tb?.[1] ?? 1);
  must((ts * BigInt(rate)) % den === 0n, `${what}: пакеты не дают целого числа отсчётов`);
  const native = (ts * BigInt(rate)) / den - cut;
  must(native > 0n, `${what}: длина MP3 ≤ 0`);
  return Number((native * 48000n) / BigInt(rate)) + 1; // floor + 1: верхняя оценка, как n48Max у r3
}

// ---------- план ----------
export function buildPlan(c: Config, mode: Mode, mp3: number[]): Plan {
  must(mp3.length === c.replies.length, 'число длин MP3 не равно числу реплик');
  must(
    Math.abs(c.durationS - c.baseSamples48 / SR) <= DURATION_TOLERANCE_S,
    `video.durationS ${c.durationS} не сходится с base.samples48/48000 ${c.baseSamples48 / SR}`,
  );
  const rows: Row[] = c.replies.map((r, i) => {
    const samples = mp3[i] ?? 0;
    const durSamples = Math.round(r.dataDuration * SR);
    const trim = samples > durSamples + c.trimTolerance;
    return {
      index: i + 1,
      id: r.id,
      path: r.path,
      delay: Math.round(r.dataStart * SR) + c.delta,
      length: trim ? durSamples : samples,
      trimTo: trim ? durSamples : null,
      volume: r.volume,
      mp3Samples: samples,
      dataStart: r.dataStart,
      dataDuration: r.dataDuration,
    };
  });
  let minGap: number | null = null;
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    if (!prev) return;
    must(r.delay > prev.delay, `задержка реплики ${r.index} не растёт`);
    const gap = r.delay - (prev.delay + prev.length);
    must(gap >= 0, `реплика ${prev.index} заходит на реплику ${r.index} на ${-gap} отсчётов`);
    minGap = minGap === null ? gap : Math.min(minGap, gap);
  });
  const last = rows[rows.length - 1];
  const lastEnd = last ? last.delay + last.length : 0;
  must(
    lastEnd <= c.baseSamples48,
    `конец последней реплики ${lastEnd} за пределами основы ${c.baseSamples48}`,
  );
  return { id: c.id, mode, delta: c.delta, base: c.baseSamples48, rows, minGap, lastEnd };
}

const branch = (r: Row): string => {
  const nn = String(r.index).padStart(2, '0');
  const trim = r.trimTo === null ? '' : `,atrim=end_sample=${r.trimTo}`;
  const vol = r.volume === 1 ? '' : `,volume=${r.volume}`;
  return `[${r.index}:a:0]asetpts=PTS-STARTPTS,aresample=${SR},aformat=sample_fmts=fltp:sample_rates=${SR}:channel_layouts=mono${trim}${vol},ashowinfo@vo${nn},adelay=delays=${r.delay}S:all=1[vo${r.index}]`;
};
/** Потолок в dBFS → линейный предел alimiter (10^(X/20), 10 знаков). */
export function ceilingLimit(db: number): number {
  const { min, max } = CEILING_RANGE_DB;
  must(
    Number.isFinite(db) && db >= min && db <= max,
    `потолок ${String(db)} dBFS вне [${min}, ${max}]`,
  );
  return Number((10 ** (db / 20)).toFixed(10));
}
/** Звено потолка после loudnorm, перед кодером; latency=1 — иначе alimiter сдвинет звук на окно упреждения (240 отсчётов). */
export const ceilingFilter = (db: number): string =>
  `alimiter=limit=${ceilingLimit(db)}:level=disabled:latency=1`;
export function buildGraph(
  p: Plan,
  measured: Measured | null,
  ceilingDb: number | null = null,
): string {
  const parts = [`anullsrc=r=${SR}:cl=mono,atrim=end_sample=${p.base},asetpts=PTS-STARTPTS[base]`];
  parts.push(...p.rows.map(branch));
  parts.push(
    `[base]${p.rows.map((r) => `[vo${r.index}]`).join('')}amix=inputs=${p.rows.length + 1}:duration=first:dropout_transition=0:normalize=0,ashowinfo@bus[voicebus]`,
  );
  const m =
    measured === null
      ? ''
      : `:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`;
  parts.push(
    `[voicebus]loudnorm=I=-16:TP=-2.5:LRA=11:dual_mono=false${m}:print_format=json,aresample=${SR}${ceilingDb === null ? '' : `,${ceilingFilter(ceilingDb)}`}[aout]`,
  );
  const graph = parts.join(';');
  must(!graph.includes('afade'), 'afade запрещён');
  return graph;
}
const inputs = (c: Config): string[] =>
  [c.input.path, ...c.replies.map((r) => r.path)].flatMap((p) => [
    '-threads',
    '1',
    '-protocol_whitelist',
    'file',
    '-i',
    p,
  ]);
export function buildPass1Argv(c: Config, p: Plan): string[] {
  return [
    ...HEAD,
    ...inputs(c),
    '-filter_complex',
    buildGraph(p, null),
    '-map',
    '[aout]',
    '-c:a',
    'pcm_s16le',
    '-ar',
    String(SR),
    '-ac',
    '1',
    '-threads',
    '1',
    '-f',
    'null',
    '-',
  ];
}
export function buildPass2Argv(
  c: Config,
  p: Plan,
  measured: Measured,
  out: string,
  encoder: AudioEncoder = DEFAULT_ENCODER,
  ceilingDb: number | null = null,
  audioBitrate: AudioBitrate = DEFAULT_AUDIO_BITRATE,
): string[] {
  const bitrate = parseAudioBitrate(audioBitrate);
  const argv = [
    ...HEAD,
    ...inputs(c),
    '-filter_complex',
    buildGraph(p, measured, ceilingDb),
    '-map',
    '0',
    '-map',
    '-0:a',
    '-map',
    '[aout]',
    '-map_metadata',
    '0',
    '-map_metadata:s:v:0',
    '0:s:0',
    '-map_chapters',
    '0',
    '-c',
    'copy',
    '-c:a',
    encoder,
    '-b:a',
    bitrate,
    '-ar:a',
    String(SR),
    '-ac:a',
    '1',
    '-threads:a',
    '1',
    '-disposition:v:0',
    'default',
    '-disposition:a:0',
    'default',
    '-metadata:s:a:0',
    'language=und',
    '-metadata:s:a:0',
    'handler_name=SoundHandler',
    '-fflags',
    '+bitexact',
    '-metadata',
    'encoding_tool=Lavf63.1.102',
    '-metadata',
    'major_brand=isom',
    '-metadata',
    'minor_version=512',
    '-metadata',
    'compatible_brands=isomiso2avc1mp41',
    '-copytb',
    '1',
    '-avoid_negative_ts',
    'disabled',
    '-video_track_timescale',
    String(c.timescale),
    '-movflags',
    '+faststart',
    out,
  ];
  return argv;
}
export function assertArgv(argv: string[], what: string): void {
  const bad = argv.filter((t) => FORBIDDEN_TOKENS.includes(t));
  must(bad.length === 0, `${what}: запрещённые токены argv: ${bad.join(' ')}`);
}

// ---------- loudnorm ----------
export function extractLoudnorm(stderr: string, what: string): Record<string, string> {
  const blocks = [...stderr.matchAll(LOUDNORM_BLOCK)];
  must(
    blocks.length === 1,
    `${what}: нужен ровно один полный JSON loudnorm, найдено ${blocks.length}`,
  );
  must(stderr.split('"input_i"').length === 2, `${what}: input_i встречается не один раз`);
  const parsed: unknown = JSON.parse(blocks[0]?.[1] ?? 'null');
  must(isRecord(parsed), `${what}: JSON loudnorm не объект`);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(isRecord(parsed) ? parsed : {})) {
    must(typeof v === 'string', `${what}: поле loudnorm ${k} не строка`);
    out[k] = String(v);
  }
  return out;
}
export function parseMeasured(o: Record<string, string>, what: string): Measured {
  const out: Record<string, string> = {};
  for (const [k, [lo, hi]] of Object.entries(MEASURED_RANGES)) {
    const v = o[k] ?? '';
    must(MEASURED_SYNTAX.test(v), `${what}: ${k} не конечное десятичное число: "${v}"`);
    must(Number(v) >= lo && Number(v) <= hi, `${what}: ${k}=${v} вне [${lo}, ${hi}]`);
    out[k] = v;
  }
  return {
    input_i: out['input_i'] ?? '',
    input_tp: out['input_tp'] ?? '',
    input_lra: out['input_lra'] ?? '',
    input_thresh: out['input_thresh'] ?? '',
    target_offset: out['target_offset'] ?? '',
  };
}
