#!/usr/bin/env node
// Завершение итогового ролика block-0a после полного рендера (заставки частей — наложения на сцены, поэтому фильм рендерится целиком).
//   npx --yes hyperframes@0.8.171 render --output renders/block-0a.mp4 --video-frame-format png     # LANE, 1080p, CRF 16
//   node tools/assemble.mjs --plan     # только проверить длительность renders/block-0a.mp4 по scenes.json
//   node tools/assemble.mjs            # renders/block-0a-720p.mp4 (crf 31, AAC 64k моно) и renders/block-0a.sha256
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const out1080 = `${root}/renders/block-0a.mp4`, out720 = `${root}/renders/block-0a-720p.mp4`;
if (!existsSync(out1080)) throw new Error("Нет renders/block-0a.mp4: npx --yes hyperframes@0.8.171 render --output renders/block-0a.mp4 --video-frame-format png (под LANE)");

const probe = (f, entry = "format=duration") => execFileSync("ffprobe", ["-v", "error", "-show_entries", entry, "-of", "csv=p=0", f], { encoding: "utf8" }).trim();
const planned = manifest.filter((s) => !s.overlay).reduce((a, s) => a + s.duration, 0);
const actual = Number(probe(out1080));
console.log(`длительность ${actual.toFixed(2)} с, по scenes.json ${planned.toFixed(2)} с`);
if (Math.abs(actual - planned) > 0.2) throw new Error("Длительность рендера не совпадает со scenes.json");
if (process.argv.includes("--plan")) process.exit(0);

execFileSync("ffmpeg", ["-v", "error", "-y", "-i", out1080, "-vf", "scale=1280:720", "-c:v", "libx264", "-crf", "31", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-ac", "1", "-movflags", "+faststart", out720], { stdio: "inherit" });
const sums = [out1080, out720].map((f) => `${createHash("sha256").update(readFileSync(f)).digest("hex")}  ${f.split("/").pop()}`);
writeFileSync(`${root}/renders/block-0a.sha256`, `${sums.join("\n")}\n`);
console.log(sums.join("\n"));
