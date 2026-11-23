#!/usr/bin/env node
// Раскладывает озвучку блоков (assets/vo-v3/block-N.*) по сценам и пересобирает scenes.json.
//   node tools/build-vo.mjs <id,id>   # TASK-685: только выбранные блоки (сейчас 3,5); остальные active-файлы и записи scenes.json сохраняются по значению
// Блоки: 0, 0b (как меняется процесс), 1–5 (части), 6 (финал). Блок N → assets/vo/scene-N.mp3, scene-N.alignment.json и scene-NN.alignment.js (id сцены NN).
// Длительность сцены = звук + хвост (TAIL); заставки частей — наложение TITLE секунд на начало сцены (overlay).
import { parseBlocks } from "./voice-p4.mjs";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TITLE = 2; // заставка части поверх первой фразы
export const TAIL = { "0m": 1.5, 0: 1.5, "0b": 1.5, 3: 2.2, 5: 1.8, 6: 3 }; // хвост после речи, с; у частей TAIL_PART
// 3: 2.2 — последняя реплика части 3 (9 слов) обрезается заставкой t4 (tail) и должна держаться ≥ 9/3 + 1 = 4 с.
export const TAIL_PART = 2;

// R2: одобренный план двух tail-заставок (t2/t4 ложатся на тихий хвост предыдущей сцены).
// Конфиг обязан существовать и совпадать с нативными фактами; иначе STOP до любых записей.
const PLAN_FILE = `${root}/tools/vo-tail-plan.json`;
const fail = (msg) => { throw new Error(`build-vo: ${msg}; активные файлы не изменены`); };
const finite = (value, field) => {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${field}: требуется конечное число (number)`);
  return value;
};
const plan = JSON.parse(readFileSync(PLAN_FILE, "utf8"));
if (plan.format !== 1) fail("vo-tail-plan.json: неизвестный format");
// TASK-685: исторический литерал 221,5 убран; filmSeconds берётся из принятого плана и сверяется с картой ниже.
if (TITLE !== plan.titleDurationSeconds) fail("vo-tail-plan.json: titleDurationSeconds != 2");
if (!plan.clock || !(plan.clock.indexDurationRoundingSeconds > 0) || !(plan.clock.oneDecodedSampleSeconds > 0)) fail("vo-tail-plan.json: clock guard отсутствует");
// Required static facts must never pass comparisons as undefined, NaN or numeric strings.
for (const field of ["filmSeconds", "titleDurationSeconds", "cueCount"]) finite(plan[field], field);
for (const field of ["indexDurationRoundingSeconds", "oneDecodedSampleSeconds"]) finite(plan.clock?.[field], `clock.${field}`);
if (!Array.isArray(plan.chaptersVoiceStarts) || plan.chaptersVoiceStarts.length !== 2) fail("chaptersVoiceStarts: требуются две границы");
plan.chaptersVoiceStarts.forEach((value, i) => finite(value, `chaptersVoiceStarts[${i}]`));
if (!Array.isArray(plan.tails) || plan.tails.length !== 2) fail("tails: требуются два плана");
for (const [i, tail] of plan.tails.entries()) {
  for (const field of ["of", "visualStart", "visualEnd", "previousSceneStart", "previousIndexAudioDataDuration", "previousHtmlAudioDuration", "previousDecodedDuration", "previousAlignmentSpokenEnd", "previousConservativeEnd", "previousReadDeadline"]) finite(tail?.[field], `tails[${i}].${field}`);
  for (const field of ["originalStart", "originalEnd", "trimmedEnd", "wordCount", "neededSeconds", "availableSeconds"]) finite(tail.previousCue?.[field], `tails[${i}].previousCue.${field}`);
}
const TAIL_OF = (plan.tails || []).map((t) => t.of);
if (TAIL_OF.length !== 2 || TAIL_OF.slice().sort((a, b) => a - b).join(",") !== "2,4") fail("vo-tail-plan.json: tail-титры должны быть ровно of=2 и of=4");
// Выбранные блоки: явный список, без «all». Остальные active-аудио, alignment и записи scenes.json не трогаются.
const SELECTED = (process.argv[2] ?? "").split(",").filter(Boolean);
const BLOCKS = ["0m", "0", "0b", "1", "2", "3", "4", "5", "6"];
if (!SELECTED.length || new Set(SELECTED).size !== SELECTED.length || SELECTED.some((id) => !BLOCKS.includes(id) || id === "0m")) fail("нужен явный список блоков, например 3,5 (0m и all не допускаются)");
const HEADER = { mode: "parts", total: 5 };
const meta = {};
const CH = { 1: "Пять понятий", 2: "Как устроен", 3: "Store шаг за шагом", 4: "Версия кода", 5: "Контракт и запросы изменения", 6: "Что дальше" };
for (const n of [1, 2, 3, 4, 5, 6]) meta[n] = { n, chapter: CH[n], step: n <= 5 ? n : null, title: CH[n] };
meta[0] = { n: 0, chapter: "Зачем это нужно", step: null, title: "Зачем это нужно" };
meta["0b"] = { n: "0b", chapter: "Как меняется процесс", step: null, title: "Как меняется процесс" };
meta["0m"] = { ...meta[0], n: "0m", title: "Карта маршрута" }; // карта курса перед вступлением: глава та же, что у вступления

// Check every block before creating directories or replacing any active media/metadata.
// A partial/interrupted TTS run leaves old blocks in vo-v3; those must keep production pending.
const narration = parseBlocks(readFileSync(`${root}/../storyboard.md`, "utf8"));
const prepared = ["0m", 0, "0b", ...Array.from({ length: 6 }, (_, i) => i + 1)].map((n) => {
  const align = JSON.parse(readFileSync(`${root}/assets/vo-v3/block-${n}.alignment.json`, "utf8"));
  if (typeof narration[n] !== "string" || !narration[n] || !Array.isArray(align.characters) || align.characters.join("") !== narration[n]) {
    throw new Error(`build-vo: alignment блока ${n} не совпадает с утверждённым storyboard; активные файлы не изменены`);
  }
  return { n, align };
});

// W3b (TASK-685): блок 0м не переозвучивался. Активный scene-0m.mp3 — та же запись, выровненная по громкости
// (scripts/vo-levels.ts), поэтому его байты отличаются от vo-v3 block-0m.mp3. Сборка его не перезаписывает
// и останавливается ДО первого каталога/файла, если его нет. Остальные блоки (0, 0б, 1–6) переозвучены и заменяются.
const KEEP_ACTIVE = new Set(["0m"]);
for (const n of KEEP_ACTIVE) {
  if (!existsSync(`${root}/assets/vo/scene-${n}.mp3`)) fail(`нет активного scene-${n}.mp3: блок ${n} не переозвучивается, подмена запрещена`);
}

// R2: длительности снимаются до любых записей (ffprobe только читает vo-v3).
// Выбранные блоки меряем по активному (выровненному по громкости) scene-N.mp3 — это реальный звук фильма; остальные — как в принятом плане.
const probed = prepared.map(({ n }) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", SELECTED.includes(String(n)) ? `${root}/assets/vo/scene-${n}.mp3` : `${root}/assets/vo-v3/block-${n}.mp3`], { encoding: "utf8" }).trim()));
if (probed.some((d) => !Number.isFinite(d) || d <= 0)) fail("ffprobe: неизвестная длительность озвучки");

// R2: план фильма строится и проверяется в памяти до любых записей.
const out = [];
const previousScenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const kept = (n) => {
  const old = previousScenes.find((s) => s.kind !== "title" && String(s.n) === String(n));
  if (!old || !Number.isFinite(old.duration) || !Number.isFinite(old.audioDuration)) fail(`scenes.json: нет принятой записи сцены ${n}`);
  return old;
};
prepared.forEach(({ n, align }, i) => {
  const audioDuration = SELECTED.includes(String(n)) ? probed[i] : kept(n).audioDuration;
  const m = meta[n];
  const duration = SELECTED.includes(String(n)) ? finite(Math.ceil((Math.max(audioDuration, align.character_end_times_seconds.at(-1)) + (TAIL[n] ?? TAIL_PART)) * 10) / 10, `block-${n}.duration`) : kept(n).duration;
  if (n >= 1 && n <= 5) {
    const title = { id: `t${n}`, kind: "title", of: n, overlay: true, duration: TITLE, chapter: m.chapter, step: n, title: m.title, audio: null, header: HEADER };
    if (TAIL_OF.includes(n)) title.tail = true;
    out.push(title);
  }
  out.push({ n, duration, chapter: m.chapter, step: m.step, title: m.title, audio: `assets/vo/scene-${n}.mp3`, header: HEADER, audioDuration: Number(audioDuration.toFixed(2)) });
});

// R2: fail-closed проверки двух tail-заставок (t2/t4). Любой дрейф = STOP до записей.
const tails = out.filter((s) => s.kind === "title" && s.tail === true);
if (tails.length !== 2 || tails.map((s) => s.id).join(",") !== "t2,t4") fail("в плане должны быть ровно два tail-титра t2,t4");
let cursor = 0;
const starts = new Map();
for (const s of out) {
  if (s.kind === "title") starts.set(s.id, s.overlay && s.tail ? cursor - s.duration : cursor);
  else { starts.set(String(s.n), cursor); cursor += s.duration; }
}
finite(cursor, "computedFilmSeconds");
if (Math.abs(cursor - plan.filmSeconds) > 1e-9) fail(`сумма сцен ${cursor} != ${plan.filmSeconds} с`);
for (const t of plan.tails) {
  const titleStart = starts.get(t.titleId);
  finite(titleStart, `${t.titleId}.titleStart`);
  const titleEnd = finite(titleStart + TITLE, `${t.titleId}.titleEnd`);
  const prevStart = finite(starts.get(t.previousBlock), `${t.titleId}.previousSceneStart`);
  const idx = prepared.findIndex((p) => String(p.n) === t.previousBlock);
  const alignEnd = finite(prepared[idx]?.align.character_end_times_seconds.at(-1), `${t.titleId}.alignmentSpokenEnd`);
  const probedSec = probed[idx];
  const indexDuration = Number(probedSec.toFixed(2));
  if (Math.abs(prevStart - t.previousSceneStart) > 1e-9) fail(`${t.titleId}: начало предыдущей сцены не совпадает с планом`);
  if (Math.abs(probedSec - t.previousHtmlAudioDuration) > plan.clock.indexDurationRoundingSeconds) fail(`${t.titleId}: дрейф clock ffprobe != HTML playback-zero`);
  if (Math.abs(t.previousHtmlAudioDuration - t.previousDecodedDuration) > plan.clock.oneDecodedSampleSeconds) fail(`${t.titleId}: HTML/decoded clock не сходятся в 1 сэмпл`);
  if (Math.abs(indexDuration - t.previousIndexAudioDataDuration) > 1e-9) fail(`${t.titleId}: дрейф data-duration`);
  if (Math.abs(alignEnd - t.previousAlignmentSpokenEnd) > 1e-6) fail(`${t.titleId}: дрейф конца озвучки`);
  const conservativeEnd = finite(prevStart + Math.max(probedSec, alignEnd, indexDuration), `${t.titleId}.conservativeEnd`);
  if (Math.abs(conservativeEnd - t.previousConservativeEnd) > 1e-6) fail(`${t.titleId}: консервативная граница ${conservativeEnd} != ${t.previousConservativeEnd}`);
  if (conservativeEnd > titleStart + 1e-9) fail(`${t.titleId}: озвучка предыдущей сцены не помещается до ${titleStart}`);
  if (t.previousReadDeadline > titleStart + 1e-9) fail(`${t.titleId}: дедлайн чтения ${t.previousReadDeadline} > ${titleStart}`);
  if (t.previousCue.trimmedEnd > titleStart + 1e-9) fail(`${t.titleId}: конец последней реплики ${t.previousCue.trimmedEnd} > ${titleStart}`);
  if (Math.abs(titleStart - t.visualStart) > 1e-9 || Math.abs(titleEnd - t.visualEnd) > 1e-9) fail(`${t.titleId}: визуальный интервал не совпадает с планом`);
}

mkdirSync(`${root}/assets/vo`, { recursive: true });
prepared.filter(({ n }) => SELECTED.includes(String(n))).forEach(({ n, align }) => {
  if (!existsSync(`${root}/assets/vo/scene-${n}.mp3`)) fail(`нет активного scene-${n}.mp3 (выровненный по громкости)`);
  writeFileSync(`${root}/assets/vo/scene-${n}.alignment.json`, JSON.stringify(align));
  execFileSync("node", [`${root}/tools/json2js.mjs`, "align", `${root}/assets/vo/scene-${n}.alignment.json`, String(n).padStart(2, "0")], { stdio: "inherit" });
});
writeFileSync(`${root}/scenes.json`, JSON.stringify(out, null, 2) + "\n");
console.log(`scenes.json: ${out.length} записей, ${out.filter((s) => !s.overlay).reduce((a, s) => a + s.duration, 0).toFixed(1)} с`);
