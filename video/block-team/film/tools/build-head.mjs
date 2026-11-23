#!/usr/bin/env node
// TASK-685: объявленное до рендера вступление голоса 0,1 с (3 кадра) для первой реплики.
// Валидатор позиции (position-check) требует lag строго внутри (0, N-L), поэтому реплика 0m начинается
// на 0,1 с корня; картина и длительности сцен не меняются. Запускать после build-index.mjs:
//   node tools/build-index.mjs && node tools/build-head.mjs
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const first = scenes.find((s) => s.audio && !s.overlay);
assert(first && Number.isFinite(first.audioHead) && first.audioHead > 0, "scenes.json: у первой озвученной сцены нет audioHead");
const file = `${root}/index.html`;
const html = readFileSync(file, "utf8");
const re = new RegExp(`(<audio id="vo-${first.id || String(first.n).padStart(2, "0")}"[^>]*? data-start=")0(")`);
assert(re.test(html), "index.html: не найден тег audio первой сцены со start=0 (build-index.mjs уже запускался?)");
writeFileSync(file, html.replace(re, `$1${first.audioHead}$2`));
console.log(`index.html: реплика ${first.n} начинается на ${first.audioHead} с`);
