#!/usr/bin/env node
// Пересчитывает субтитры, транскрипт и главы итогового ролика с заставками.
//   node tools/build-captions.mjs
// Вход: scenes.json (порядок и длительности, заставки kind: "title") и assets/vo/scene-N.alignment.json.
// Выход: renders/block-p4.srt, .vtt (дорожка для плеера), .transcript.txt, .chapters.json (start = начало заставки, speechStart = начало сцены).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const R = `${root}/renders/block-p4`;
const terms = JSON.parse(readFileSync(`${root}/terms.json`, "utf8"));
// озвучка записана по-русски, в субтитрах — как на страницах (terms.json)
// короткий предлог не остаётся в конце строки субтитра: неразрывный пробел после него
const backSub = (s) => terms.reduce((acc, [from, to]) => acc.replace(new RegExp(`(?<![\\p{L}\\p{N}])${from}(?![\\p{L}\\p{N}])`, "giu"), to), s).replace(/(?<![\p{L}\p{N}])(в|во|к|ко|с|со|у|о|об|от|по|на|до|за|из)[ \t]+/giu, "$1\u00a0");
const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const num = (s) => s.kind !== "title";

// по сценам: старое начало (без заставок), новое начало речи и заставки
let oldT = 0, newT = 0;
const scenes = [];
let pendingTitle = null;
for (const s of manifest) {
  if (!num(s)) { pendingTitle = { start: newT, d: s.overlay ? 0 : s.duration }; if (!s.overlay) newT += s.duration; continue; }
  scenes.push({ ...s, oldStart: oldT, speechStart: newT, titleStart: pendingTitle ? pendingTitle.start : newT, end: newT + s.duration, titleDur: pendingTitle ? pendingTitle.d : 0 });
  oldT += s.duration; newT += s.duration; pendingTitle = null;
}
const total = newT;

// R2: ровно два tail-титра (t2/t4) ложатся на хвост предыдущей сцены; их визуальный интервал
// начинается за duration до начала речи. Последняя реплика предыдущего блока заканчивается там же.
// Все проверки - до любых записей; конфиг обязан совпасть, иначе STOP.
const PLAN = JSON.parse(readFileSync(`${root}/tools/vo-tail-plan.json`, "utf8"));
const HEAD = PLAN.headSeconds ?? 0; // авторская голова фильма: прибавляется только при записи времён, проверки идут по карте без головы
const fail = (msg) => { throw new Error(`build-captions: ${msg}; файлы субтитров не изменены`); };
const finite = (value, field) => {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${field}: требуется конечное число (number)`);
  return value;
};
if (PLAN.format !== 1) fail("vo-tail-plan.json: неизвестный format"); // TASK-685: длительность фильма — из принятого плана (сверяется ниже с картой)
finite(total, "computedFilmSeconds");
if (Math.abs(total - PLAN.filmSeconds) > 1e-9) fail(`длительность ${total} != ${PLAN.filmSeconds} с`);
const tailTitles = manifest.filter((s) => s.kind === "title" && s.tail === true);
if (tailTitles.length !== 2 || tailTitles.map((s) => s.id).join(",") !== "t2,t4") fail("ожидаются ровно два tail-титра t2,t4");
if (!Array.isArray(PLAN.tails) || PLAN.tails.length !== 2) fail("vo-tail-plan.json: ожидаются ровно два tail-плана");
// Required static facts must never pass comparisons as undefined, NaN or numeric strings.
for (const field of ["filmSeconds", "titleDurationSeconds", "cueCount"]) finite(PLAN[field], field);
for (const field of ["indexDurationRoundingSeconds", "oneDecodedSampleSeconds"]) finite(PLAN.clock?.[field], `clock.${field}`);
if (!Array.isArray(PLAN.chaptersVoiceStarts) || PLAN.chaptersVoiceStarts.length !== 2) fail("chaptersVoiceStarts: требуются две границы");
PLAN.chaptersVoiceStarts.forEach((value, i) => finite(value, `chaptersVoiceStarts[${i}]`));
if (!Array.isArray(PLAN.tails) || PLAN.tails.length !== 2) fail("tails: требуются два плана");
for (const [i, tail] of PLAN.tails.entries()) {
  for (const field of ["of", "visualStart", "visualEnd", "previousSceneStart", "previousIndexAudioDataDuration", "previousHtmlAudioDuration", "previousDecodedDuration", "previousAlignmentSpokenEnd", "previousConservativeEnd", "previousReadDeadline"]) finite(tail?.[field], `tails[${i}].${field}`);
  for (const field of ["originalStart", "originalEnd", "trimmedEnd", "wordCount", "neededSeconds", "availableSeconds"]) finite(tail.previousCue?.[field], `tails[${i}].previousCue.${field}`);
}
const trimPlan = new Map(PLAN.tails.map((t) => [t.titleId, t]));

const ts = (t, sep) => { const ms = Math.round((t + HEAD) * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`; };
const mmss = (t0) => { const t = t0 + HEAD; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${(t % 60).toFixed(1).padStart(4, "0")}`; };
const parse = (x) => { const [h, m, s] = x.replace(",", ".").split(":"); return +h * 3600 + +m * 60 + +s; };

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
    else if (text[k] === " " && text[k + 1] === "—" && text[k + 2] === " ") cands.push([k - 1, k + 1, true]);
  }
  let best = null;
  for (const [le, rs, dash] of cands) {
    const l = le - a + 1, r = b - rs + 1;
    if (l < 10 || r < 10) continue;
    // Ревью W3b P3-3: реплика с тире в начале читается как обрывок; знак препинания в пределах 30 символов от середины лучше.
    const sc = Math.abs(l - r) + (dash ? 30 : 0);
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
  if (!sc.audio) continue;
  const alf = `${root}/assets/vo/scene-${sc.n}.alignment.json`;
  if (!existsSync(alf)) continue;   // озвучка ещё не подготовлена
  const al = JSON.parse(readFileSync(alf, "utf8"));
  const text = al.characters.join("").replace(/(?<![\p{L}\p{N}])(в|во|к|ко|с|со|у|о|об|от|по|на|до|за|из)[ \t]+/giu, (m) => m.replace(/[ \t]+$/, "\u00a0")), st = al.character_start_times_seconds, en = al.character_end_times_seconds;
  const mine = [];
  for (const [a, b] of sentenceSpans(text)) {
    const parts = splitSpan(text, a, b, MAX_CUE);
    parts.forEach(([pa, pb], i) => mine.push({ sc, a: sc.speechStart + st[pa], z: sc.speechStart + (i < parts.length - 1 ? st[parts[i + 1][0]] : en[pb] + HOLD), spokenEnd: sc.speechStart + en[pb], text: wrap(backSub(text.slice(pa, pb + 1))) }));
  }
  mine.forEach((c, i) => { if (mine[i + 1]) c.z = Math.min(c.z, mine[i + 1].a - 0.02); });
  cues.push(...mine);
}

// R2: ровно два разрешённых END-среза реплик предыдущих блоков 1/3 (85.787->85.5, 149.321->149).
// Граница producer-backed: visual start tail-титра; без ручной правки VTT/SRT и без общего HOLD.
let trimmed = 0;
for (const title of tailTitles) {
  const plan = trimPlan.get(title.id);
  if (!plan) fail(`нет tail-плана для ${title.id}`);
  const next = scenes.find((s) => s.n === title.of);
  if (!next) fail(`нет сцены ${title.of} для ${title.id}`);
  const prev = scenes[scenes.indexOf(next) - 1];
  if (!prev) fail(`нет предыдущей сцены для ${title.id}`);
  finite(next.speechStart, `${title.id}.speechStart`);
  finite(next.titleStart, `${title.id}.chapterStart`);
  finite(title.duration, `${title.id}.duration`);
  const bound = finite(next.speechStart - title.duration, `${title.id}.visualStart`);
  if (Math.abs(bound - plan.visualStart) > 1e-9) fail(`${title.id}: visual start ${bound} != ${plan.visualStart}`);
  if (Math.abs(next.titleStart - plan.visualStart) < 1e-9) fail(`${title.id}: глава не должна начинаться с visual start`);
  const cue = cues.filter((c) => c.sc === prev).at(-1);
  if (!cue) fail(`${title.id}: нет реплики предыдущей сцены`);
  for (const field of ["a", "z", "spokenEnd"]) finite(cue[field], `${title.id}.cue.${field}`);
  if (Math.round(cue.a * 1000) !== Math.round(plan.previousCue.originalStart * 1000)) fail(`${title.id}: начало реплики изменилось`);
  if (Math.round(cue.z * 1000) !== Math.round(plan.previousCue.originalEnd * 1000)) fail(`${title.id}: исходный конец реплики ${cue.z} != ${plan.previousCue.originalEnd}`);
  if (cue.text !== plan.previousCue.text) fail(`${title.id}: текст реплики изменился: ${JSON.stringify(cue.text)}`);
  if (cue.spokenEnd > plan.previousCue.trimmedEnd + 1e-9) fail(`${title.id}: срез задевает произнесённые слова`);
  const words = cue.text.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  if (words !== plan.previousCue.wordCount) fail(`${title.id}: число слов ${words} != ${plan.previousCue.wordCount}`);
  const needed = finite(words / 3 + 1, `${title.id}.neededSeconds`);
  finite(plan.previousCue.trimmedEnd - cue.a, `${title.id}.availableSeconds`);
  if (plan.previousCue.trimmedEnd - cue.a < needed - 1e-9) fail(`${title.id}: недостаточно времени чтения ${plan.previousCue.trimmedEnd - cue.a} < ${needed}`);
  if (Math.abs(plan.previousCue.trimmedEnd - bound) > 1e-9) fail(`${title.id}: срез ${plan.previousCue.trimmedEnd} != visual start ${bound}`);
  cue.z = plan.previousCue.trimmedEnd;
  trimmed++;
}
if (trimmed !== 2) fail(`ожидались ровно два END-среза, получено ${trimmed}`);
if (cues.length !== PLAN.cueCount) fail(`реплик ${cues.length}, ожидалось ${PLAN.cueCount}`);
for (const [i, title] of tailTitles.entries()) {
  const sc = scenes.find((s) => s.n === title.of);
  if (!sc || Math.abs(sc.titleStart - PLAN.chaptersVoiceStarts[i]) > 1e-9) fail(`главы должны остаться voice-based: ${title.id} != ${PLAN.chaptersVoiceStarts[i]}`);
}

for (const [i, cue] of cues.entries()) {
  finite(cue.a, `cues[${i}].start`); finite(cue.z, `cues[${i}].end`);
}
mkdirSync(dirname(R), { recursive: true });
writeFileSync(`${R}.srt`, cues.map((c, i) => `${i + 1}\n${ts(c.a, ",")} --> ${ts(c.z, ",")}\n${c.text}\n`).join("\n"));
writeFileSync(`${R}.vtt`, `WEBVTT\n\n${cues.map((c) => `${ts(c.a, ".")} --> ${ts(c.z, ".")}\n${c.text}\n`).join("\n")}`);

const lines = [];
for (const s of scenes) {
  const head = s.n === 0 || s.step == null ? `Сцена ${s.n}` : `Сцена ${s.n} (часть ${s.step})`;
  if (s.titleDur) lines.push(`== Заставка перед сценой ${s.n} [${s.chapter}] ${mmss(s.titleStart)}–${mmss(s.speechStart)} ==`, "(без озвучки)", "");
  lines.push(`== ${head}: ${s.title} [${s.chapter}] ${mmss(s.speechStart)}–${mmss(s.end)} ==`);
  const cs = cues.filter((c) => c.sc === s);
  lines.push(...(cs.length ? cs.map((c) => `[${mmss(c.a)}] ${c.text}`) : ["(без озвучки)"]), "");
}
writeFileSync(`${R}.transcript.txt`, lines.join("\n"));

// Вступление до первой части: плеер без главы показывал бы «Часть 1» с 0:00.
const parts = scenes.filter((s) => s.step != null).map((s) => ({ n: s.n, title: s.title, step: s.step, chapter: s.chapter, start: +(s.titleStart + HEAD).toFixed(2), titleStart: +(s.titleStart + HEAD).toFixed(2), speechStart: +(s.speechStart + HEAD).toFixed(2), end: +(s.end + HEAD).toFixed(2) }));
const intro = { n: 0, title: "Вступление", step: null, chapter: "Вступление", start: 0, titleStart: 0, speechStart: 0, end: parts[0].start };
writeFileSync(`${R}.chapters.json`, JSON.stringify([intro, ...parts], null, 2) + "\n");
console.log(`сцен ${scenes.length}, реплик ${cues.length}, ${total.toFixed(1)} с`);
