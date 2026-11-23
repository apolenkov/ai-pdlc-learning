#!/usr/bin/env node
// Явно выбранные блоки: node tools/voice.mjs <каталог> <id,id,…> (пилот: 5).
// STORYBOARD=<путь> переопределяет раскадровку. Ключ/прокси — только stdin curl.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VOICE = "zWSsRd3J6WyZFl12aGMB";
export const MODEL = "eleven_v4";
export const SPEED = 0.85;
const defaultStoryboard = resolve(dirname(fileURLToPath(import.meta.url)), "../../storyboard.md");
const normalizeId = (id) => id.replace("б", "b").replace("м", "m");
const validId = (id) => /^(?:0[bm]|0|[1-9]\d*)$/.test(id);

export const parseBlocks = (md) => {
  const body = md.includes("## Оценка") ? md.slice(0, md.indexOf("## Оценка")) : md;
  const blocks = {};
  for (const match of body.matchAll(/^\*\*(\d+[бмbm]?)\. [^*]+\*\* (.*)$/gm)) {
    const id = normalizeId(match[1]);
    if (!validId(id) || Object.hasOwn(blocks, id) || !match[2].trim()) throw new Error(`Некорректный или повторный блок storyboard: ${id}`);
    blocks[id] = match[2];
  }
  return blocks;
};

export const blockOrder = (ids) => [...ids].sort((a, b) => parseFloat(a) + (a.endsWith("b") ? 0.5 : a.endsWith("m") ? -0.5 : 0) - (parseFloat(b) + (b.endsWith("b") ? 0.5 : b.endsWith("m") ? -0.5 : 0)));

/** Пустой выбор и all не являются разрешением на генерацию всего фильма. */
export const selectIds = (selectedIds, knownIds) => {
  const values = typeof selectedIds === "string" ? selectedIds.split(",") : selectedIds;
  if (!Array.isArray(values) || !values.length) throw new Error("Нужны явно выбранные ID блоков, не all");
  const seen = new Set();
  return values.map((value) => {
    if (typeof value !== "string") throw new Error("ID блока должен быть строкой");
    const id = normalizeId(value);
    if (!validId(id) || !knownIds.includes(id)) throw new Error(`Неизвестный или некорректный выбранный ID: ${value}`);
    if (seen.has(id)) throw new Error(`Повторный выбранный ID: ${id}`);
    seen.add(id);
    return id;
  });
};

export const requestBody = (blocks, id, previousGenerated = null) => {
  const order = blockOrder(Object.keys(blocks));
  const [selected] = selectIds([id], order);
  const at = order.indexOf(selected);
  const previousId = order[at - 1], nextId = order[at + 1];
  const body = { text: blocks[selected], model_id: MODEL, language_code: "ru", voice_settings: { speed: SPEED } };
  if (previousId && previousGenerated?.id === previousId && previousGenerated.requestId) body.previous_request_ids = [previousGenerated.requestId];
  else if (previousId) body.previous_text = blocks[previousId].slice(-400);
  if (nextId) body.next_text = blocks[nextId].slice(0, 400);
  return body;
};

const key = (cmd) => {
  const result = spawnSync("elevenlabs-key", [cmd], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout?.trim()) throw new Error("elevenlabs-key: не удалось получить настройку");
  return result.stdout.trim();
};

const call = (body, tmp) => {
  const reqFile = join(tmp, "req.json"), outFile = join(tmp, "out.json"), hdrFile = join(tmp, "hdr.txt");
  writeFileSync(reqFile, JSON.stringify(body));
  const pre = process.env.ELEVENLABS_PREPROXY ? `preproxy = "${process.env.ELEVENLABS_PREPROXY}"\n` : "";
  const cfg = `${pre}proxy = "${key("proxy")}"\nheader = "xi-api-key: ${key("get")}"\nheader = "Content-Type: application/json"\n`;
  const result = spawnSync("curl", ["-sS", "-K", "-", "-m", "300", "-D", hdrFile, "-o", outFile, "--data-binary", `@${reqFile}`, `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps`], { input: cfg, encoding: "utf8" });
  if (result.status !== 0) throw new Error("ElevenLabs: сбой curl");
  const headers = readFileSync(hdrFile, "utf8");
  // При proxy CONNECT последняя HTTP-строка относится к ответу API.
  const status = [...headers.matchAll(/^HTTP\/[\d.]+ (\d+)/gm)].at(-1)?.[1];
  if (status !== "200") throw new Error(`ElevenLabs: HTTP ${status ?? "нет ответа"}`);
  let json;
  try { json = JSON.parse(readFileSync(outFile, "utf8")); }
  catch { throw new Error("ElevenLabs: некорректный JSON"); }
  return { json, requestId: /^request-id: (\S+)/im.exec(headers)?.[1] };
};

/** Импорт не запускает API; request внедряется для offline-тестов. */
export const generateVoice = ({ outDir, selectedIds, storyboardPath = defaultStoryboard, request = call, log = console.log }) => {
  const blocks = parseBlocks(readFileSync(storyboardPath, "utf8"));
  const ids = selectIds(selectedIds, Object.keys(blocks));
  if (typeof outDir !== "string" || !outDir.trim()) throw new Error("Нужен каталог вывода");
  // Preflight всего набора до mkdir, ключа и первого запроса.
  const output = resolve(outDir);
  mkdirSync(output, { recursive: true });
  const tmp = mkdtempSync(join(output, ".voice-"));
  try {
    let previousGenerated = null;
    for (const id of ids) {
      const body = requestBody(blocks, id, previousGenerated);
      const { json, requestId } = request(body, tmp);
      if (!json?.audio_base64 || !json.alignment || typeof requestId !== "string" || !requestId.trim()) throw new Error(`Блок ${id}: неполный ответ TTS`);
      const audio = Buffer.from(json.audio_base64, "base64");
      if (!audio.length || !Array.isArray(json.alignment.characters) || json.alignment.characters.join("") !== blocks[id]) throw new Error(`Блок ${id}: звук или текст alignment не соответствует storyboard`);
      writeFileSync(join(output, `block-${id}.mp3`), audio);
      writeFileSync(join(output, `block-${id}.alignment.json`), JSON.stringify(json.alignment));
      writeFileSync(join(output, `block-${id}.request-id`), `${requestId}\n`);
      log(`блок ${id}: ${blocks[id].length} зн., request-id ${requestId}`);
      previousGenerated = { id, requestId };
    }
    return ids;
  } finally {
    // tmp — проверенный дочерний каталог output, созданный здесь mkdtempSync.
    if (dirname(tmp) !== output || !tmp.startsWith(join(output, ".voice-"))) throw new Error("Небезопасный путь временного каталога");
    rmSync(tmp, { recursive: true, force: true });
  }
};

export const selftest = () => {
  const blocks = parseBlocks("**0м. Карта** Карта.\n**0. Интро** Один. Два.\n**0б. Ещё** Ноль б.\n**10. Финал** Три.\n\n## Оценка\n**3. Нет** Не блок.\n");
  assert.deepEqual(blocks, { "0m": "Карта.", 0: "Один. Два.", "0b": "Ноль б.", 10: "Три." });
  assert.deepEqual(blockOrder(["10", "1", "0b", "0", "0m"]), ["0m", "0", "0b", "1", "10"]);
  console.log("voice: ok");
};

export const main = (args = process.argv.slice(2)) => {
  if (args.length === 1 && args[0] === "--selftest") return selftest();
  if (args.length !== 2) throw new Error("Использование: node tools/voice.mjs <каталог> <id,id,…>");
  return generateVoice({ outDir: args[0], selectedIds: args[1], storyboardPath: process.env.STORYBOARD ?? defaultStoryboard });
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
