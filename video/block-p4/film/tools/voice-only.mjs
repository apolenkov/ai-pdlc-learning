#!/usr/bin/env node
// Звук «только голос» для block-p4 (TASK-671 D1/D3, TASK-685): без музыки и SFX.
// Метод пилота r2 (audio671-binding/voice-only-pilot-r2/PASS2-EXACT.json), значения — свои для p4:
//   голосовая шина собирается заново из assets/vo/scene-*.mp3 по началам сцен в scenes.json
//   (anullsrc на всю длину фильма, adelay в сэмплах 48 кГц, amix normalize=0); сдвиг голоса в голом рендере
//   HyperFrames относительно плана измерен кросс-корреляцией и равен 0, поэтому задержка = начало сцены × 48000;
//   loudnorm в два прохода I=-16 TP=-2.5 LRA=11 (второй — с измеренными значениями, linear=true);
//   AAC 128k 48 кГц моно, видео копией, +faststart; фейдов нет, кроме FADE_IN.
// FADE_IN (ревью W3b P3-2): блоки 3 и 4 начинаются с речи с первого сэмпла — 10 мс afade в начале только у них.
//
//   node tools/voice-only.mjs renders/block-p4.raw.mp4 renders/block-p4.mp4   # два прохода ffmpeg, запись tools/voice-only.json
//   node tools/voice-only.mjs --selftest                                       # только план: задержки, длина, фейды, без ffmpeg
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SR = 48000;
export const LOUDNORM = { I: -16, TP: -2.5, LRA: 11 };
export const FADE_IN = { 3: 0.01, 4: 0.01 };
const HEAD = JSON.parse(readFileSync(`${root}/tools/vo-tail-plan.json`, "utf8")).headSeconds ?? 0; // авторская голова фильма 0,1 с (TASK-685)

export function plan(scenes) {
  const list = scenes.filter((s) => !s.overlay);
  let start = HEAD;
  const voices = list.map((s) => {
    const v = { scene: String(s.n), file: `assets/vo/scene-${s.n}.mp3`, delaySamples: Math.round(start * SR), fadeIn: FADE_IN[s.n] ?? 0 };
    start += s.duration;
    return v;
  });
  return { totalSamples: Math.round(start * SR), voices };
}

export function filtergraph(p) {
  const branches = p.voices.map((v, i) => `[${i + 1}:a:0]asetpts=PTS-STARTPTS,aresample=${SR},aformat=sample_fmts=fltp:sample_rates=${SR}:channel_layouts=mono${v.fadeIn ? `,afade=t=in:st=0:d=${v.fadeIn}` : ""},adelay=delays=${v.delaySamples}S:all=1[vo${i + 1}]`);
  return `anullsrc=r=${SR}:cl=mono,atrim=end_sample=${p.totalSamples},asetpts=PTS-STARTPTS[base];${branches.join(";")};[base]${p.voices.map((_, i) => `[vo${i + 1}]`).join("")}amix=inputs=${p.voices.length + 1}:duration=first:dropout_transition=0:normalize=0[voicebus]`;
}

const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const p = plan(scenes);
const fail = (m) => { throw new Error(`voice-only: ${m}`); };
// Самопроверка плана: сцены без наложений, задержки растут, голос сцены кончается до начала следующей, фейды только у 3 и 4.
const film = scenes.filter((s) => !s.overlay);
p.voices.forEach((v, i) => {
  if (i && v.delaySamples <= p.voices[i - 1].delaySamples) fail(`задержка сцены ${v.scene} не растёт`);
  const audio = film[i].audioDuration ?? 0;
  const next = i + 1 < p.voices.length ? p.voices[i + 1].delaySamples : p.totalSamples;
  if (v.delaySamples + Math.round(audio * SR) > next) fail(`голос сцены ${v.scene} заходит на следующую`);
});
if (p.voices.filter((v) => v.fadeIn).map((v) => v.scene).join(",") !== "3,4") fail("фейд в начале только у сцен 3 и 4");
if (process.argv.includes("--selftest")) {
  console.log(`voice-only: ok, сцен ${p.voices.length}, ${p.totalSamples} сэмплов (${p.totalSamples / SR} с), фейд: 3, 4`);
  process.exit(0);
}

const [src, out] = process.argv.slice(2).map((x) => resolve(x));
if (!src || !out) fail("usage: voice-only.mjs <raw.mp4> <out.mp4>");
if (existsSync(out)) fail(`${out} уже есть: удалите его сами, скрипт не перезаписывает`);
const inputs = ["-i", src, ...p.voices.flatMap((v) => ["-i", `${root}/${v.file}`])];
const graph = filtergraph(p);
const LN = `loudnorm=I=${LOUDNORM.I}:TP=${LOUDNORM.TP}:LRA=${LOUDNORM.LRA}:dual_mono=false`;
const json = (stderr) => JSON.parse(stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1));

const argv1 = ["-nostdin", "-hide_banner", ...inputs, "-filter_complex", `${graph};[voicebus]${LN}:print_format=json[aout]`, "-map", "[aout]", "-f", "null", "-"];
const p1 = spawnSync("ffmpeg", argv1, { encoding: "utf8", maxBuffer: 1 << 26 });
if (p1.status !== 0) fail(p1.stderr.slice(-2000));
const m = json(p1.stderr);
const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
const argv2 = ["-n", "-nostdin", "-hide_banner", ...inputs, "-filter_complex", `${graph};[voicebus]${LN}:${measured}:linear=true:print_format=json,aresample=${SR}[aout]`,
  "-map", "0:v:0", "-map", "[aout]", "-map_metadata", "0", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar:a", String(SR), "-ac:a", "1", "-movflags", "+faststart", out];
const p2 = spawnSync("ffmpeg", argv2, { encoding: "utf8", maxBuffer: 1 << 26 });
if (p2.status !== 0) fail(p2.stderr.slice(-2000));
const r = json(p2.stderr);
const rel = (x) => x.replace(`${root}/`, "");
writeFileSync(`${root}/tools/voice-only.json`, `${JSON.stringify({ method: "TASK-671 pilot r2: two-pass loudnorm, voice only, no music, no SFX", loudnorm: LOUDNORM, sampleRate: SR, ...p, pass1: m, pass2: r, argv1: argv1.map(rel), argv2: argv2.map(rel) }, null, 1)}\n`);
console.log(`pass1 I ${m.input_i} TP ${m.input_tp} LRA ${m.input_lra}; pass2 I ${r.output_i} TP ${r.output_tp} (${r.normalization_type})`);
console.log(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_name,sample_rate,channels", "-of", "compact", out], { encoding: "utf8" }).trim());
