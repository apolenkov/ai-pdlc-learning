#!/usr/bin/env node
// Раскладывает озвучку блоков (assets/vo-v3/block-N.*) по сценам и пересобирает scenes.json.
//   node tools/build-vo.mjs
// Блоки: 0, 0b (как меняется процесс), 1–10. Блок N → assets/vo/scene-N.mp3, scene-N.alignment.json и scene-NN.alignment.js (id сцены NN).
// Длительность сцены = звук + хвост (TAIL); заставки частей — наложение TITLE секунд на начало сцены (overlay).
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TITLE = 2; // заставка части поверх первой фразы
export const TAIL = { "0m": 1.5, 0: 1.5, "0b": 1.5, 5: 1.7, 8: 3 }; // хвост после речи, с; у частей TAIL_PART
export const TAIL_PART = 2;
const HEADER = { mode: "parts", total: 7 };
const old = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8")).filter((s) => s.kind !== "title");
const meta = Object.fromEntries(old.map((s) => [s.n, s]));
const CH = { 1: "Вход и выход", 2: "Подготовка", 3: "Код пишет модель", 4: "Код проверяет другая модель", 5: "Проверяют люди", 6: "Сохранение и слияние", 7: "Архив", 8: "Что дальше" };
for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) meta[n] ??= { n, chapter: CH[n], step: n <= 7 ? n : null, title: CH[n] };
meta[0] ??= { n: 0, chapter: "Проблема → цель", step: null, title: "Проблема → цель" };
meta["0b"] ??= { n: "0b", chapter: "Как меняется работа", step: null, title: "Как меняется работа" };
meta["0m"] = { ...meta[0], n: "0m", title: "Карта маршрута" }; // карта курса перед вступлением: глава та же, что у вступления

const out = [];
mkdirSync(`${root}/assets/vo`, { recursive: true });
for (const n of ["0m", 0, "0b", ...Array.from({ length: 8 }, (_, i) => i + 1)]) {
  const align = JSON.parse(readFileSync(`${root}/assets/vo-v3/block-${n}.alignment.json`, "utf8"));
  copyFileSync(`${root}/assets/vo-v3/block-${n}.mp3`, `${root}/assets/vo/scene-${n}.mp3`);
  writeFileSync(`${root}/assets/vo/scene-${n}.alignment.json`, JSON.stringify(align));
  execFileSync("node", [`${root}/tools/json2js.mjs`, "align", `${root}/assets/vo/scene-${n}.alignment.json`, String(n).padStart(2, "0")], { stdio: "inherit" });
  const audioDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${root}/assets/vo/scene-${n}.mp3`], { encoding: "utf8" }).trim());
  const m = meta[n];
  const duration = Math.ceil((Math.max(audioDuration, align.character_end_times_seconds.at(-1)) + (TAIL[n] ?? TAIL_PART)) * 10) / 10;
  if (n >= 1 && n <= 7) out.push({ id: `t${n}`, kind: "title", of: n, overlay: true, duration: TITLE, chapter: m.chapter, step: n, title: m.title, audio: null, header: HEADER });
  out.push({ n, duration, chapter: m.chapter, step: m.step, title: m.title, audio: `assets/vo/scene-${n}.mp3`, header: HEADER, audioDuration: Number(audioDuration.toFixed(2)) });
}
writeFileSync(`${root}/scenes.json`, JSON.stringify(out, null, 2) + "\n");
console.log(`scenes.json: ${out.length} записей, ${out.filter((s) => !s.overlay).reduce((a, s) => a + s.duration, 0).toFixed(1)} с`);
