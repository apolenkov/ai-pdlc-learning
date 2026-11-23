#!/usr/bin/env node
// Вступительная пауза первой главы: speech в озвучке стартует с 0 с, поэтому к scene-01 добавляется тишина LEAD с (звук и alignment).
//   node tools/lead.mjs   (после vo-normalize: scene-01.mp3/.alignment.json берутся заново из vo-v3, повторный запуск безопасен)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LEAD = 0.4, A = `${root}/assets/vo`, shared = `${root}/../../_shared/tools`;
execFileSync("node", [`${shared}/vo-normalize.mjs`, `${root}/assets/vo-v3/block-1.mp3`, `${root}/assets/vo-v3/block-1.alignment.json`, `${A}/scene-01.tmp.mp3`, `${A}/scene-01.alignment.json`], { stdio: "inherit" });
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${A}/scene-01.tmp.mp3`, "-af", `adelay=${Math.round(LEAD * 1000)}`, "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "192k", `${A}/scene-01.mp3`]);
const a = JSON.parse(readFileSync(`${A}/scene-01.alignment.json`, "utf8"));
const sh = (xs) => xs.map((x) => Math.round((x + LEAD) * 1e4) / 1e4);
a.character_start_times_seconds = sh(a.character_start_times_seconds);
a.character_end_times_seconds = sh(a.character_end_times_seconds);
writeFileSync(`${A}/scene-01.alignment.json`, JSON.stringify(a));
execFileSync("node", [`${shared}/json2js.mjs`, "align", `${A}/scene-01.alignment.json`, "01"], { stdio: "inherit" });
execFileSync("rm", ["-f", `${A}/scene-01.tmp.mp3`]);
