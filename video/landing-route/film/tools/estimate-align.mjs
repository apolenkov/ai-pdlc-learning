#!/usr/bin/env node
// ОЦЕНОЧНЫЙ alignment до озвучки: времена символов по темпу прежнего ролика (2,149 слова/с), чтобы собирать и проверять сцены без голоса.
//   node tools/estimate-align.mjs      пишет assets/vo/scene-NN.alignment.json/.js с полем "estimate": true
// Настоящая озвучка (video/voice-landing.mjs) перезаписывает эти файлы; после неё сцены перепроверить по реальным словам.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WPS = 2.149, LEAD = { 1: 2.0 };
const md = readFileSync(`${root}/work/vo-input.md`, "utf8").split("## Текст диктора")[1];
mkdirSync(`${root}/assets/vo`, { recursive: true });
for (const m of md.matchAll(/^\*\*(\d+)\. [^*]+\*\* (.+)$/gm)) {
  const n = Number(m[1]), nn = String(n).padStart(2, "0"), text = m[2].trim();
  const words = text.split(/\s+/).length, total = words / WPS;
  // вес символа: буква 1, пробел 0,5; пауза после запятой 3, после точки/двоеточия/тире 5 (условных единиц)
  const chars = [...text], w = chars.map((c, i) => (c === " " ? (/[.:?!]/.test(chars[i - 1]) ? 5 : /[,—]/.test(chars[i - 1]) || chars[i + 1] === "—" ? 3 : 0.5) : 1));
  const sum = w.reduce((a, b) => a + b, 0), lead = LEAD[n] || 0, st = [], en = [];
  let acc = 0;
  chars.forEach((c, i) => { st.push(+(lead + (acc / sum) * total).toFixed(3)); acc += w[i]; en.push(+(lead + (acc / sum) * total).toFixed(3)); });
  const file = `${root}/assets/vo/scene-${nn}.alignment.json`;
  writeFileSync(file, JSON.stringify({ estimate: true, characters: chars, character_start_times_seconds: st, character_end_times_seconds: en }));
  execFileSync("node", [`${root}/../../_shared/tools/json2js.mjs`, "align", file, nn], { stdio: "ignore" });
  console.log(`scene-${nn}: слов ${words}, речь ${(lead + total).toFixed(2)} с`);
}
