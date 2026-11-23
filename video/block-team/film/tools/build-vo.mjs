#!/usr/bin/env node
// Частичное продвижение принятой VO: node tools/build-vo.mjs <id,id,…> (пилот: 5).
// Невыбранные активные MP3/JSON/JS и записи scenes сохраняются; CH5 — новое название.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseBlocks, selectIds } from "./voice.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TITLE = 2;
export const TAIL = { "0m": 1.5, 0: 1.5, "0b": 1.5, 2: 1.6, 6: 3 };
export const TAIL_PART = 2;
export const CH = { 1: "Зачем нам такая картина", 2: "День команды по ролям", 3: "Один репозиторий или несколько", 4: "Как настроить GitLab", 5: "Три этапа, четыре запроса", 6: "Что дальше" };
export const BLOCK_IDS = ["0m", "0", "0b", "1", "2", "3", "4", "5", "6"];

export const probeDuration = (path) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], { encoding: "utf8" }).trim());

export const validateAlignment = (alignment, text, id) => {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment ?? {};
  if (![characters, starts, ends].every(Array.isArray) || !characters.length || characters.length !== starts.length || characters.length !== ends.length) throw new Error(`Блок ${id}: некорректные массивы alignment`);
  if (characters.some((char) => typeof char !== "string" || !char.length) || characters.join("") !== text) throw new Error(`Блок ${id}: текст alignment не равен storyboard`);
  let alignmentEnd = 0;
  for (let i = 0; i < characters.length; i++) {
    if (!Number.isFinite(starts[i]) || !Number.isFinite(ends[i]) || starts[i] < 0 || ends[i] < starts[i] || (i > 0 && (starts[i] < starts[i - 1] || ends[i] < ends[i - 1]))) throw new Error(`Блок ${id}: некорректные времена alignment`);
    alignmentEnd = Math.max(alignmentEnd, ends[i]);
  }
  if (alignmentEnd <= 0) throw new Error(`Блок ${id}: пустая длительность alignment`);
  return alignmentEnd;
};

export const sceneDuration = (audioDuration, alignmentEnd, id) => {
  if (![audioDuration, alignmentEnd].every((value) => Number.isFinite(value) && value > 0)) throw new Error(`Блок ${id}: длительность должна быть конечной и положительной`);
  const duration = Math.ceil((Math.max(audioDuration, alignmentEnd) + (TAIL[id] ?? TAIL_PART)) * 10) / 10;
  if (!Number.isFinite(duration)) throw new Error(`Блок ${id}: переполнение длительности`);
  return duration;
};

/** Дополнительное окно чтения не может сократить обязательный хвост. */
export const validateReadingHolds = (minDurations, ids, holdReason) => {
  if (!minDurations || typeof minDurations !== "object" || Array.isArray(minDurations)) throw new Error("minDurations: ожидается объект ID → секунды");
  const entries = Object.entries(minDurations);
  if (entries.length && (typeof holdReason !== "string" || !holdReason.trim())) throw new Error("Окну чтения нужна явная причина (--hold-reason)");
  for (const [id, value] of entries) {
    selectIds([id], ids);
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`Блок ${id}: минимум чтения должен быть конечным положительным числом`);
  }
  if (!entries.length && holdReason !== undefined) throw new Error("Причина окна чтения задана без --min-duration");
};

export const readingDuration = (formulaDuration, minimum, id) => {
  if (minimum === undefined) return formulaDuration;
  if (!Number.isFinite(minimum) || minimum < formulaDuration) throw new Error(`Блок ${id}: минимум чтения меньше длительности по формуле ${formulaDuration}`);
  const duration = Math.ceil(minimum * 10) / 10;
  if (!Number.isFinite(duration)) throw new Error(`Блок ${id}: переполнение окна чтения`);
  return duration;
};

/** Читает и проверяет ВЕСЬ выбранный набор, ничего не записывая. */
export const planBuildVo = ({ root = defaultRoot, selectedIds, storyboardPath = resolve(root, "../storyboard.md"), probe = probeDuration, minDurations = {}, holdReason }) => {
  const ids = selectIds(selectedIds, BLOCK_IDS);
  validateReadingHolds(minDurations, ids, holdReason);
  const blocks = parseBlocks(readFileSync(storyboardPath, "utf8"));
  const scenesPath = resolve(root, "scenes.json");
  const scenes = JSON.parse(readFileSync(scenesPath, "utf8"));
  if (!Array.isArray(scenes) || scenes.some((scene) => !scene || typeof scene !== "object" || Array.isArray(scene))) throw new Error("scenes.json: ожидается массив записей");
  const updates = ids.map((id) => {
    if (!Object.hasOwn(blocks, id)) throw new Error(`Блок ${id}: нет выбранного текста storyboard`);
    const matches = scenes.filter((scene) => !scene.overlay && scene.n !== undefined && String(scene.n) === id);
    if (matches.length !== 1) throw new Error(`Блок ${id}: нужна ровно одна выбранная сцена`);
    if (matches[0].audio !== `assets/vo/scene-${id}.mp3`) throw new Error(`Блок ${id}: неожиданный путь активного аудио`);
    const source = resolve(root, "assets/vo-v3", `block-${id}`);
    const alignmentBytes = readFileSync(`${source}.alignment.json`);
    const alignment = JSON.parse(alignmentBytes.toString("utf8"));
    const alignmentEnd = validateAlignment(alignment, blocks[id], id);
    const audioBytes = readFileSync(`${source}.mp3`);
    if (!audioBytes.length) throw new Error(`Блок ${id}: пустой MP3`);
    const audioDuration = probe(`${source}.mp3`);
    const formulaDuration = sceneDuration(audioDuration, alignmentEnd, id);
    const duration = readingDuration(formulaDuration, minDurations[id], id);
    const nn = id.padStart(2, "0");
    return {
      id, audioBytes, alignmentBytes, duration, formulaDuration,
      ...(minDurations[id] === undefined ? {} : { readingHold: { minimum: minDurations[id], reason: holdReason.trim() } }),
      audioDuration: Number(audioDuration.toFixed(2)),
      alignmentJs: `window.ALIGN = window.ALIGN || {};\nwindow.ALIGN[${JSON.stringify(nn)}] = ${JSON.stringify(alignment)};\n`,
    };
  });
  const byId = new Map(updates.map((update) => [update.id, update]));
  const nextScenes = scenes.map((scene) => {
    const update = !scene.overlay && scene.n !== undefined ? byId.get(String(scene.n)) : undefined;
    let next = update ? { ...scene, duration: update.duration, audioDuration: update.audioDuration } : scene;
    if ((!scene.overlay && String(scene.n) === "5") || scene.id === "t5") next = { ...next, chapter: CH[5], title: CH[5] };
    return next;
  });
  return { root: resolve(root), scenesPath, scenes: nextScenes, updates };
};

/** Импорт без побочных эффектов. Никакого чтения/перекопирования невыбранной VO. */
export const buildVo = (options) => {
  const plan = planBuildVo(options);
  const active = resolve(plan.root, "assets/vo");
  mkdirSync(active, { recursive: true });
  for (const update of plan.updates) {
    writeFileSync(resolve(active, `scene-${update.id}.mp3`), update.audioBytes);
    writeFileSync(resolve(active, `scene-${update.id}.alignment.json`), update.alignmentBytes);
    writeFileSync(resolve(active, `scene-${update.id.padStart(2, "0")}.alignment.js`), update.alignmentJs);
  }
  writeFileSync(plan.scenesPath, JSON.stringify(plan.scenes, null, 2) + "\n");
  return plan;
};

export const parseArgs = (args) => {
  const usage = "Использование: node tools/build-vo.mjs [--root <film>] [--min-duration 5=37 --hold-reason <причина>] <id,id,…>";
  let root = defaultRoot, selectedIds, hasRoot = false, holdReason;
  const minDurations = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--root") {
      if (hasRoot || !args[i + 1] || args[i + 1].startsWith("--")) throw new Error(usage);
      root = resolve(args[++i]);
      hasRoot = true;
    } else if (args[i] === "--min-duration") {
      const match = /^(0[bmбм]|0|[1-9]\d*)=(\d+(?:\.\d+)?)$/.exec(args[++i] ?? "");
      if (!match) throw new Error(usage);
      const [id] = selectIds([match[1]], BLOCK_IDS);
      if (Object.hasOwn(minDurations, id)) throw new Error(`Повторное окно чтения: ${id}`);
      minDurations[id] = Number(match[2]);
    } else if (args[i] === "--hold-reason") {
      if (holdReason !== undefined || !args[i + 1]?.trim() || args[i + 1].startsWith("--")) throw new Error(usage);
      holdReason = args[++i];
    } else {
      if (selectedIds !== undefined || args[i].startsWith("--")) throw new Error(usage);
      selectedIds = args[i];
    }
  }
  const ids = selectIds(selectedIds, BLOCK_IDS);
  validateReadingHolds(minDurations, ids, holdReason);
  return { root, selectedIds, ...(Object.keys(minDurations).length ? { minDurations, holdReason } : {}) };
};

export const main = (args = process.argv.slice(2)) => {
  const plan = buildVo(parseArgs(args));
  for (const update of plan.updates) if (update.readingHold) console.log(`окно чтения блока ${update.id}: ${update.formulaDuration} → ${update.duration} с; ${update.readingHold.reason}`);
  console.log(`scenes.json: выбраны ${plan.updates.map((update) => update.id).join(",")}, ${plan.scenes.length} записей, ${plan.scenes.filter((scene) => !scene.overlay).reduce((sum, scene) => sum + scene.duration, 0).toFixed(1)} с`);
  return plan;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
