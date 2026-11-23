#!/usr/bin/env node
// Завершение итогового ролика block-team после полного рендера (заставки частей — наложения на сцены, поэтому фильм рендерится целиком).
//   npx --yes hyperframes@0.8.145 render --output renders/block-team.mp4 --video-frame-format png     # LANE, 1080p, CRF 16
//   node tools/assemble.mjs --plan     # только проверить длительность renders/block-team.mp4 по scenes.json
//   node tools/assemble.mjs            # renders/block-team-720p.mp4 (crf 31, проверенный AAC128 копией) и renders/block-team.sha256
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const out1080 = `${root}/renders/block-team.mp4`, out720 = `${root}/renders/block-team-720p.mp4`;
if (!existsSync(out1080)) throw new Error("Нет renders/block-team.mp4: npx --yes hyperframes@0.8.145 render --output renders/block-team.mp4 --video-frame-format png (под LANE)");

const probe = (f, entry = "format=duration") => execFileSync("ffprobe", ["-v", "error", "-show_entries", entry, "-of", "csv=p=0", f], { encoding: "utf8" }).trim();
const planned = manifest.filter((s) => !s.overlay).reduce((a, s) => a + s.duration, 0);
const actual = Number(probe(out1080));
console.log(`длительность ${actual.toFixed(2)} с, по scenes.json ${planned.toFixed(2)} с`);
if (Math.abs(actual - planned) > 0.2) throw new Error("Длительность рендера не совпадает со scenes.json");
const streams = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_streams", "-of", "json", out1080], { encoding: "utf8" })).streams;
const audio = streams[0];
if (streams.length !== 1 || audio.codec_name !== "aac" || audio.profile !== "LC" || audio.channels !== 1 || Number(audio.sample_rate) !== 48000 || Number(audio.bit_rate) < 110000 || Number(audio.bit_rate) > 145000) throw new Error("Нужен проверенный AAC-LC mono48k примерно128k; legacy/stereo fallback запрещён");
if (process.argv.includes("--plan")) process.exit(0);

execFileSync("ffmpeg", ["-v", "error", "-n", "-i", out1080, "-vf", "scale=1280:720", "-c:v", "libx264", "-crf", "31", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", out720], { stdio: "inherit" });
const sums = [out1080, out720].map((f) => `${createHash("sha256").update(readFileSync(f)).digest("hex")}  ${f.split("/").pop()}`);
writeFileSync(`${root}/renders/block-team.sha256`, `${sums.join("\n")}\n`);
console.log(sums.join("\n"));
