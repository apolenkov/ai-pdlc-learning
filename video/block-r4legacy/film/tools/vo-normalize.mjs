#!/usr/bin/env node
// Выравнивание пауз озвучки (правила озвучки course-video, D28): одна карта времени для звука и выравнивания.
//   node tools/vo-normalize.mjs <вход.mp3> <вход.alignment.json> <выход.mp3> <выход.alignment.json>
// Тишина (silencedetect −50 дБ, ≥30 мс) относится к ближайшему знаку препинания по выравниванию (до 0,3 с):
//   самая длинная у знака конца предложения (. ! ? …) → 300 мс (коридор 280–320);
//   самая длинная у запятой, двоеточия, тире, кавычки → 130 мс, если была длиннее 150 мс (коридор 100–150);
//   прочие тишины длиннее 120 мс (разрыв вне знаков, вторая у того же знака) → 100 мс;
//   30–120 мс — естественные межсловные, не трогаем. Начало речи — 80 мс тишины, конец — 150 мс.
// Выравнивание пересчитывается той же картой: символы внутри вырезанной тишины сжимаются к точке склейки.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { HARD, NEAR, PUNCT, detectSilences, parseSilences } from "./vo-gaps.mjs";

export const SR = 44100;
export const TARGET = { sentence: 0.3, soft: 0.13, off: 0.1, head: 0.08, tail: 0.15 };
const SOFT_KEEP = 0.15; // не длиннее — коридор запятой выдержан, не трогаем

/** Операции над тишинами: [{ start, end, len }] — тишину [start, end] заменить тишиной длины len (секунды). */
export const plan = (silences, align, first, last) => {
  const { characters: ch, character_start_times_seconds: st, character_end_times_seconds: en } = align;
  const ops = [];
  const groups = new Map(); // индекс знака → [{ g, d }]
  for (const g of silences) {
    const mid = (g.start + g.end) / 2;
    if (g.end <= first + 0.02) { ops.push({ start: g.start, end: g.end, len: Math.min(g.end - g.start, TARGET.head) }); continue; }
    if (g.start >= last - 0.02) { ops.push({ start: g.start, end: g.end, len: Math.min(g.end - g.start, TARGET.tail) }); continue; }
    let best = null;
    ch.forEach((c, i) => {
      if (!PUNCT.has(c)) return;
      const d = mid < st[i] ? st[i] - mid : mid > en[i] ? mid - en[i] : 0;
      if (d <= NEAR && (!best || d < best.d)) best = { d, i };
    });
    if (!best) { if (g.end - g.start > 0.12) ops.push({ start: g.start, end: g.end, len: TARGET.off }); continue; }
    if (!groups.has(best.i)) groups.set(best.i, []);
    groups.get(best.i).push(g);
  }
  for (const [i, list] of groups) {
    list.sort((a, b) => b.end - b.start - (a.end - a.start));
    const [main, ...rest] = list;
    const sentence = HARD.has(ch[i]);
    const len = main.end - main.start;
    if (sentence) ops.push({ start: main.start, end: main.end, len: TARGET.sentence });
    else if (len > SOFT_KEEP) ops.push({ start: main.start, end: main.end, len: TARGET.soft });
    for (const g of rest) if (g.end - g.start > 0.12) ops.push({ start: g.start, end: g.end, len: TARGET.off });
  }
  return ops.sort((a, b) => a.start - b.start);
};

/** Новое время для старого t по операциям. */
export const mapTime = (ops, t) => {
  let delta = 0;
  for (const o of ops) {
    if (t >= o.end) delta += o.len - (o.end - o.start);
    else if (t > o.start) return o.start + delta + Math.min(t - o.start, o.len);
    else break;
  }
  return t + delta;
};

export const apply = (pcm, ops) => {
  const parts = [];
  let pos = 0;
  for (const o of ops) {
    const s = Math.round(o.start * SR), e = Math.min(pcm.length, Math.round(o.end * SR));
    parts.push(pcm.subarray(pos, s));
    parts.push(new Int16Array(Math.round(o.len * SR))); // тишина новой длины (цифровой ноль: границы и так тихие)
    pos = e;
  }
  parts.push(pcm.subarray(pos));
  const out = new Int16Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  const fade = Math.round(0.01 * SR);
  for (let i = 0; i < fade && i < out.length; i += 1) { out[i] = Math.round((out[i] * i) / fade); out[out.length - 1 - i] = Math.round((out[out.length - 1 - i] * i) / fade); }
  return out;
};

const decode = (file) => {
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "s16le", "-ac", "1", "-ar", String(SR), "-"], { maxBuffer: 1 << 29 });
  return new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
};
const encode = (pcm, file) => execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", String(SR), "-i", "-", "-b:a", "192k", file], { input: Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength) });

export const normalize = (inFile, align, outFile) => {
  const pcm = decode(inFile);
  const total = pcm.length / SR;
  const silences = parseSilences(detectSilences(inFile), total);
  const first = align.character_start_times_seconds[0], last = align.character_end_times_seconds.at(-1);
  const ops = plan(silences, align, first, last);
  encode(apply(pcm, ops), outFile);
  const map = (a) => a.map((t) => Number(mapTime(ops, t).toFixed(4)));
  return { ops, align: { characters: align.characters, character_start_times_seconds: map(align.character_start_times_seconds), character_end_times_seconds: map(align.character_end_times_seconds) } };
};

if (process.argv[2] === "--selftest") {
  const a = { characters: ["а", ".", " ", "б", ",", " ", "в"], character_start_times_seconds: [0, 0.3, 0.7, 0.7, 1.0, 1.2, 1.4], character_end_times_seconds: [0.3, 0.7, 0.7, 1.0, 1.2, 1.4, 1.7] };
  const ops = plan([{ start: 0.35, end: 0.7 }, { start: 1.02, end: 1.2 }, { start: 1.5, end: 1.7 }], a, 0, 1.9);
  // 350 мс у точки → 300, 180 мс у запятой → 130; 200 мс вне знаков не рядом: «в» далеко от знака → 100... но тут запятая рядом (0,3 с) → вторая у того же знака
  assert.equal(ops[0].len, TARGET.sentence);
  assert.equal(ops[1].len, TARGET.soft);
  assert.ok(mapTime(ops, 0.7) < 0.7 && Math.abs(mapTime(ops, 0.7) - (0.35 + 0.3)) < 1e-9);
  const pcm = new Int16Array(SR);
  assert.equal(apply(pcm, [{ start: 0.2, end: 0.5, len: 0.1 }]).length, SR - Math.round(0.2 * SR));
  console.log("vo-normalize: ok");
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [inFile, inAlign, outFile, outAlign] = process.argv.slice(2);
  if (!inFile || !inAlign || !outFile || !outAlign) throw new Error("Использование: node tools/vo-normalize.mjs <вход.mp3> <вход.alignment.json> <выход.mp3> <выход.alignment.json>");
  const r = normalize(inFile, JSON.parse(readFileSync(inAlign, "utf8")), outFile);
  writeFileSync(outAlign, JSON.stringify(r.align));
  const cut = r.ops.reduce((n, o) => n + (o.end - o.start) - o.len, 0);
  console.log(`${outFile}: операций ${r.ops.length}, длительность изменена на ${(-cut).toFixed(2)} с`);
}
