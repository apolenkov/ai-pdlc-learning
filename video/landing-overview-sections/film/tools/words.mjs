#!/usr/bin/env node
// Тайминги слов сцены для привязки анимации: node tools/words.mjs <N…>
import { readFileSync } from "node:fs";
for (const n of process.argv.slice(2)) {
  const a = JSON.parse(readFileSync(new URL(`../assets/vo/scene-${String(n).padStart(2, "0")}.alignment.json`, import.meta.url), "utf8"));
  const out = []; let w = "", s = 0;
  a.characters.forEach((c, i) => { if (c === " ") { if (w) out.push(`${s.toFixed(1)} ${w}`); w = ""; } else { if (!w) s = a.character_start_times_seconds[i]; w += c; } });
  if (w) out.push(`${s.toFixed(1)} ${w}`);
  console.log(`# ${n}: ${out.join(" | ")}\n`);
}
