#!/usr/bin/env node
// Раскладывает озвучку блоков (assets/vo-v3/block-N.*) по сценам и пересобирает scenes.json.
//   node tools/build-vo.mjs
// Блоки: 0–4 (шаг 4 «Проверка и одобрение»). Блок N → assets/vo/scene-N.mp3, scene-N.alignment.json и scene-0N.alignment.js.
// Длительность сцены = звук + хвост (TAIL); у сцен 1–4 TAIL_PART.
// TODO после регистрации курса: брать названия из course-names.json (сейчас курс не зарегистрирован,
// файл принадлежит W4 — названия лежат в scenes.json/meta.json этого фильма).
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TITLE = 2; // заставка части поверх первой фразы сцены (overlay)
export const TAIL = { 0: 1.5, 3: 1.5, 4: 1.5 }; // хвост после речи, с (у новых реплик сцен 3–4 — минимум 1,5 с); у сцен 1–2 TAIL_PART
export const TAIL_PART = 2;
const HEADER = { mode: "parts", total: 3 };
const old = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8")).filter((s) => s.kind !== "title");
const meta = Object.fromEntries(old.map((s) => [s.n, s]));
const CH = { 0: "Полный — ещё не принятый", 1: "Две проверки: структура и смысл", 2: "Полный, но слабый", 3: "Комментарии, одобрение и передача", 4: "Что вы умеете и что дальше" };
for (const n of [0, 1, 2, 3, 4]) meta[n] ??= { n, chapter: CH[n], step: n >= 1 && n <= 4 ? n : null, title: CH[n] };

const out = [];
mkdirSync(`${root}/assets/vo`, { recursive: true });
for (const n of [0, 1, 2, 3, 4]) {
  const align = JSON.parse(readFileSync(`${root}/assets/vo-v3/block-${n}.alignment.json`, "utf8"));
  copyFileSync(`${root}/assets/vo-v3/block-${n}.mp3`, `${root}/assets/vo/scene-${n}.mp3`);
  writeFileSync(`${root}/assets/vo/scene-${n}.alignment.json`, JSON.stringify(align));
  execFileSync("node", [`${root}/tools/json2js.mjs`, "align", `${root}/assets/vo/scene-${n}.alignment.json`, String(n).padStart(2, "0")], { stdio: "inherit" });
  const audioDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${root}/assets/vo/scene-${n}.mp3`], { encoding: "utf8" }).trim());
  const m = meta[n];
  const duration = Math.ceil((Math.max(audioDuration, align.character_end_times_seconds.at(-1)) + (TAIL[n] ?? TAIL_PART)) * 10) / 10;
  if (n >= 1 && n <= 4) out.push({ id: `t${n}`, kind: "title", of: n, overlay: true, duration: TITLE, chapter: m.chapter, step: n, title: m.title, audio: null, header: HEADER });
  out.push({ n, duration, chapter: m.chapter, step: m.step, title: m.title, audio: `assets/vo/scene-${n}.mp3`, header: HEADER, audioDuration: Number(audioDuration.toFixed(2)) });
}
writeFileSync(`${root}/scenes.json`, JSON.stringify(out, null, 2) + "\n");
console.log(`scenes.json: ${out.length} записей, ${out.reduce((a, s) => a + s.duration, 0).toFixed(1)} с`);
