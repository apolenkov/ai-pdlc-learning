#!/usr/bin/env node
// Субтитры VTT из alignment озвучки: одна реплика на предложение (или часть после «;»/«:»), время сцены + её смещение.
// Короткая голова перед «:» не отделяется от продолжения, длинная реплика режется по тире.
// Конец реплики: хвост 0,3 с, но не позже конца сцены и не позже начала следующей реплики минус зазор 0,02 с —
// иначе плеер показывает две реплики сразу.
//   node tools/make-vtt.mjs [out.vtt]     пишет дорожку
//   node tools/make-vtt.mjs --selftest    проверяет зажим конца реплики, файлов не пишет
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const terms = JSON.parse(readFileSync(`${root}/terms.json`, "utf8"));
const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = x % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`; };
const GAP = 0.02, TAIL = 0.3, MAX_CUE = 110, SHORT_HEAD = 9;
// озвучка записана по-русски, в субтитрах — как на страницах (terms.json)
const backSub = (s) => terms.reduce((acc, [from, to]) => acc.replace(new RegExp(`(?<![\\p{L}\\p{N}])${from}(?![\\p{L}\\p{N}])`, "giu"), to), s);

/** Конец реплики — не позже начала следующей в той же сцене минус зазор и не позже конца сцены. */
export const clampEnds = (cues, sceneEnd) => {
  cues.forEach((c, i) => {
    if (cues[i + 1]) c.end = Math.min(c.end, cues[i + 1].start - GAP);
    c.end = Math.min(c.end, sceneEnd);
    assert.ok(Number.isFinite(c.start) && c.end > c.start, `Реплика без длины: ${c.text}`);
    assert.ok(!i || c.start >= cues[i - 1].end, i ? `Перекрытие реплик: ${cues[i - 1].text} / ${c.text}` : "");
  });
  return cues;
};

/** Короткую голову перед «:» (≤ 9 знаков) оставляем вместе с продолжением. */
const mergeShortHead = (parts) => parts.flatMap((part, i) => {
  const next = parts[i + 1];
  if (part.body.endsWith(":") && part.body.length <= SHORT_HEAD + 1 && next && !/^[А-ЯЁA-Z]/u.test(next.body)) {
    next.i0 = part.i0;
    next.body = `${part.body} ${next.body}`;
    return [];
  }
  return [part];
});

/** Длинную реплику режем по тире ближе к середине: на экране читается за 3–7 с. */
const splitLong = (part) => {
  if (part.body.length <= MAX_CUE) return [part];
  const poses = [...part.body.matchAll(/ — /gu)].map((x) => x.index).filter((i) => i > 10 && part.body.length - i > 10);
  const mid = part.body.length / 2;
  poses.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
  const cut = poses[0];
  if (cut === undefined) return [part];
  return [
    { i0: part.i0, i1: part.i0 + cut + 1, body: part.body.slice(0, cut + 2).trimEnd() },
    { i0: part.i0 + cut + 3, i1: part.i1, body: part.body.slice(cut + 3) },
  ];
};

if (process.argv[2] === "--selftest") {
  const cues = [{ start: 0, end: 2.3, text: "первая" }, { start: 2, end: 3, text: "вторая" }];
  assert.ok(cues[0].end > cues[1].start, "отрицательный пример: без зажима перекрытие есть");
  clampEnds(cues, 9);
  assert.ok(Math.abs(cues[0].end - 1.98) < 1e-9, `ожидал 1.98, получил ${cues[0].end}`);
  assert.ok(cues[0].end <= cues[1].start - GAP);
  assert.deepEqual(mergeShortHead([{ i0: 0, i1: 5, body: "Шаги:" }, { i0: 7, i1: 20, body: "дальше текст." }]).length, 1, "короткую голову склеиваем");
  assert.deepEqual(mergeShortHead([{ i0: 0, i1: 11, body: "Шесть задач:" }, { i0: 13, i1: 20, body: "дальше текст." }]).length, 2, "длинную голову не склеиваем");
  console.log("make-vtt: ok");
} else {
  const cues = [];
  let t0 = 0;
  for (const s of scenes) {
    const alignment = JSON.parse(readFileSync(`${root}/assets/vo/scene-${String(s.n).padStart(2, "0")}.alignment.json`, "utf8"));
    const text = alignment.characters.join("");
    const sentence = /[^.!?;:]+[.!?;:]?/g;
    const parts = [];
    let match;
    while ((match = sentence.exec(text))) {
      const raw = match[0], lead = raw.length - raw.trimStart().length, body = raw.trim();
      if (!body) continue;
      const i0 = match.index + lead, i1 = match.index + lead + body.length - 1;
      parts.push({ i0, i1, body });
    }
    const sceneCues = mergeShortHead(parts).flatMap(splitLong).map((part) => ({
      start: t0 + alignment.character_start_times_seconds[part.i0],
      end: t0 + alignment.character_end_times_seconds[part.i1] + TAIL,
      text: backSub(part.body),
    }));
    clampEnds(sceneCues, t0 + s.duration);
    cues.push(...sceneCues);
    t0 += s.duration;
  }
  const out = `WEBVTT\n\n${cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n\n`).join("")}`;
  const file = resolve(process.argv[2] ?? `${root}/renders/film.vtt`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, out);
  console.log(`${file}: ${cues.length} реплик`);
}
