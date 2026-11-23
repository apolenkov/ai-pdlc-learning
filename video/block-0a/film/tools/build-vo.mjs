#!/usr/bin/env node
// Раскладывает озвучку блоков (assets/vo-v3/block-N.*) по сценам и пересобирает scenes.json.
//   node tools/build-vo.mjs
// Блоки: 0 (проблема), 0b (как меняется работа), 1–10 (шаги), 11 (финал). Блок N → assets/vo/scene-N.mp3, scene-N.alignment.json и scene-NN.alignment.js (id сцены NN).
// Длительность сцены = звук + хвост (TAIL); заставки шагов — наложение TITLE секунд на начало сцены (overlay).
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TITLE = 2; // заставка шага поверх первой фразы
export const TAIL = { "0m": 1.5, 0: 1.5, "0b": 1.5, 2: 1.95, 4: 1.6, 9: 1.5, 11: 2.95 }; // хвост после речи, с; у шагов TAIL_STEP; у 4 и 9 короче: переозвученная реплика длиннее; у 2 и 11 — прежняя длительность сцены (B1-V7)
export const TAIL_STEP = 2;
export const HEADER = { total: 10, split: 7 }; // «Шаг N из 10»; шаги 1–7 «На компьютере», 8–10 «В GitLab»
const STEPS = {
  1: ["На компьютере", "Пишем замысел в Markdown"],
  2: ["На компьютере", "Копии против истории"],
  3: ["На компьютере", "Включаем Git и сохраняем первую версию"],
  4: ["На компьютере", "Меняем документ и сравниваем"],
  5: ["На компьютере", "Черновик не в историю"],
  6: ["На компьютере", "Ветка для другого варианта"],
  7: ["На компьютере", "Принимаем вариант"],
  8: ["В GitLab", "Отправляем в GitLab"],
  9: ["В GitLab", "Просим проверить: запрос на слияние (MR)"],
  10: ["В GitLab", "Получаем принятую версию"],
};
const META = {
  0: { chapter: "Что мы сделаем", step: null, title: "Проблема" },
  "0b": { chapter: "Что мы сделаем", step: null, title: "Как меняется работа" },
  "0m": { chapter: "Что мы сделаем", step: null, title: "Карта маршрута" },
  11: { chapter: "Итог", step: null, title: "Что вы умеете и что дальше" },
  ...Object.fromEntries(Object.entries(STEPS).map(([n, [chapter, title]]) => [n, { chapter, step: Number(n), title }])),
};

const out = [];
mkdirSync(`${root}/assets/vo`, { recursive: true });
for (const n of ["0m", 0, "0b", ...Array.from({ length: 11 }, (_, i) => i + 1)]) {
  const align = JSON.parse(readFileSync(`${root}/assets/vo-v3/block-${n}.alignment.json`, "utf8"));
  copyFileSync(`${root}/assets/vo-v3/block-${n}.mp3`, `${root}/assets/vo/scene-${n}.mp3`);
  writeFileSync(`${root}/assets/vo/scene-${n}.alignment.json`, JSON.stringify(align));
  execFileSync("node", [`${root}/tools/json2js.mjs`, "align", `${root}/assets/vo/scene-${n}.alignment.json`, String(n).padStart(2, "0")], { stdio: "inherit" });
  const audioDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${root}/assets/vo/scene-${n}.mp3`], { encoding: "utf8" }).trim());
  const m = META[n];
  const duration = Math.ceil((Math.max(audioDuration, align.character_end_times_seconds.at(-1)) + (TAIL[n] ?? TAIL_STEP)) * 10) / 10;
  if (n >= 1 && n <= 10) out.push({ id: `t${n}`, kind: "title", of: n, overlay: true, duration: TITLE, chapter: m.chapter, step: n, title: m.title, audio: null, header: HEADER });
  out.push({ n, duration, chapter: m.chapter, step: m.step, title: m.title, audio: `assets/vo/scene-${n}.mp3`, header: HEADER, audioDuration: Number(audioDuration.toFixed(2)) });
}
writeFileSync(`${root}/scenes.json`, JSON.stringify(out, null, 2) + "\n");
console.log(`scenes.json: ${out.length} записей, ${out.filter((s) => !s.overlay).reduce((a, s) => a + s.duration, 0).toFixed(1)} с`);
