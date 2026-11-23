#!/usr/bin/env node
// Сохраняет курсовой темп речи: нормализует паузы и строит девять сцен без добавленных хвостов.
//   node tools/build-vo.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseBlocks } from "./voice.mjs";
import { normalize } from "./vo-normalize.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const storyboard = readFileSync(`${root}/../storyboard.md`, "utf8");
const rows = storyboard.slice(0, storyboard.indexOf("## Правила записи")).split("\n").filter((line) => /^\| \d+ \|/.test(line)).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
// Последняя явная поправка 13:55 заменяет речь сцены 4 из основной таблицы.
const correctedSpeech = /^- Закадровый текст сцены 4: «([^»]+)»\./m.exec(storyboard);
assert.ok(correctedSpeech, "Не найдена поправка речи сцены 4");
rows[3][3] = `${correctedSpeech[1]}.`;
const blocks = parseBlocks(storyboard);
assert.deepEqual(rows.map(([n]) => n), Array.from({ length: 9 }, (_, i) => String(i + 1)), "Нужны ровно девять сцен сценария");
assert.deepEqual(Object.keys(blocks), rows.map(([n]) => n), "Посторонняя реплика вне сценария");
for (const [n, , , text] of rows) assert.equal(blocks[n], text, `Речь сцены ${n} отличается от исходного сценария`);

mkdirSync(`${root}/assets/vo`, { recursive: true });
const scenes = [];
for (const [id, , , text, title] of rows) {
  const n = Number(id);
  const source = `${root}/assets/vo-v3/block-${n}`;
  const target = `${root}/assets/vo/scene-${n}`;
  const raw = JSON.parse(readFileSync(`${source}.alignment.json`, "utf8"));
  assert.equal(raw.characters.join("").trim(), text, `Выравнивание сцены ${n} не соответствует речи`);
  const { align } = normalize(`${source}.mp3`, raw, `${target}.mp3`);
  writeFileSync(`${target}.alignment.json`, JSON.stringify(align));
  execFileSync("node", [`${root}/tools/json2js.mjs`, "align", `${target}.alignment.json`, String(n).padStart(2, "0")], { stdio: "inherit" });
  const audioDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${target}.mp3`], { encoding: "utf8" }).trim());
  // ElevenLabs может отводить конечному знаку пунктуации время после конца MP3.
  const duration = Math.ceil(Math.max(audioDuration, align.character_end_times_seconds.at(-1)) * 10) / 10;
  const titleNumber = [3, 4, 7, 8].indexOf(n) + 1;
  if (titleNumber) scenes.push({ id: `t${titleNumber}`, kind: "title", of: n, overlay: true, duration: 2, chapter: title, step: null, title: `Часть ${titleNumber} · ${title}`, audio: null });
  scenes.push({ n, duration, chapter: title, step: null, title, audio: `assets/vo/scene-${n}.mp3`, audioDuration: Number(audioDuration.toFixed(3)) });
  console.log(`сцена ${n}: звук ${audioDuration.toFixed(3)} с, сцена ${duration.toFixed(1)} с`);
}
writeFileSync(`${root}/scenes.json`, JSON.stringify(scenes, null, 2) + "\n");
console.log(`scenes.json: 9 сцен, 4 наложения, ${scenes.filter((scene) => !scene.overlay).reduce((total, scene) => total + scene.duration, 0).toFixed(1)} с`);
