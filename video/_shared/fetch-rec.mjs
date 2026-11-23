#!/usr/bin/env node
// Скачивает записи экрана ролика по адресу из манифеста по rec-manifest.json в film/assets/rec (sha256 сверяется, готовые файлы пропускаются).
//   node video/_shared/fetch-rec.mjs block-0
// Файлы из списка "missing" не опубликованы: это производные (*.v3.*), их строят скрипты derive-*.sh и retime-*.py из исходников.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const video = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const film = process.argv[2];
if (!film) throw new Error("Использование: node video/_shared/fetch-rec.mjs block-0");
const { files, missing } = JSON.parse(readFileSync(`${video}/${film}/rec-manifest.json`, "utf8"));
for (const f of files) {
  const dest = `${video}/${film}/${f.path}`;
  if (existsSync(dest) && createHash("sha256").update(readFileSync(dest)).digest("hex") === f.sha256) continue;
  if (!f.url) { console.log(`не опубликовано, запись у автора: ${f.path}`); continue; }
  mkdirSync(dirname(dest), { recursive: true });
  const response = await fetch(f.url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${f.path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== f.sha256) throw new Error(`sha256 не совпал: ${f.path}`);
  writeFileSync(dest, bytes);
  console.log(`скачано ${f.path}`);
}
if (missing.length) console.log(`не опубликованы (строятся скриптами): ${missing.map((m) => m.path.split("/").pop()).join(", ")}`);
