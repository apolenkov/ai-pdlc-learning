#!/usr/bin/env node
// План звуковых событий → sfx.json (формат sfx-plan.ts: явный список events).
// Время = старт сцены (scenes.json) + момент в озвучке (alignment), те же числа, что в work/scenes/NN.js (tools/make-scenes.mjs).
// Эффекты (video/_shared/sfx): swipe — смена главы; pop — заголовок главы, плашка роли; click — зарисовка скетча; subdrop — хвост.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const al = scenes.map((s) => JSON.parse(readFileSync(`${root}/assets/vo/scene-${String(s.n).padStart(2, "0")}.alignment.json`, "utf8")));
const starts = scenes.reduce((a, s) => (a.push(a.at(-1) + s.duration), a), [0]);
const T = (n, phrase) => {
  const a = al[n - 1], text = a.characters.join("");
  const i = text.toLowerCase().replace(/ё/g, "е").indexOf(phrase.toLowerCase().replace(/ё/g, "е"));
  if (i < 0) throw new Error(`сцена ${n}: нет «${phrase}»`);
  return a.character_start_times_seconds[i];
};
const TAGS = [["Человек", "Агент"], ["Решает"], ["одобряет"], ["утверждает"], ["принимает"], ["Решает"], ["допускает"], ["Решает"], ["решение"]];
const ev = [];
const e = (n, t, kind, pan, note) => ev.push({ kind, t: Number((starts[n - 1] + t).toFixed(3)), pan, note: `${n}: ${note}` });
scenes.forEach((s, i) => {
  const n = s.n;
  if (n > 1) e(n, 0.02, "swipe", 0, "смена главы");
  e(n, n === 1 ? 0.7 : 0.1, "pop", -0.4, "заголовок главы");
  e(n, (n === 1 ? 1.0 : 0.3) + 0.3, "click", 0.3, "скетч начинает рисоваться");
  TAGS[i].forEach((ph, k) => e(n, T(n, ph) - 0.1, "pop", 0.4, `плашка «${ph}»`));
});
e(scenes.length, scenes.at(-1).duration - 1.2, "subdrop", 0, "хвост");
ev.sort((a, b) => a.t - b.t);
writeFileSync(`${root}/sfx.json`, JSON.stringify({ events: ev }, null, 1) + "\n");
console.log(`sfx.json: ${ev.length} событий`);
