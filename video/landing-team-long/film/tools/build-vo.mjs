#!/usr/bin/env node
// scenes.json по озвучке: длительность сцены = звук + хвост TAIL (пауза между главами по сценарию ≈ 1,2 с).
//   node tools/build-vo.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TAIL = 1.2;
const TITLES = ["Зачем нужна команда", "Семь этапов: кто решает", "Где лежит метод", "Три яруса и наставник", "Шесть задач по кругу", "План изменений", "Аудит этапов", "Обучение по ролям", "Метрики до и после", "Путь к самостоятельности", "Один путь и правило решений", "До старта договориться", "С чего начать"];
const out = TITLES.map((title, i) => {
  const nn = String(i + 1).padStart(2, "0");
  const align = JSON.parse(readFileSync(`${root}/assets/vo/scene-${nn}.alignment.json`, "utf8"));
  const audioDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${root}/assets/vo/scene-${nn}.mp3`], { encoding: "utf8" }).trim());
  const duration = Math.ceil((Math.max(audioDuration, align.character_end_times_seconds.at(-1)) + TAIL) * 10) / 10;
  return { n: i + 1, duration, chapter: title, title, audio: `assets/vo/scene-${nn}.mp3`, audioDuration: Number(audioDuration.toFixed(2)) };
});
writeFileSync(`${root}/scenes.json`, JSON.stringify(out, null, 2) + "\n");
console.log(`scenes.json: ${out.length} сцен, ${out.reduce((a, s) => a + s.duration, 0).toFixed(1)} с`);
