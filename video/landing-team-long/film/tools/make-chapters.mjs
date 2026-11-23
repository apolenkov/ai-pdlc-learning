#!/usr/bin/env node
// Главы ролика по сценам: <ролик>.chapters.json (формат block-*: n, title, step, chapter, start, titleStart, speechStart, end)
// и <ролик>.chapters.vtt (дорожка <track kind="chapters">). Границы — из scenes.json, начало речи — из alignment.
//   node tools/make-chapters.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "..", "landing-team-long");
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const r3 = (x) => Number(x.toFixed(3));
const ts = (x) => { const m = Math.floor(x / 60), s = x % 60; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`; };
let t = 0;
const chapters = scenes.map((s, i) => {
  const a = JSON.parse(readFileSync(`${root}/assets/vo/scene-${String(s.n).padStart(2, "0")}.alignment.json`, "utf8"));
  const speech = a.character_start_times_seconds.find((_, k) => /\S/u.test(a.characters[k]));
  const c = { n: s.n, title: s.title, step: null, chapter: s.title, start: r3(t), titleStart: r3(t), speechStart: r3(t + speech), end: r3(t + s.duration) };
  t += s.duration;
  return c;
});
writeFileSync(`${out}.chapters.json`, JSON.stringify(chapters, null, 2) + "\n");
writeFileSync(`${out}.chapters.vtt`, "WEBVTT\n\n" + chapters.map((c) => `${c.n}\n${ts(c.start)} --> ${ts(c.end)}\n${c.title}\n`).join("\n"));
console.log(`глав: ${chapters.length}, конец ${chapters.at(-1).end} с`);
