#!/usr/bin/env node
// Проверки готового фильма без прослушивания и без россыпи кадров.
//   node tools/check-film.mjs [renders/block-i4.mp4]
// Печатает: длительность, громкость (ebur128), тишины длиннее 0,6 с (хвосты сцен), сверку речи с текстом (whisper по словам)
// и пишет renders/check/title-sheet.png (кадры заставок частей и перекрёстного перехода) и renders/check/edges.png (первый/последний кадры).
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blockOrder, parseBlocks } from "./voice.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = resolve(process.argv[2] ?? `${root}/renders/block-i4.mp4`);
const out = `${root}/renders/check`;
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const ff = (...a) => spawnSync("ffmpeg", ["-v", "info", ...a], { encoding: "utf8" }).stderr;

const total = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }));
console.log(`длительность ${total.toFixed(2)} с (${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, "0")})`);

const loud = ff("-i", file, "-af", "ebur128=peak=true", "-f", "null", "-");
console.log(`громкость: ${/I:\s+(-?[\d.]+) LUFS/g.exec(loud.slice(loud.lastIndexOf("Summary")))?.[1] ?? "?"} LUFS, пик ${/Peak:\s+(-?[\d.]+) dBFS/.exec(loud.slice(loud.lastIndexOf("Summary")))?.[1] ?? "?"} dBFS`);

const sil = ff("-i", file, "-af", "silencedetect=noise=-50dB:d=0.6", "-f", "null", "-");
const starts = [...sil.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Number(m[1]));
const ends = [...sil.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
console.log(`тишины ≥0,6 с (${starts.length}): ${starts.map((s, i) => `${s.toFixed(1)}+${(ends[i]?.[1] ?? total - s).toFixed(1)}`).join(", ")}`);

const wav = `${out}/film.wav`;
ff("-y", "-i", file, "-ar", "16000", "-ac", "1", wav);
const asr = spawnSync("whisper-cli", ["-m", `${homedir()}/.cache/whisper/ggml-large-v3-turbo.bin`, "-l", "ru", "-f", wav, "-nt", "-np", "-bs", "5"], { encoding: "utf8" }).stdout;
const words = (s) => s.toLowerCase().replaceAll("ё", "е").match(/[а-я0-9]+/g) ?? [];
const blocks = parseBlocks(readFileSync(`${root}/../storyboard.md`, "utf8"));
const ref = words(blockOrder(Object.keys(blocks)).map((k) => blocks[k]).join(" "));
const got = words(asr);
// LCS по словам (динамика по строкам: тексты ~700 слов)
const dp = Array.from({ length: ref.length + 1 }, () => new Uint16Array(got.length + 1));
for (let i = 1; i <= ref.length; i += 1) for (let j = 1; j <= got.length; j += 1) dp[i][j] = ref[i - 1] === got[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
console.log(`речь против текста: совпало слов ${dp[ref.length][got.length]} из ${ref.length} (распознано ${got.length}); цифры вместо слов и усечённые хвосты — известные расхождения whisper`);

// Кадры: заставки частей (0,5 с и 1,85 с после начала части) и края фильма.
const starts0 = [];
let t0 = 0;
for (const s of manifest) { if (s.overlay) { starts0.push(t0); continue; } t0 += s.duration; }
const frames = starts0.flatMap((t) => [t + 0.5, t + 1.85]);
const tile = (name, times, cols) => {
  const args = times.flatMap((t) => ["-ss", t.toFixed(2), "-i", file]);
  const sel = times.map((_, i) => `[${i}:v]scale=480:-1[f${i}]`).join(";");
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args, "-filter_complex", `${sel};${times.map((_, i) => `[f${i}]`).join("")}xstack=inputs=${times.length}:layout=${times.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join("|")}[v]`, "-map", "[v]", "-frames:v", "1", `${out}/${name}`]);
};
tile("title-sheet.png", frames, 4);
tile("edges.png", [0.1, 0.3, 1, total - 2.2, total - 1, total - 0.1], 3);
console.log(`кадры: ${out}/title-sheet.png (${starts0.length} заставок × 2 кадра), ${out}/edges.png`);
