#!/usr/bin/env node
// Один AAC для обоих MP4: стерео-микс → моно (среднее каналов, без +3 дБ штатного downmix), loudnorm −16 LUFS, лимитер, AAC 48 кГц 128 кбит/с.
//   node tools/mono.mjs <mix-stereo.mp4> <выход.m4a>
// Моно с тем же I на 3 дБ громче стерео с одинаковыми каналами: пики срезает алимитер; потолок снижается, пока true peak после AAC выше −1,8 дБ.
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
const [src, out] = process.argv.slice(2).map((p) => resolve(p));
const MONO = "pan=mono|c0=0.5*c0+0.5*c1";
const log = (args) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8" }).stderr;
const l1 = log(["-i", src, "-vn", "-af", `${MONO},loudnorm=I=-16:TP=-2:LRA=11:print_format=json`, "-f", "null", "-"]);
const m = JSON.parse(l1.slice(l1.indexOf("{"), l1.lastIndexOf("}") + 1));
const ln = `loudnorm=I=-16:TP=-2:LRA=11:linear=true:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
const tp = (f) => Number([...log(["-i", f, "-filter_complex", "[0:a]ebur128=peak=true[x]", "-map", "[x]", "-f", "null", "-"]).matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].at(-1)[1]);
let ceil = -2.4;
for (let i = 0; i < 6; i++) {
  const lim = `alimiter=limit=${(10 ** (ceil / 20)).toFixed(6)}:level=disabled`;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vn", "-af", `${MONO},${ln},aresample=48000,${lim}`, "-ar", "48000", "-ac", "1", "-c:a", "aac", "-aac_coder", "fast", "-b:a", "128k", out]);
  const p = tp(out);
  console.log(`mono: потолок ${ceil.toFixed(2)} дБ → true peak ${p} dBTP; замер до: I ${m.input_i}, TP ${m.input_tp}`);
  if (p <= -1.8) break;
  ceil -= p + 1.9;
}
