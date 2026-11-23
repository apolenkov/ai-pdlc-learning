#!/usr/bin/env node
// Субтитры VTT из alignment озвучки: одна реплика на предложение (длинное, > 62 знаков, — по частям после «;»/«:»), время сцены + её смещение.
//   node tools/make-vtt.mjs [out.vtt]     пишет дорожку
//   node tools/make-vtt.mjs --selftest    проверяет зажим конца реплики, файлов не пишет
// Конец реплики: последняя буква + хвост 0,2 с, но не позже конца сцены и не позже начала следующей реплики минус зазор 0,02 с —
// иначе плеер показывает две реплики сразу (перекрытия нашло ревью дорожек 577/561: 49 и 72 штуки до 300 мс).
// Термины — по terms.json: озвучка записана по-русски, в субтитрах — как на страницах (Git, OpenSpec, Maintainer).
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const terms = JSON.parse(readFileSync(`${root}/terms.json`, "utf8"));
const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = x % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`; };
const GAP = 0.02, MAX = 62;
const backSub = (s) => terms.reduce((acc, [from, to]) => acc.replace(new RegExp(`(?<![\\p{L}\\p{N}])${from}(?![\\p{L}\\p{N}])`, "giu"), to), s);

/** Конец реплики — не позже конца сцены и не позже начала следующей минус зазор; перекрытие — ошибка. */
export const clampEnds = (cues, sceneEnd) => {
  cues.forEach((c, i) => {
    if (cues[i + 1]) c.end = Math.min(c.end, cues[i + 1].start - GAP);
    c.end = Math.min(c.end, sceneEnd);
    assert.ok(Number.isFinite(c.start) && c.end > c.start, `Реплика без длины: ${c.text}`);
    assert.ok(!i || c.start >= cues[i - 1].end, i ? `Перекрытие реплик: ${cues[i - 1].text} / ${c.text}` : "");
  });
  return cues;
};

if (process.argv[2] === "--selftest") {
  const cues = [{ start: 0, end: 2.3, text: "первая" }, { start: 2, end: 3, text: "вторая" }];
  assert.ok(cues[0].end > cues[1].start, "отрицательный пример: без зажима перекрытие есть");
  clampEnds(cues, 9);
  assert.ok(Math.abs(cues[0].end - 1.98) < 1e-9, `ожидал 1.98, получил ${cues[0].end}`);
  assert.ok(cues[0].end <= cues[1].start - GAP);
  console.log("make-vtt: ok");
} else {
  let t0 = 0, n = 0, out = "WEBVTT\n\n";
  for (const s of scenes) {
    const a = JSON.parse(readFileSync(`${root}/assets/vo/scene-${String(s.n).padStart(2, "0")}.alignment.json`, "utf8"));
    const text = a.characters.join("");
    // реплика — предложение; по «;»/«:» режется только предложение длиннее MAX знаков (иначе «Второй раздел: анализ.» дало бы реплику 0,8 с)
    const parts = [];
    for (const sm of text.matchAll(/[^.!?]+[.!?]?/g)) {
      if (sm[0].trim().length <= MAX) { parts.push({ 0: sm[0], index: sm.index }); continue; }
      for (const pm of sm[0].matchAll(/[^;:]+[;:]?/g)) parts.push({ 0: pm[0], index: sm.index + pm.index });
    }
    const cues = [];
    for (const m of parts) {
      const raw = m[0], lead = raw.length - raw.trimStart().length, body = raw.trim();
      if (!body) continue;
      const i0 = m.index + lead; let i1 = m.index + lead + body.length - 1;
      while (i1 > i0 && !/[\p{L}\p{N}]/u.test(a.characters[i1])) i1--; // конец — последняя буква: знак в конце растягивается до конца файла озвучки
      cues.push({ start: t0 + a.character_start_times_seconds[i0], end: t0 + a.character_end_times_seconds[i1] + 0.2, text: backSub(body) });
    }
    clampEnds(cues, t0 + s.duration);
    for (const c of cues) out += `${++n}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n\n`;
    t0 += s.duration;
  }
  const file = resolve(process.argv[2] ?? `${root}/renders/film.vtt`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, out);
  console.log(`${file}: ${n} реплик`);
}
