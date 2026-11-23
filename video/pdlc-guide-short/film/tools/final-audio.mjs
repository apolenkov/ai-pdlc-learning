#!/usr/bin/env node
// Итоговый звук ролика: голос + эффекты + подложка под даком (метод v3.5b, mix-v35.ts) → один AAC 48 кГц моно.
//   node tools/final-audio.mjs <raw.mp4 с озвучкой> <bed.wav> <каталог work/audio> <выход.m4a>
// 1) sfx-mix.ts --stems: voice.wav и sfx.wav (план sfx.json); 2) mix-v35.ts --stems: music.wav и music-ducked.wav (дак по голосу);
// 3) моно-сведение: голос + эффекты + подложка после дака −3,5 дБ (как в E1), loudnorm в два прохода I −16, TP −2,1;
// 4) AAC 128k, повтор с меньшим потолком, пока true peak после кодека не ≤ −1,6 dBTP.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)), film = resolve(here, "..");
const tools = resolve(film, "../../_shared/tools");
const [raw, bed, work, out] = process.argv.slice(2).map((p) => resolve(p));
mkdirSync(work, { recursive: true });
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", cwd: film });
const log = (args) => spawnSync("ffmpeg", ["-hide_banner", ...args], { encoding: "utf8" }).stderr;
run("node", ["--experimental-strip-types", `${tools}/sfx-mix.ts`, film, raw, `${work}/sfx-only.mp4`, "--stems", `${work}/stems`]);
run("node", ["--experimental-strip-types", `${tools}/mix-v35.ts`, "--voice", `${work}/stems/voice.wav`, "--sfx", `${work}/stems/sfx.wav`, "--bed", bed, "--video", raw, "--out", `${work}/v35-stereo.mp4`, "--stems", `${work}/stems`]);
const inputs = ["-i", `${work}/stems/voice.wav`, "-i", `${work}/stems/sfx.wav`, "-i", `${work}/stems/music-ducked.wav`];
const mix = "[0:a]aformat=channel_layouts=mono[v];[1:a]aformat=channel_layouts=mono[s];[2:a]aformat=channel_layouts=mono,volume=-3.5dB[m];[v][s][m]amix=inputs=3:normalize=0:duration=first[mx]";
const ln = "loudnorm=I=-16:TP=-2.1:LRA=11";
const l1 = log([...inputs, "-filter_complex", `${mix};[mx]${ln}:print_format=json[x]`, "-map", "[x]", "-f", "null", "-"]);
const m = JSON.parse(l1.slice(l1.indexOf("{"), l1.lastIndexOf("}") + 1));
writeFileSync(`${work}/loudnorm.json`, JSON.stringify(m, null, 1) + "\n");
const pass2 = `${ln}:linear=true:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
const tp = (f) => Number([...log(["-i", f, "-filter_complex", "[0:a]ebur128=peak=true[x]", "-map", "[x]", "-f", "null", "-"]).matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].at(-1)[1]);
let ceil = -2.1;
for (let i = 0; i < 6; i++) {
  const lim = `alimiter=limit=${(10 ** (ceil / 20)).toFixed(6)}:level=disabled`;
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", `${mix};[mx]${pass2},aresample=48000,${lim}[x]`, "-map", "[x]", "-ac", "1", "-ar", "48000", "-c:a", "aac", "-aac_coder", "fast", "-b:a", "128k", out]);
  const p = tp(out);
  console.log(`итерация ${i}: потолок ${ceil.toFixed(2)} дБ, true peak после AAC ${p} dBTP`);
  if (p <= -1.6) break;
  ceil -= p + 1.7;
}
