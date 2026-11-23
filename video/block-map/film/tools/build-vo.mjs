#!/usr/bin/env node
// Нормализует производную озвучку блоков (assets/vo-v4/block-N.*) и пересобирает scenes.json.
//   node tools/build-vo.mjs
// Блоки: 0m (приветствие), 0 (крючок), 1–5 (части), 6 (финал). Исходники v4 не меняются.
// Длительность сцены = нормализованный звук + хвост (TAIL); заставки частей — TITLE секунд на тихом хвосте предыдущей сцены.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalize } from "./vo-normalize.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TITLE = 2; // заставка части на тихом хвосте предыдущей сцены
// У сцены 2 карточка шага 1 остаётся читаемой перед двухсекундной заставкой следующей части.
export const TAIL = { "0m": 1.5, 0: TITLE, 2: 3.5, 5: 1.5, 6: 5 }; // хвост после речи, с; у частей TAIL_PART
export const TAIL_PART = 2;
const HEADER = { mode: "parts", total: 5 };
const meta = {};
const CH = { 1: "Что на карте", 2: "С чего начать", 3: "Как выбрать маршрут", 4: "Как вернуться", 5: "Свой темп", 6: "Что дальше" };
for (const n of [1, 2, 3, 4, 5, 6]) meta[n] = { n, chapter: CH[n], step: n <= 5 ? n : null, title: CH[n] };
meta[0] = { n: 0, chapter: "Вступление", step: null, title: "Карта курса" };
meta["0m"] = { n: "0m", chapter: "Вступление", step: null, title: "Приветствие" };

const out = [];
mkdirSync(`${root}/assets/vo`, { recursive: true });
for (const n of ["0m", 0, 1, 2, 3, 4, 5, 6]) {
  const source = JSON.parse(readFileSync(`${root}/assets/vo-v4/block-${n}.alignment.json`, "utf8"));
  const { align } = normalize(`${root}/assets/vo-v4/block-${n}.mp3`, source, `${root}/assets/vo/scene-${n}.mp3`);
  writeFileSync(`${root}/assets/vo/scene-${n}.alignment.json`, JSON.stringify(align));
  execFileSync("node", [`${root}/tools/json2js.mjs`, "align", `${root}/assets/vo/scene-${n}.alignment.json`, String(n).padStart(2, "0")], { stdio: "inherit" });
  const audioDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${root}/assets/vo/scene-${n}.mp3`], { encoding: "utf8" }).trim());
  const m = meta[n];
  const duration = Math.ceil((Math.max(audioDuration, align.character_end_times_seconds.at(-1)) + (TAIL[n] ?? TAIL_PART)) * 10) / 10;
  if (n >= 1 && n <= 5) out.push({ id: `t${n}`, kind: "title", of: n, overlay: true, tail: true, duration: TITLE, chapter: m.chapter, step: n, title: m.title, audio: null, header: HEADER });
  out.push({ n, duration, chapter: m.chapter, step: m.step, title: m.title, audio: `assets/vo/scene-${n}.mp3`, header: HEADER, audioDuration: Number(audioDuration.toFixed(2)) });
}
writeFileSync(`${root}/scenes.json`, JSON.stringify(out, null, 2) + "\n");
console.log(`scenes.json: ${out.length} записей, ${out.filter((s) => !s.overlay).reduce((a, s) => a + s.duration, 0).toFixed(1)} с`);
