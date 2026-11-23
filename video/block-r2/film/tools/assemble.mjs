#!/usr/bin/env node
// Завершение итогового ролика block-r2 после полного рендера (заставки частей — наложения на сцены, поэтому фильм рендерится целиком).
//   npx --yes hyperframes@0.8.172 check
//   npx --yes hyperframes@0.8.172 render --output renders/block-r2.raw.mp4 --video-frame-format png --fps 30 --resolution landscape --crf 20
//   звук «только голос» (TASK-671): сборка video/_shared/tools/voice-only.ts --from-render … --out-file block-r2.mp4
//   node tools/assemble.mjs --plan     # только проверить длительность renders/block-r2.mp4 по scenes.json
//   node tools/assemble.mjs            # renders/block-r2-720p.mp4 (crf 31; моно-мастер — звук копией) и renders/block-r2.sha256
// Стерео-мастер не принимается: у «только голос» звук — AAC-LC моно 48 кГц 128k, повторный AAC 64k не применяется.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const out1080 = `${root}/renders/block-r2.mp4`, out720 = `${root}/renders/block-r2-720p.mp4`;
if (!existsSync(out1080)) throw new Error("Нет renders/block-r2.mp4: npx --yes hyperframes@0.8.172 render --output renders/block-r2.raw.mp4 --video-frame-format png (под LANE) и сборка voice-only");

const probe = (f, entry = "format=duration", extra = []) => execFileSync("ffprobe", ["-v", "error", ...extra, "-show_entries", entry, "-of", "csv=p=0", f], { encoding: "utf8" }).trim();
const HEAD = existsSync(`${root}/tools/vo-tail-plan.json`) ? JSON.parse(readFileSync(`${root}/tools/vo-tail-plan.json`, "utf8")).headSeconds ?? 0 : 0; // авторская голова фильма (TASK-686)
const planned = HEAD + manifest.filter((s) => !s.overlay).reduce((a, s) => a + s.duration, 0);
const actual = Number(probe(out1080));
console.log(`длительность ${actual.toFixed(2)} с, по scenes.json ${planned.toFixed(2)} с`);
if (Math.abs(actual - planned) > 0.2) throw new Error("Длительность рендера не совпадает со scenes.json");
if (process.argv.includes("--plan")) process.exit(0);

// Моно-мастер «только голос» (TASK-671/685: loudnorm, AAC-LC 128k) копируется без перекодирования:
// pan с c1 на моно-входе приглушил бы голос на 6 дБ, а повторный AAC поднял бы true peak.
const channels = Number(probe(out1080, "stream=channels", ["-select_streams", "a:0"]).split("\n").filter(Boolean).at(-1));
const bitRate = Number(probe(out1080, "stream=bit_rate", ["-select_streams", "a:0"]).split("\n").filter(Boolean).at(-1));
if (channels !== 1) throw new Error(`Ожидался моно-мастер «только голос», получено каналов: ${channels}; стерео-фолбэк AAC 64k не применяется`);
if (!(bitRate >= 110000 && bitRate <= 160000)) throw new Error(`Неожиданный битрейт звука мастера: ${bitRate}; ожидался AAC-LC 128k`);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", out1080, "-vf", "scale=1280:720", "-c:v", "libx264", "-crf", "31", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", out720], { stdio: "inherit" });
const sums = [out1080, out720].map((f) => `${createHash("sha256").update(readFileSync(f)).digest("hex")}  ${f.split("/").pop()}`);
writeFileSync(`${root}/renders/block-r2.sha256`, `${sums.join("\n")}\n`);
console.log(sums.join("\n"));
