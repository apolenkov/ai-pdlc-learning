#!/usr/bin/env node
// Синтетический alignment до настоящей озвучки: темп 145 слов/мин (60/145 с/слово),
// пауза 0,3 с между предложениями; метка "synthetic": true.
// Читает work/vo-input.md (`**N. Title** text`), пишет assets/vo/scene-NN.alignment.js
// (того ждёт Kit.scene через <script> в index.html) и пересчитывает scenes.json:
// duration = речь + хвост (1,5 с; финал 2,5 с), округление вверх до 0,1.
// Аудиофайлов нет: <audio> в index.html нет, Kit.scene читает только window.ALIGN.
// Реальный голос перезапишет alignment + scenes.json тем же форматом.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORD_DUR = 60 / 145;
const SENT_PAUSE = 0.3;
const TAIL = 1.5, TAIL_LAST = 2.5;
const voInput = readFileSync(`${root}/work/vo-input.md`, "utf8");
const blocks = new Map();
for (const line of voInput.split("\n")) {
  const m = /^\*\*(\d+)\. ([^*]+)\*\* (.*)$/.exec(line.trim());
  if (m) blocks.set(Number(m[1]), { title: m[2], text: m[3] });
}
if (!blocks.size) throw new Error("work/vo-input.md: нет блоков `**N. Title** text`");
const isSentEnd = (w) => /[.?!…][»"'”’)]*$/.test(w);
function align(text) {
  const words = text.trim().split(/\s+/);
  const characters = [], starts = [], ends = [];
  let t = 0;
  const r = (x) => Math.round(x * 10000) / 10000;
  words.forEach((w, i) => {
    const last = i === words.length - 1;
    const slot = last ? WORD_DUR : WORD_DUR - 0.07;
    const per = slot / [...w].length;
    for (const ch of w) { characters.push(ch); starts.push(r(t)); t += per; ends.push(r(t)); }
    if (!last) { characters.push(" "); starts.push(r(t)); t += 0.07; ends.push(r(t)); }
    if (!last && isSentEnd(w)) t += SENT_PAUSE;
  });
  return { synthetic: true, characters, character_start_times_seconds: starts, character_end_times_seconds: ends };
}
mkdirSync(`${root}/assets/vo`, { recursive: true });
const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
manifest.forEach((s, idx) => {
  const b = blocks.get(s.n);
  if (!b) throw new Error(`Нет блока речи ${s.n} в work/vo-input.md`);
  const al = align(b.text);
  const speechEnd = al.character_end_times_seconds.at(-1);
  const nn = String(s.n).padStart(2, "0");
  writeFileSync(`${root}/assets/vo/scene-${nn}.alignment.js`,
    `window.ALIGN = window.ALIGN || {};\nwindow.ALIGN[${JSON.stringify(nn)}] = ${JSON.stringify(al)};\n`);
  const tail = idx === manifest.length - 1 ? TAIL_LAST : TAIL;
  s.duration = Math.ceil((speechEnd + tail) * 10) / 10;
  s.audioDuration = Number(speechEnd.toFixed(2));
  if (b.title) s.title = b.title;
  console.log(`сцена ${s.n}: слов ${b.text.trim().split(/\s+/).length}, речь ${speechEnd.toFixed(2)} с, сцена ${s.duration} с`);
});
writeFileSync(`${root}/scenes.json`, JSON.stringify(manifest, null, 2) + "\n");
const total = manifest.reduce((a, s) => a + s.duration, 0);
console.log(`scenes.json: ${manifest.length} сцен, итого ${total.toFixed(1)} с`);
