#!/usr/bin/env node
// Раскладывает озвучку блоков (assets/vo-v3/block-N.*) по сценам и пересобирает scenes.json.
//   node tools/build-vo.mjs
// Блоки: 0м (карта), 0 (крючок), 1–7 (части; 7 — финал). Блок N → assets/vo/scene-N.mp3, scene-N.alignment.json и scene-NN.alignment.js (id сцены NN).
// Длительность сцены = звук + хвост (TAIL); заставки частей — наложение TITLE секунд на начало сцены (overlay).
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TAIL = { "0m": 1.5, 0: 1.5, 7: 4.8 }; // хвост после речи, с; у остальных TAIL_PART
export const TAIL_PART = 1.5;
const HEADER = { mode: "parts", total: 7 };
const meta = {};
const CH = { 1: "Что такое фабрика", 2: "Откуда берётся работа", 3: "Ночь: работают агенты", 4: "Утро: решают люди", 5: "Петля самоулучшения", 6: "Честно о нагрузке", 7: "Люди остаются" };
for (const n of [1, 2, 3, 4, 5, 6, 7]) meta[n] = { n, chapter: CH[n], step: n, title: CH[n] };
meta[0] = { n: 0, chapter: "Зачем это нужно", step: null, title: "Крючок" };
meta["0m"] = { ...meta[0], n: "0m", title: "Карта маршрута" }; // карта курса перед вступлением: глава та же, что у вступления

const out = [];
mkdirSync(`${root}/assets/vo`, { recursive: true });
for (const n of ["0m", 0, ...Array.from({ length: 7 }, (_, i) => i + 1)]) {
  const align = JSON.parse(readFileSync(`${root}/assets/vo-v3/block-${n}.alignment.json`, "utf8"));
  copyFileSync(`${root}/assets/vo-v3/block-${n}.mp3`, `${root}/assets/vo/scene-${n}.mp3`);
  writeFileSync(`${root}/assets/vo/scene-${n}.alignment.json`, JSON.stringify(align));
  execFileSync("node", [`${root}/tools/json2js.mjs`, "align", `${root}/assets/vo/scene-${n}.alignment.json`, String(n).padStart(2, "0")], { stdio: "inherit" });
  const audioDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${root}/assets/vo/scene-${n}.mp3`], { encoding: "utf8" }).trim());
  const m = meta[n];
  const duration = Math.ceil((Math.max(audioDuration, align.character_end_times_seconds.at(-1)) + (TAIL[n] ?? TAIL_PART)) * 10) / 10;
  out.push({ n, duration, chapter: m.chapter, step: m.step, title: m.title, audio: `assets/vo/scene-${n}.mp3`, header: HEADER, audioDuration: Number(audioDuration.toFixed(2)) });
}
writeFileSync(`${root}/scenes.json`, JSON.stringify(out, null, 2) + "\n");
console.log(`scenes.json: ${out.length} записей, ${out.filter((s) => !s.overlay).reduce((a, s) => a + s.duration, 0).toFixed(1)} с`);
