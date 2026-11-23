#!/usr/bin/env node
// Временная замена голоса до настоящей озвучки (W7c): синтетический alignment
// по work/vo-input.md и scenes.json — тот же формат, что у реальных
// (characters, character_start_times_seconds, character_end_times_seconds),
// темп 1,84 слова/с, пауза 0,3 с между предложениями; в файле метка "synthetic": true.
// Плюс беззвучные заглушки assets/vo/scene-N.mp3 (ffmpeg anullsrc), чтобы
// Kit.scene и <audio> работали. Имена файлов — как у tools/build-vo.mjs:
// json/mp3 — scene-N.*, js — scene-NN.alignment.js (того ждёт build-index).
// scenes.json пересчитывается как в build-vo.mjs (звук + хвост TAIL).
// Всё сгенерированное — в .gitignore, в Git остаётся только этот скрипт.
// Когда придёт реальная озвучка, `node video/voice-intent.mjs` перезапишет эти файлы.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORD_DUR = 1 / 1.84; // темп речи block-0a, с/word
const SPACE_DUR = 0.07; // пробел внутри словесного слота
const SENT_PAUSE = 0.3; // пауза между предложениями
const TAIL = { 0: 1.5, 5: 3 }; // как в build-vo.mjs
const TAIL_PART = 2;

// Блоки речи из work/vo-input.md: `**N. Title** text`.
const voInput = readFileSync(`${root}/work/vo-input.md`, "utf8");
const blocks = new Map();
for (const line of voInput.split("\n")) {
  const m = /^\*\*(\d+)\. ([^*]+)\*\* (.*)$/.exec(line.trim());
  if (m) blocks.set(Number(m[1]), m[3]);
}
if (blocks.size === 0) throw new Error("work/vo-input.md: нет блоков `**N. …** text`");

const isSentEnd = (word) => /[.?!…][»"'”’)]*$/.test(word);

function align(text) {
  const words = text.trim().split(/\s+/);
  const characters = [], starts = [], ends = [];
  let t = 0;
  const r = (x) => Math.round(x * 10000) / 10000;
  words.forEach((w, i) => {
    const last = i === words.length - 1;
    const slot = last ? WORD_DUR : WORD_DUR - SPACE_DUR;
    const per = slot / [...w].length;
    for (const ch of w) {
      characters.push(ch);
      starts.push(r(t));
      t += per;
      ends.push(r(t));
    }
    if (!last) {
      characters.push(" ");
      starts.push(r(t));
      t += SPACE_DUR;
      ends.push(r(t));
    }
    if (!last && isSentEnd(w)) t += SENT_PAUSE; // тишина без символов
  });
  return {
    synthetic: true,
    characters,
    character_start_times_seconds: starts,
    character_end_times_seconds: ends,
  };
}

mkdirSync(`${root}/assets/vo`, { recursive: true });
const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
for (const s of manifest) {
  if (s.kind === "title") continue;
  const text = blocks.get(s.n);
  if (!text) throw new Error(`Нет блока речи ${s.n} в work/vo-input.md`);
  const al = align(text);
  const speechEnd = al.character_end_times_seconds.at(-1);
  const mp3 = `${root}/assets/vo/scene-${s.n}.mp3`;
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", String(speechEnd), "-q:a", "9", "-ac", "1", mp3]);
  writeFileSync(`${root}/assets/vo/scene-${s.n}.alignment.json`, JSON.stringify(al));
  const nn = String(s.n).padStart(2, "0");
  writeFileSync(`${root}/assets/vo/scene-${nn}.alignment.js`, `window.ALIGN = window.ALIGN || {};\nwindow.ALIGN[${JSON.stringify(nn)}] = ${JSON.stringify(al)};\n`);
  const audioDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], { encoding: "utf8" }).trim());
  s.duration = Math.ceil((Math.max(audioDuration, speechEnd) + (TAIL[s.n] ?? TAIL_PART)) * 10) / 10;
  s.audio = `assets/vo/scene-${s.n}.mp3`;
  s.audioDuration = Number(audioDuration.toFixed(2));
  delete s.planned;
  console.log(`сцена ${s.n}: слов ${text.trim().split(/\s+/).length}, речь ${speechEnd.toFixed(2)} с, сцена ${s.duration} с`);
}
writeFileSync(`${root}/scenes.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log(`scenes.json: ${manifest.length} записей, ${manifest.filter((s) => s.kind !== "title").reduce((a, s) => a + s.duration, 0).toFixed(1)} с сцен`);
