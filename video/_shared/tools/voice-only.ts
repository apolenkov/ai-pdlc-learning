#!/usr/bin/env node
// Общий сборщик звука «только голос» (TASK-671, раскатка на ролики курса и лендинга).
// Обобщение принятого метода r3 (audio671-binding/block-r3-one/stage3-remux, 24.10.2026) и P4 (film/tools/voice-only.mjs):
//   голосовая шина собирается заново из озвучки реплик (anullsrc на всю основу, adelay в отсчётах 48 кГц, amix normalize=0),
//   loudnorm в два прохода (I −16, TP −2,5, LRA 11; второй проход — с измеренными значениями первого, linear=true),
//   AAC-LC 128k (по умолчанию) или 192k, 48 кГц моно, картинка копией, +faststart. Без опций argv совпадает с r3 (stage3-remux/COMMANDS.json);
//   от него отличаются только входы, задержки, длина основы, обрезка реплик, timebase и путь результата.
//
//   node --experimental-strip-types video/_shared/tools/voice-only.ts --from-pin <config.json> [--plan-only]
//   node --experimental-strip-types video/_shared/tools/voice-only.ts --from-render <config.json> [--plan-only]
//
//   --from-pin     вход — 720p-пин ролика с готовым звуком; задержка реплики = data-start × 48000 + δ,
//                  δ (deltaSamples48) = expectedDelta16 × 3 из конфига (значения по умолчанию нет; у r3 80 → 240 отсчётов, 5 мс).
//   --from-render  вход — голый рендер без сдвига (как у P4): δ = 0, другое значение отклоняется.
//   --plan-only    только проверка конфига и SHA входов, печать плана и argv; ffmpeg не запускается, ничего не пишется.
//   --pre-encoder-ceiling-db <X>   (по умолчанию выключено) звено alimiter=limit=10^(X/20):level=disabled:latency=1 строго после
//                  loudnorm и перед кодером, только во втором проходе; всё остальное в argv токен в токен. Опция заменяет запасной
//                  путь: при заданном потолке кодер не меняется, TP выше порога даёт BUILT_P6_FAIL без пересборки.
//   --audio-encoder aac|aac_at   кодер AAC второго прохода (по умолчанию aac, как у r3; argv токен в токен, меняется только он).
//                  aac_at — AudioToolbox. Кодер aac может дать выброс true peak в одном кадре (≈21 мс); поэтому после
//                  второго прохода меряется true peak готового файла: при aac и TP > −1,5 пересборка второго прохода с aac_at
//                  (отклонённый результат остаётся рядом как *.aac-rejected.mp4), причина — в квитанции (encoder, fallbackReason).
//                  Тем же замером снимаются громкость I готового файла (lavfi.r128.I) и true peak: приёмка P6 идёт по
//                  готовому файлу (I и true peak из ebur128 после кодера) и дополнительно по output_i/output_tp loudnorm
//                  (те сняты до ограничителя и кодера); значения — в квитанции (encodedIntegratedLufs, encodedTruePeakDb).
//   --audio-bitrate 128k|192k   bitrate AAC только второго прохода (по умолчанию 128k); граф и первый проход не меняются.
//                  Запасной aac_at получает тот же bitrate; явное значение — в квитанции (audioBitrate).
//
// Конфиг — rollout/config.schema.json (task671-rollout-config/v1), один на ролик; сборщик читает из него:
//   id, pin {path, sha256, size} (для --from-render pin — голый рендер), video {timeBase 1/N → -video_track_timescale, durationS},
//   base.samples48 (отсчёты звука оригинала при 48 кГц), expectedDelta16 (δ в отсчётах 16 кГц; ×3 → 48 кГц; для r3 80 = 240),
//   replicaTrimToleranceS, replicas [{id, path, sha256, dataStart, dataDuration, volume}], results.root.
//   Относительные пути — от каталога конфига. Остальное в конфиге (prediction, pauses, asr, recipe) — для независимых проверок.
// Длина каждого MP3 берётся из ffprobe -show_packets (пакеты минус skip/padding, как в r3); обрезка по data-duration —
// только если MP3 длиннее data-duration + replicaTrimToleranceS.
// Опции: --out-dir (по умолчанию <results.root>/build), --out-file (по умолчанию <id>-720p.voice-only.candidate.mp4),
//   --ffmpeg/--ffmpeg-sha256 (по умолчанию принятая сборка 9.0.2_1, SHA 768609fb…), --ffprobe (рядом с ffmpeg).
// Гарантии: запись только в outDir (результат, два журнала, квитанция — всё с флагом wx, без перезаписи),
// SHA входов и ffmpeg до и после, остановка на первой ошибке без повтора, квитанция JSON (argv, SHA, тип нормализации).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import {
  assertArgv,
  buildPass1Argv,
  buildPass2Argv,
  buildPlan,
  extractLoudnorm,
  must,
  parseConfig,
  parseAudioBitrate,
  parseMeasured,
  mp3Samples48,
  resolveFrom,
  AUDIO_ENCODERS,
  ceilingFilter,
  DEFAULT_ENCODER,
  FALLBACK_ENCODER,
  type AudioEncoder,
  type Config,
  type Measured,
  type Mode,
  type Plan,
  type Options,
  type RunResult,
  type Runner,
} from './voice-only-plan.ts';
import {
  P6_WINDOW,
  buildTruePeakArgv,
  p6,
  parseIntegratedLufs,
  parseTruePeakDb,
} from './voice-only-p6.ts';

export * from './voice-only-plan.ts';
export * from './voice-only-p6.ts';

export const COMMAND_TIMEOUT_MS = 1_200_000;
export const MAX_BUFFER = 64 * 1024 * 1024;
export const sha256Text = (s: string): string =>
  createHash('sha256').update(s, 'utf8').digest('hex');

export function sha256File(path: string): string {
  const hash = createHash('sha256');
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(1 << 20);
    for (
      let n = readSync(fd, buf, 0, buf.length, null);
      n > 0;
      n = readSync(fd, buf, 0, buf.length, null)
    )
      hash.update(buf.subarray(0, n));
  } finally {
    closeSync(fd);
  }
  return hash.digest('hex');
}

// ---------- запуск ----------
export const realRunner: Runner = (program, argv, opts) => {
  const r = spawnSync(program, argv, {
    cwd: opts.cwd,
    env: { LANG: 'C', LC_ALL: 'C' },
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    timeout: opts.timeoutMs,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: r.status,
    signal: r.signal,
    stderr: r.stderr,
    stdout: r.stdout,
    error: r.error ? String(r.error) : null,
  };
};
const ok = (r: RunResult, what: string): void =>
  must(
    r.status === 0 && r.signal === null && r.error === null,
    `${what} завершился с ошибкой (status ${String(r.status)}, signal ${String(r.signal)}, ${String(r.error)}): ${r.stderr.slice(-1500)}`,
  );

export const DEFAULT_FFMPEG = {
  path: '/opt/homebrew/Cellar/ffmpeg/9.0.2_1/bin/ffmpeg',
  sha256: '768609fb3f463ff9272bebac61478515f19e43c5343b0c60dde2e6230c40013e',
};

interface Pins {
  file: string;
  sha256: string;
}
export function pinList(c: Config, o: Options): Pins[] {
  return [
    { file: resolveFrom(c, c.input.path), sha256: c.input.sha256 },
    ...c.replies.map((x) => ({ file: resolveFrom(c, x.path), sha256: x.sha256 })),
    { file: o.ffmpeg.path, sha256: o.ffmpeg.sha256 },
  ];
}
export function verifyPins(c: Config, o: Options, when: 'до' | 'после'): Record<string, string> {
  const seen: Record<string, string> = {};
  for (const p of pinList(c, o)) {
    must(existsSync(p.file) && statSync(p.file).isFile(), `${when}: нет файла ${p.file}`);
    const got = sha256File(p.file);
    must(got === p.sha256, `SHA ${when} не сходится: ${p.file} — ${got}, ждали ${p.sha256}`);
    seen[p.file] = got;
  }
  must(
    statSync(resolveFrom(c, c.input.path)).size === c.input.size,
    `${when}: размер входа ≠ ${c.input.size}`,
  );
  return seen;
}
export function probeMp3Samples(c: Config, o: Options, run: Runner): number[] {
  return c.replies.map((r) => {
    const argv = [
      '-v',
      'error',
      '-protocol_whitelist',
      'file',
      '-show_streams',
      '-show_packets',
      '-of',
      'json',
      r.path,
    ];
    const res = run(o.ffprobe, argv, { cwd: c.dir, timeoutMs: 60_000 });
    ok(res, `ffprobe ${r.path}`);
    const parsed: unknown = JSON.parse(res.stdout);
    return mp3Samples48(parsed, r.path);
  });
}
const outPaths = (o: Options) => {
  const out = join(o.outDir, o.outFile);
  return {
    out,
    log1: `${out}.pass1.stderr.log`,
    log2: `${out}.pass2.stderr.log`,
    receipt: `${out}.receipt.json`,
    rejected: `${out.replace(/\.mp4$/, '')}.aac-rejected.mp4`,
    rejectedLog: `${out}.aac-rejected.pass2.stderr.log`,
  };
};
const writeNew = (path: string, data: string): void => writeFileSync(path, data, { flag: 'wx' });
const fileRef = (path: string) => ({ path, sha256: sha256File(path), size: statSync(path).size });

interface Pass2 {
  argv2: string[];
  pass2: Record<string, string>;
  type: string;
  tpDb: number;
  iLufs: number;
}
type OutPaths = ReturnType<typeof outPaths>;
/** Второй проход с кодером из опций; кодер aac при TP готового файла > −1,5 уступает место aac_at (одна пересборка). */
function encodePass2(
  c: Config,
  o: Options,
  plan: Plan,
  measured: Measured,
  paths: OutPaths,
  run: Runner,
) {
  const requested = o.encoder ?? DEFAULT_ENCODER;
  const ceilingDb = o.preEncoderCeilingDb ?? null;
  must(
    AUDIO_ENCODERS.includes(requested),
    `кодер ${String(requested)} не из ${AUDIO_ENCODERS.join('|')}`,
  );
  const encode = (enc: AudioEncoder, logPath: string): Pass2 => {
    const argv2 = buildPass2Argv(c, plan, measured, paths.out, enc, ceilingDb, o.audioBitrate);
    assertArgv(argv2, 'pass2');
    const r2 = run(o.ffmpeg.path, argv2, { cwd: c.dir, timeoutMs: COMMAND_TIMEOUT_MS });
    writeNew(logPath, r2.stderr);
    ok(r2, `pass2 (${enc})`);
    const pass2 = extractLoudnorm(r2.stderr, 'pass2');
    const type = pass2['normalization_type'];
    must(type === 'linear' || type === 'dynamic', `pass2: normalization_type «${String(type)}»`);
    must(existsSync(paths.out), `pass2 не создал ${paths.out}`);
    const tp = run(o.ffmpeg.path, buildTruePeakArgv(paths.out), {
      cwd: c.dir,
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    ok(tp, 'замер true peak и громкости готового файла');
    return {
      argv2,
      pass2,
      type: String(type),
      tpDb: parseTruePeakDb(tp.stdout, 'true peak'),
      iLufs: parseIntegratedLufs(tp.stdout, 'громкость I'),
    };
  };
  const first = encode(requested, paths.log2);
  if (ceilingDb !== null || requested !== DEFAULT_ENCODER || first.tpDb <= P6_WINDOW.truePeakMax)
    return { requested, encoder: requested, fallbackReason: null, fallback: null, last: first };
  // aac дал true peak выше порога: результат остаётся рядом как отклонённый, второй проход — с aac_at
  const fallback = {
    fromEncoder: DEFAULT_ENCODER,
    argv2: first.argv2,
    argv2Sha256: sha256Text(JSON.stringify(first.argv2)),
    encodedTruePeakDb: first.tpDb,
    output: { ...fileRef(paths.out), path: paths.rejected },
    log: { path: paths.rejectedLog, sha256: sha256File(paths.log2) },
  };
  renameSync(paths.out, paths.rejected);
  renameSync(paths.log2, paths.rejectedLog);
  return {
    requested,
    encoder: FALLBACK_ENCODER,
    fallbackReason: `true peak готового файла ${first.tpDb} dBTP > ${P6_WINDOW.truePeakMax} при кодере ${DEFAULT_ENCODER}`,
    fallback,
    last: encode(FALLBACK_ENCODER, paths.log2),
  };
}
export interface Receipt {
  [k: string]: unknown;
}
export function runVoiceOnly(
  c: Config,
  o: Options,
  mode: Mode,
  run: Runner,
  now: () => string = () => new Date().toISOString(),
): Receipt {
  const audioBitrate = parseAudioBitrate(o.audioBitrate);
  const startedAt = now();
  const before = verifyPins(c, o, 'до');
  const plan = buildPlan(c, mode, probeMp3Samples(c, o, run));
  const paths = outPaths(o);
  for (const f of Object.values(paths))
    must(!existsSync(f), `${f} уже есть: скрипт ничего не перезаписывает`);
  const argv1 = buildPass1Argv(c, plan);
  assertArgv(argv1, 'pass1');
  mkdirSync(o.outDir, { recursive: true });
  const r1 = run(o.ffmpeg.path, argv1, { cwd: c.dir, timeoutMs: COMMAND_TIMEOUT_MS });
  writeNew(paths.log1, r1.stderr);
  ok(r1, 'pass1');
  const pass1 = extractLoudnorm(r1.stderr, 'pass1');
  const measured = parseMeasured(pass1, 'pass1');
  const pass2Out = encodePass2(c, o, plan, measured, paths, run);
  const { requested, encoder, fallbackReason, fallback, last } = pass2Out;
  const { argv2, pass2, type } = last;
  const after = verifyPins(c, o, 'после');
  const verdict = p6(pass2, last.tpDb, last.iLufs);
  const receipt: Receipt = {
    schema: 'voice-only-receipt/v2',
    id: c.id,
    mode,
    status: verdict.pass ? 'BUILT' : 'BUILT_P6_FAIL',
    startedAt,
    endedAt: now(),
    deltaSamples48: plan.delta,
    baseSamples48: plan.base,
    minGap48: plan.minGap,
    lastEnd48: plan.lastEnd,
    rows: plan.rows,
    inputsBefore: before,
    inputsAfter: after,
    inputsUnchanged: JSON.stringify(before) === JSON.stringify(after),
    ffmpeg: o.ffmpeg,
    argv1,
    argv1Sha256: sha256Text(JSON.stringify(argv1)),
    argv2,
    argv2Sha256: sha256Text(JSON.stringify(argv2)),
    encoder,
    audioBitrate,
    requestedEncoder: requested,
    fallbackReason,
    fallback,
    encodedTruePeakDb: last.tpDb,
    encodedIntegratedLufs: last.iLufs,
    preEncoderCeilingDb: o.preEncoderCeilingDb ?? null,
    preEncoderCeilingFilter:
      o.preEncoderCeilingDb == null ? null : ceilingFilter(o.preEncoderCeilingDb),
    measured,
    pass1,
    pass2,
    normalizationType: type,
    p6: verdict,
    output: { path: paths.out, sha256: sha256File(paths.out), size: statSync(paths.out).size },
    logs: {
      pass1: { path: paths.log1, sha256: sha256File(paths.log1) },
      pass2: { path: paths.log2, sha256: sha256File(paths.log2) },
    },
  };
  writeNew(paths.receipt, `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

// ---------- CLI ----------
export interface Cli {
  mode: Mode;
  config: string;
  planOnly: boolean;
  flags: Record<string, string>;
}
const VALUE_FLAGS = [
  '--out-dir',
  '--out-file',
  '--ffmpeg',
  '--ffmpeg-sha256',
  '--ffprobe',
  '--audio-encoder',
  '--audio-bitrate',
  '--pre-encoder-ceiling-db',
];
export function parseArgs(args: string[]): Cli {
  const usage =
    'usage: voice-only.ts (--from-pin | --from-render) <config.json> [--plan-only] [--out-dir d] [--out-file f.mp4] [--ffmpeg p --ffmpeg-sha256 h] [--ffprobe p] [--audio-encoder aac|aac_at] [--audio-bitrate 128k|192k] [--pre-encoder-ceiling-db X]';
  const flags: Record<string, string> = {};
  const rest: string[] = [];
  let planOnly = false;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i] ?? '';
    if (a === '--plan-only') planOnly = true;
    else if (VALUE_FLAGS.includes(a)) {
      const v = args[(i += 1)];
      must(v !== undefined && !v.startsWith('--'), usage);
      flags[a] = v ?? '';
    } else rest.push(a);
  }
  const flag = rest[0];
  must((flag === '--from-pin' || flag === '--from-render') && rest.length === 2, usage);
  return {
    mode: flag === '--from-pin' ? 'pin' : 'render',
    config: resolve(rest[1] ?? ''),
    planOnly,
    flags,
  };
}
export function buildOptions(c: Config, mode: Mode, flags: Record<string, string>): Options {
  const ffmpeg = {
    path: flags['--ffmpeg'] ?? DEFAULT_FFMPEG.path,
    sha256: flags['--ffmpeg-sha256'] ?? DEFAULT_FFMPEG.sha256,
  };
  must(
    flags['--ffmpeg'] === undefined || flags['--ffmpeg-sha256'] !== undefined,
    '--ffmpeg требует --ffmpeg-sha256',
  );
  const outFile =
    flags['--out-file'] ??
    `${c.id}${mode === 'pin' ? '-720p.voice-only.candidate' : '.voice-only'}.mp4`;
  must(
    basename(outFile) === outFile && !outFile.startsWith('.') && outFile.endsWith('.mp4'),
    '--out-file — имя .mp4 без каталога',
  );
  const encoder = flags['--audio-encoder'] ?? DEFAULT_ENCODER;
  must(
    AUDIO_ENCODERS.some((e) => e === encoder),
    `--audio-encoder: aac или aac_at, получено «${encoder}»`,
  );
  const rawCeiling = flags['--pre-encoder-ceiling-db'];
  must(
    rawCeiling === undefined || /^-(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(rawCeiling),
    `--pre-encoder-ceiling-db: отрицательное десятичное число dBFS, получено «${String(rawCeiling)}»`,
  );
  const ceilingDb = rawCeiling === undefined ? null : Number(rawCeiling);
  if (ceilingDb !== null) ceilingFilter(ceilingDb); // проверка диапазона
  return {
    ffmpeg,
    audioBitrate: parseAudioBitrate(flags['--audio-bitrate']),
    preEncoderCeilingDb: ceilingDb,
    encoder: AUDIO_ENCODERS.find((e) => e === encoder) ?? DEFAULT_ENCODER,
    ffprobe: flags['--ffprobe'] ?? join(dirname(ffmpeg.path), 'ffprobe'),
    outDir: resolve(flags['--out-dir'] ?? join(c.resultsRoot, 'build')),
    outFile,
  };
}
export function main(args: string[], run: Runner = realRunner): number {
  const { mode, config, planOnly, flags } = parseArgs(args);
  const raw: unknown = JSON.parse(readFileSync(config, 'utf8'));
  const c = parseConfig(raw, mode, dirname(config));
  const o = buildOptions(c, mode, flags);
  if (planOnly) {
    verifyPins(c, o, 'до');
    const plan = buildPlan(c, mode, probeMp3Samples(c, o, run));
    console.log(JSON.stringify({ plan, argv1: buildPass1Argv(c, plan) }, null, 2));
    return 0;
  }
  const receipt = runVoiceOnly(c, o, mode, run);
  console.log(
    `voice-only: ${String(receipt['status'])} ${JSON.stringify(receipt['output'])} (${String(receipt['normalizationType'])})`,
  );
  return receipt['status'] === 'BUILT' ? 0 : 1;
}
if (import.meta.main) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}
