#!/usr/bin/env node
// Озвучка блоков фильма: один запрос ElevenLabs на блок, request stitching (правила озвучки course-video).
//   node tools/voice-p4.mjs <каталог-вывода> <id,id,…|all>  # p4: 0m, 0, 0b, 1–6
//   STORYBOARD=<путь к раскадровке> node tools/voice-p4.mjs …
//   node tools/voice-p4.mjs --selftest
// Голос, модель и скорость общие для всех блоков. Блок i получает previous_request_ids=[id блока i-1] (если тот озвучен
// в этом же запуске, иначе previous_text — хвост предыдущего блока) и next_text — начало следующего.
// Ключ и прокси берутся у `elevenlabs-key` и передаются curl через конфиг со stdin (не попадают в аргументы процесса).
// P4: 0m (карта, «0м»), 0 (интро), 0b («0б»), 1–5 (части), 6 (финал). Вывод: <каталог>/block-N.mp3, block-N.alignment.json, block-N.request-id.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VOICE = "zWSsRd3J6WyZFl12aGMB";
export const MODEL = "eleven_v4";
export const SPEED = 0.95; // П4: темп 0,95 по решению координатора (общий voice.mjs остаётся 0,85)

/** { "0": текст, "0b": текст, "1": …, "10": текст } из раскадровки (**N. Название** текст); «0б» в раскадровке — id «0b». */
export const parseBlocks = (md) => {
  const body = md.includes("## Оценка") ? md.slice(0, md.indexOf("## Оценка")) : md;
  return Object.fromEntries([...body.matchAll(/^\*\*(\d+[бм]?)\. [^*]+\*\* (.+)$/gm)].map((m) => [m[1].replace("б", "b").replace("м", "m"), m[2]]));
};
/** Порядок блоков в фильме: 0, 0b, 1, …, 10. */
export const blockOrder = (ids) => [...ids].sort((a, b) => parseFloat(a) + (a.endsWith("b") ? 0.5 : a.endsWith("m") ? -0.5 : 0) - (parseFloat(b) + (b.endsWith("b") ? 0.5 : b.endsWith("m") ? -0.5 : 0)));

/** Stitch only to the immediate neighbour in the complete film, never across omitted scenes. */
export const stitchingContext = (blocks, id, previousBlock, previousRequestId) => {
  const order = blockOrder(Object.keys(blocks)), at = order.indexOf(id);
  assert(at >= 0, `Неизвестный блок ${id}`);
  const previous = order[at - 1], next = blocks[order[at + 1]];
  return {
    ...(previousRequestId && previousBlock === previous
      ? { previous_request_ids: [previousRequestId] }
      : previous ? { previous_text: blocks[previous].slice(-400) } : {}),
    ...(next ? { next_text: next.slice(0, 400) } : {}),
  };
};

const key = (cmd) => spawnSync("elevenlabs-key", [cmd], { encoding: "utf8" }).stdout.trim();

const call = (body, tmp) => {
  const reqFile = join(tmp, "req.json"), outFile = join(tmp, "out.json"), hdrFile = join(tmp, "hdr.txt");
  writeFileSync(reqFile, JSON.stringify(body));
  // Прямой выход к прокси закрыт: при ELEVENLABS_PREPROXY (например socks5h://127.0.0.1:1280, xray) curl идёт к нему цепочкой.
  const pre = process.env.ELEVENLABS_PREPROXY ? `preproxy = "${process.env.ELEVENLABS_PREPROXY}"\n` : "";
  const cfg = `${pre}proxy = "${key("proxy")}"\nheader = "xi-api-key: ${key("get")}"\nheader = "Content-Type: application/json"\n`;
  const r = spawnSync("curl", ["-sS", "-K", "-", "-m", "300", "-D", hdrFile, "-o", outFile, "--data-binary", `@${reqFile}`, `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps`], { input: cfg, encoding: "utf8" });
  const headers = readFileSync(hdrFile, "utf8");
  const status = /^HTTP\/[\d.]+ (\d+)/m.exec(headers)?.[1];
  const text = readFileSync(outFile, "utf8");
  if (r.status !== 0 || status !== "200") throw new Error(`ElevenLabs ${status ?? "нет ответа"}: ${(r.stderr || text).slice(0, 300)}`);
  return { json: JSON.parse(text), requestId: /^request-id: (\S+)/im.exec(headers)?.[1] };
};

if (process.argv[2] === "--selftest") {
  const b = parseBlocks("# x\n\n## Текст диктора\n\n**0м. Карта** Карта.\n**0. Интро** Один. Два.\n**0б. Ещё** Ноль б.\n**10. Финал** Три.\n\n## Оценка\n**3. Нет** Не блок.\n");
  assert.deepEqual(b, { "0m": "Карта.", 0: "Один. Два.", "0b": "Ноль б.", 10: "Три." });
  assert.deepEqual(blockOrder(["10", "1", "0b", "0", "0m"]), ["0m", "0", "0b", "1", "10"]);
  const neighbours = { 2: "Два.", 3: "Три.", 4: "Четыре.", 5: "Пять.", 6: "Шесть." };
  assert.deepEqual(stitchingContext(neighbours, "3", null, null), { previous_text: "Два.", next_text: "Четыре." });
  assert.deepEqual(stitchingContext(neighbours, "5", "3", "req-3"), { previous_text: "Четыре.", next_text: "Шесть." });
  assert.deepEqual(stitchingContext(neighbours, "5", "4", "req-4"), { previous_request_ids: ["req-4"], next_text: "Шесть." });
  assert.deepEqual(stitchingContext(neighbours, "5", "4", null), { previous_text: "Четыре.", next_text: "Шесть." });
  assert.throws(() => stitchingContext(neighbours, "99", null, null), /Неизвестный блок/);
  console.log("voice: ok (parse/order + 5 stitching checks; no API)");
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [outDir, which] = process.argv.slice(2);
  if (!outDir || !which) throw new Error("Использование: node tools/voice-p4.mjs <каталог> <id,id|all>");
  const blocks = parseBlocks(readFileSync(process.env.STORYBOARD ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../storyboard.md"), "utf8"));
  const ids = which === "all" ? blockOrder(Object.keys(blocks)) : which.split(",");
  assert(ids.length > 0 && new Set(ids).size === ids.length, "Нужны неповторяющиеся ID блоков");
  ids.forEach((id) => assert(Object.hasOwn(blocks, id), `Неизвестный блок ${id}`));
  mkdirSync(outDir, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), "voice-"));
  try {
    let prevId = null, previousBlock = null;
    for (const id of ids) {
      const context = stitchingContext(blocks, id, previousBlock, prevId);
      const body = { text: blocks[id], model_id: MODEL, language_code: "ru", voice_settings: { speed: SPEED }, ...context };
      const { json, requestId } = call(body, tmp);
      writeFileSync(join(outDir, `block-${id}.mp3`), Buffer.from(json.audio_base64, "base64"));
      writeFileSync(join(outDir, `block-${id}.alignment.json`), JSON.stringify(json.alignment));
      writeFileSync(join(outDir, `block-${id}.request-id`), `${requestId}\n`);
      console.log(`блок ${id}: ${blocks[id].length} зн., request-id ${requestId}${context.previous_request_ids ? " (после " + prevId.slice(0, 8) + ")" : ""}`);
      prevId = requestId ?? null;
      previousBlock = id;
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
