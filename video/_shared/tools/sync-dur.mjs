#!/usr/bin/env node
// Длительность сцены из scenes.json → compositions/scene-NN.html (data-duration корня и константа DUR).
// После `node tools/build-vo.mjs`: озвучка новой длины меняет duration, а сцена хранит своё число.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fid = (s) => s.id || (/^\d+$/.test(String(s.n)) ? String(s.n).padStart(2, "0") : String(s.n));
for (const s of JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"))) {
  if (s.kind === "title") continue;
  const file = `${root}/compositions/scene-${fid(s)}.html`;
  if (!existsSync(file)) continue;
  const src = readFileSync(file, "utf8");
  const next = src.replace(/(data-composition-id="scene-[^"]+"[^>]*data-duration=")[\d.]+(")/, `$1${s.duration}$2`).replace(/\bDUR = [\d.]+/, `DUR = ${s.duration}`);
  if (next !== src) { writeFileSync(file, next); console.log(`scene-${fid(s)}: ${s.duration} с`); }
}
