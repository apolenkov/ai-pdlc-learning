#!/usr/bin/env node
// Субтитры, транскрипт и девять глав landing-pdlc из нормализованного выравнивания.
//   node tools/build-captions.mjs
// Вход: scenes.json и assets/vo/scene-N.alignment.json.
// Выход: ../landing-pdlc.srt, .vtt, .transcript.txt, .chapters.json.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const R = `${root}/../landing-pdlc`;
mkdirSync(dirname(R), { recursive: true });
const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8")).filter((scene) => scene.kind !== "title");
assert.deepEqual(manifest.map((scene) => scene.n), Array.from({ length: 9 }, (_, i) => i + 1), "Нужны девять основных сцен");
let total = 0;
const scenes = manifest.map((scene) => {
  const start = total;
  total += scene.duration;
  return { ...scene, speechStart: start, titleStart: start, end: total };
});

const ts = (t, sep) => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`; };
const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${(t % 60).toFixed(1).padStart(4, "0")}`;

// реплики строятся из озвучки (assets/vo/scene-N.alignment.json) теми же правилами деления, что Kit.subtitles,
// но с лимитом на экран: реплика ≤ 2 строк по ≤ 42 знака, чтобы ничего не выходило за кадр
const MAX_LINE = 42, MAX_CUE = 80, HOLD = 0.35;
function sentenceSpans(text) {
  const out = []; let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (!".!?…".includes(text[i])) continue;
    let j = i; while (j + 1 < text.length && "»\"”')".includes(text[j + 1])) j++;
    if (j === text.length - 1 || /\s/.test(text[j + 1])) { out.push([start, j]); start = j + 1; i = j; }
  }
  if (text.slice(start).trim()) out.push([start, text.length - 1]);
  return out.map(([a, b]) => { while (/\s/.test(text[a])) a++; while (/\s/.test(text[b])) b--; return [a, b]; });
}
function splitSpan(text, a, b, max) {
  if (b - a + 1 <= max) return [[a, b]];
  const cands = [];
  for (let k = a; k < b; k++) {
    if (",:;".includes(text[k]) && text[k + 1] === " ") cands.push([k, k + 2]);
    else if (text[k] === " " && text[k + 1] === "—" && text[k + 2] === " ") cands.push([k - 1, k + 1]);
  }
  let best = null;
  for (const [le, rs] of cands) {
    const l = le - a + 1, r = b - rs + 1;
    if (l < 10 || r < 10) continue;
    const sc = Math.abs(l - r);
    if (!best || sc < best.sc) best = { le, rs, sc };
  }
  if (!best) { let k = a + Math.floor((b - a) / 2); while (k > a && text[k] !== " ") k--; best = { le: k - 1, rs: k + 1 }; }
  return splitSpan(text, a, best.le, max).concat(splitSpan(text, best.rs, b, max));
}
function wrap(t) {
  if (t.length <= MAX_LINE) return t;
  const mid = t.length / 2;
  const cand = (re, slack = 0) => [...t.matchAll(re)].map((m) => m.index).filter((i) => i <= MAX_LINE + slack && t.length - i - 1 <= MAX_LINE + slack).sort((x, y) => Math.abs(x - mid) - Math.abs(y - mid))[0];
  const sp = cand(/ /g) ?? cand(/ /g, 2) ?? cand(/\u00a0/g);   // запас: 2 знака сверх лимита вместо висящего предлога; затем разрыв у неразрывного пробела
  if (sp == null) throw new Error(`Реплику не удалось уложить в 2 строки по ${MAX_LINE}: ${t}`);
  return `${t.slice(0, sp)}\n${t.slice(sp + 1)}`;
}
const cues = [];
for (const sc of scenes) {
  const alf = `${root}/assets/vo/scene-${sc.n}.alignment.json`;
  const al = JSON.parse(readFileSync(alf, "utf8"));
  const text = al.characters.join("").replace(/(?<![\p{L}\p{N}])(в|во|к|ко|с|со|у|о|об|от|по|на|до|за|из)[ \t]+/giu, (m) => m.replace(/[ \t]+$/, "\u00a0")), st = al.character_start_times_seconds, en = al.character_end_times_seconds;
  const mine = [];
  for (const [a, b] of sentenceSpans(text)) {
    const parts = splitSpan(text, a, b, MAX_CUE);
    parts.forEach(([pa, pb], i) => mine.push({ sc, a: sc.speechStart + st[pa], z: sc.speechStart + (i < parts.length - 1 ? st[parts[i + 1][0]] : en[pb] + HOLD), text: wrap(text.slice(pa, pb + 1)) }));
  }
  mine.forEach((c, i) => {
    c.z = Math.min(c.z, sc.end, mine[i + 1] ? mine[i + 1].a - 0.02 : sc.end);
    assert.ok(Number.isFinite(c.a) && c.a >= sc.speechStart && c.z > c.a && c.z <= sc.end, `Субтитр вышел за сцену ${sc.n}`);
    assert.ok(c.text.split("\n").length <= 2 && c.text.split("\n").every((line) => line.length <= MAX_LINE + 2), "Субтитр не помещается в кадре");
  });
  cues.push(...mine);
}

writeFileSync(`${R}.srt`, cues.map((c, i) => `${i + 1}\n${ts(c.a, ",")} --> ${ts(c.z, ",")}\n${c.text}\n`).join("\n"));
writeFileSync(`${R}.vtt`, `WEBVTT\n\n${cues.map((c) => `${ts(c.a, ".")} --> ${ts(c.z, ".")}\n${c.text}\n`).join("\n")}`);

const lines = [];
for (const s of scenes) {
  lines.push(`== ${s.title} ${mmss(s.speechStart)}–${mmss(s.end)} ==`);
  const cs = cues.filter((c) => c.sc === s);
  lines.push(...(cs.length ? cs.map((c) => `[${mmss(c.a)}] ${c.text}`) : ["(без озвучки)"]), "");
}
writeFileSync(`${R}.transcript.txt`, lines.join("\n"));

// Девять названий из сценария, без искусственного вступления и счётчиков частей.
const chapters = scenes.map((s) => ({ n: s.n, title: s.title, step: null, chapter: s.chapter, start: +s.titleStart.toFixed(2), titleStart: +s.titleStart.toFixed(2), speechStart: +s.speechStart.toFixed(2), end: +s.end.toFixed(2) }));
writeFileSync(`${R}.chapters.json`, JSON.stringify(chapters, null, 2) + "\n");
console.log(`сцен ${scenes.length}, реплик ${cues.length}, ${total.toFixed(1)} с`);
