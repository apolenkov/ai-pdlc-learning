#!/usr/bin/env node
// Конвертер JSON -> JS, чтобы не использовать fetch в композиции.
//   node tools/json2js.mjs align  assets/vo/scene-1.alignment.json 01   -> assets/vo/scene-01.alignment.js  (window.ALIGN["01"])
//   node tools/json2js.mjs clicks assets/rec/clicks-1.json         01   -> assets/rec/clicks-01.js         (window.CLICKS["01"])
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [kind, input, nn] = process.argv.slice(2);
if (!["align", "clicks"].includes(kind) || !input || !/^(\d{2}|0[bm])$/.test(nn || "")) {
  console.error("Использование: node tools/json2js.mjs <align|clicks> <вход.json> <NN, две цифры, 0b или 0m>");
  process.exit(1);
}
const data = JSON.parse(readFileSync(input, "utf8"));
if (kind === "align") {
  for (const k of ["characters", "character_start_times_seconds", "character_end_times_seconds"]) {
    if (!Array.isArray(data[k])) throw new Error(`В alignment нет массива ${k}`);
  }
  if (data.characters.length !== data.character_start_times_seconds.length || data.characters.length !== data.character_end_times_seconds.length) {
    throw new Error("Длины characters / start / end не совпадают");
  }
} else if (!Array.isArray(data) || data.some((c) => !["t", "x", "y"].every((k) => typeof c[k] === "number"))) {
  throw new Error('clicks.json: ожидается массив [{"t","x","y","label"}], t/x/y — числа');
}
const name = kind === "align" ? "ALIGN" : "CLICKS";
const out = join(dirname(input), kind === "align" ? `scene-${nn}.alignment.js` : `clicks-${nn}.js`);
writeFileSync(out, `window.${name} = window.${name} || {};\nwindow.${name}[${JSON.stringify(nn)}] = ${JSON.stringify(data)};\n`);
console.log("записан", out);
