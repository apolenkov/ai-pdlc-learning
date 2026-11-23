#!/usr/bin/env node
// Главы ролика по разделам главной: <ролик>.chapters.json (формат block-*: n, title, step, chapter, start, titleStart, speechStart, end)
// и <ролик>.chapters.vtt (дорожка <track kind="chapters">).
// Глава на границе сцены начинается со старта сцены (scenes.json, поле chapter);
// глава внутри сцены (scenes.json, поле chapters: [{ title, from }]) — с начала реплики VTT, текст которой начинается с `from`.
// Сначала node tools/make-vtt.mjs ../landing-overview-sections.vtt, затем:
//   node tools/make-chapters.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "..", "landing-overview-sections");
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const r3 = (x) => Number(x.toFixed(3));
const ts = (x) => { const m = Math.floor(x / 60), s = x % 60; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`; };
const sec = (v) => { const [h, m, s] = v.split(":"); return Number(h) * 3600 + Number(m) * 60 + Number(s); };
const cues = readFileSync(`${out}.vtt`, "utf8").split(/\n\n+/).map((b) => b.trim().split("\n")).filter((l) => l.length >= 3 && l[1].includes("-->"))
  .map((l) => ({ start: sec(l[1].split(" --> ")[0]), text: l.slice(2).join(" ") }));
let t = 0;
const chapters = [];
for (const s of scenes) {
  const a = JSON.parse(readFileSync(`${root}/assets/vo/scene-${String(s.n).padStart(2, "0")}.alignment.json`, "utf8"));
  const speech = a.character_start_times_seconds.find((_, k) => /\S/u.test(a.characters[k]));
  const name = s.chapter ?? s.title;
  chapters.push({ title: name, step: null, chapter: name, start: r3(t), titleStart: r3(t), speechStart: r3(t + speech) });
  for (const c of s.chapters ?? []) {
    const cue = cues.find((q) => q.start >= t && q.start < t + s.duration && q.text.startsWith(c.from));
    if (!cue) throw new Error(`сцена ${s.n}: нет реплики VTT, начинающейся с «${c.from}»`);
    chapters.push({ title: c.title, step: null, chapter: c.title, start: r3(cue.start), titleStart: r3(cue.start), speechStart: r3(cue.start) });
  }
  t += s.duration;
}
chapters.forEach((c, i) => { c.n = i + 1; c.end = r3(chapters[i + 1]?.start ?? t); });
const ordered = chapters.map(({ n, title, step, chapter, start, titleStart, speechStart, end }) => ({ n, title, step, chapter, start, titleStart, speechStart, end }));
writeFileSync(`${out}.chapters.json`, JSON.stringify(ordered, null, 2) + "\n");
writeFileSync(`${out}.chapters.vtt`, "WEBVTT\n\n" + ordered.map((c) => `${c.n}\n${ts(c.start)} --> ${ts(c.end)}\n${c.title}\n`).join("\n"));
console.log(`глав: ${ordered.length}, конец ${ordered.at(-1).end} с`);
