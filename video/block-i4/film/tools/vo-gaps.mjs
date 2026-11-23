#!/usr/bin/env node
// Поиск разрывов и пауз в озвучке по выравниванию (правила озвучки course-video, D28).
//   node tools/vo-gaps.mjs assets/vo/scene-3.mp3 assets/vo/scene-3.alignment.json [--json]
// Тишина: ffmpeg silencedetect, порог −50 дБ, от 30 мс. Каждая тишина внутри речи относится к одному из видов
// по выравниванию: "punct" (рядом со знаком препинания) или "off" (вне знаков).
// Находка (finding): тишина длиннее 120 мс не рядом со знаком препинания (естественные межсловные 30–120 мс
// допустимы: без них слова склеиваются). Выравнивание модели неточно (0,1–0,25 с), поэтому «рядом со знаком» —
// ближе 0,3 с; разрыв внутри слова короче 120 мс так не отличить, его ловит сверка по распознаванию речи.
// Паузы на знаках перечисляются отдельно: запятая и подобные 100–150 мс, конец предложения 280–320 мс.
// Код выхода 1, если есть находки.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const NOISE_DB = -50;
export const MIN_MS = 30;
export const WORD_MAX_MS = 120;
export const SOFT = new Set([",", ":", ";", "—", "–", "-", ")", "»"]);
export const HARD = new Set([".", "!", "?", "…"]);
export const PUNCT = new Set([...SOFT, ...HARD]);

/** Журнал ffmpeg silencedetect (он пишет в stderr). */
export const detectSilences = (file) => {
  const r = spawnSync("ffmpeg", ["-v", "info", "-i", file, "-af", `silencedetect=noise=${NOISE_DB}dB:d=${MIN_MS / 1000}`, "-f", "null", "-"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
  return r.stderr;
};

export const parseSilences = (log, total) => {
  const starts = [...log.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  // Тишина до конца файла не имеет silence_end.
  return starts.map((s, i) => ({ start: Math.max(0, s), end: ends[i] ?? total }));
};

export const NEAR = 0.3; // выравнивание модели ошибается на 0,1–0,25 с: пауза «на знаке», если знак ближе, с

/** Вид тишины: рядом со знаком препинания (по выравниванию) или нет. Внутри слова выравнивание не различает надёжно. */
export const classify = (align, gap) => {
  const { characters: ch, character_start_times_seconds: st, character_end_times_seconds: en } = align;
  const mid = (gap.start + gap.end) / 2;
  if (mid < st[0] || mid > en.at(-1)) return { kind: "edge" };
  let best = null;
  ch.forEach((c, i) => {
    if (!PUNCT.has(c)) return;
    const d = mid < st[i] ? st[i] - mid : mid > en[i] ? mid - en[i] : 0;
    if (d <= NEAR && (!best || d < best.d)) best = { d, c };
  });
  if (best) return { kind: "punct", sentence: HARD.has(best.c), after: best.c };
  return { kind: "off", after: "" };
};

export const findGaps = (file, align) => {
  const total = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }));
  const first = align.character_start_times_seconds[0];
  const last = align.character_end_times_seconds.at(-1);
  const findings = [];
  const punct = [];
  for (const g of parseSilences(detectSilences(file), total)) {
    if (g.end <= first + 0.02 || g.start >= last - 0.02) continue; // до первого и после последнего слова
    const ms = Math.round((g.end - g.start) * 1000);
    const k = classify(align, g);
    const row = { at: Number(g.start.toFixed(3)), ms, ...k };
    if (k.kind === "punct") punct.push(row);
    else if (k.kind === "off" && ms > WORD_MAX_MS) findings.push(row);
  }
  return { findings, punct };
};

const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file, alignFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!file || !alignFile) throw new Error("Использование: node tools/vo-gaps.mjs <звук> <alignment.json> [--json]");
  const r = findGaps(file, JSON.parse(readFileSync(alignFile, "utf8")));
  if (process.argv.includes("--json")) console.log(JSON.stringify(r));
  else {
    console.log(`${file}: находок вне знаков ${r.findings.length}; пауз на знаках ${r.punct.length}`);
    for (const f of r.findings) console.log(`  РАЗРЫВ ${fmt(f.at)} ${f.ms} мс (${f.kind}, после «${f.after}»)`);
    for (const p of r.punct) console.log(`  знак  ${fmt(p.at)} ${p.ms} мс ${p.sentence ? "конец предложения" : "внутри предложения"} после «${p.after}»`);
  }
  process.exit(r.findings.length ? 1 : 0);
}
