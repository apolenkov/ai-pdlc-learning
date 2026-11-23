#!/usr/bin/env node
// Проверка и рендер ОДНОЙ сцены без правки общего index.html.
//   node tools/scene.mjs N check       (N = номер сцены или id заставки, например t3)
//   node tools/scene.mjs N snapshot [--at 2,6,12]        -> film/snapshots/scene-NN/
//   node tools/scene.mjs N render                        -> film/renders/scene-NN.mp4
// Создаёт film/work/scene-NN/ (index.html для одной сцены + копии assets, kit, compositions).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, cpSync, rmSync, copyFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [n, cmd, ...rest] = process.argv.slice(2);
const pad = /^\d+$/.test(n || "") ? String(n).padStart(2, "0") : n;
if (!/^((t)?\d+b?|0m)$/.test(n || "") || !["check", "snapshot", "render"].includes(cmd)) {
  console.error("Использование: node tools/scene.mjs <N> <check|snapshot|render> [аргументы hyperframes]");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const entry = manifest.find((s) => (s.id || String(s.n).padStart(2, "0")) === pad);
if (!entry) throw new Error(`Сцена ${pad} не найдена`);
const dir = `${root}/work/scene-${pad}`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
// Заставки используют только шрифты, GSAP и kit.
const lean = (src) => !/\/compositions\/scene-/.test(src) || src.includes(`/compositions/scene-${pad}.`);
const leanAssets = (src) => !/\/assets\/(rec|vo[^/]*)(\/|$)/.test(src);
for (const d of ["assets", "kit", "compositions"]) cpSync(`${root}/${d}`, `${dir}/${d}`, { recursive: true, filter: entry.kind === "title" ? (src) => lean(src) && leanAssets(src) : (src) => lean(src) });
for (const f of ["hyperframes.json", "meta.json"]) copyFileSync(`${root}/${f}`, `${dir}/${f}`);
execFileSync("node", [`${root}/tools/build-index.mjs`, "--only", n, "--out", `${dir}/index.html`], { stdio: "inherit" });

const hf = ["--yes", "hyperframes@0.8.145"];
const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_SKIP_SKILLS: "1" };
let extra = rest;
if (cmd === "snapshot" && !rest.includes("-o") && !rest.includes("--output")) { mkdirSync(`${root}/snapshots`, { recursive: true }); extra = ["-o", `${root}/snapshots/scene-${pad}`, ...rest]; }
if (cmd === "render" && !rest.includes("-o") && !rest.includes("--output")) { mkdirSync(`${root}/renders`, { recursive: true }); extra = ["--output", `${root}/renders/scene-${pad}.mp4`, ...rest]; }
// кадры записей экрана извлекаются в PNG (без JPEG-артефактов на тексте интерфейса)
if (cmd === "render" && !extra.includes("--video-frame-format")) extra = [...extra, "--video-frame-format", "png"];
// Нижняя граница контента: плашка субтитров начинается около y=867 (1080p), контент — не ниже 825 (550 в 720p).
// Встроенная проверка hyperframes --caption-zone: текст ниже границы — ошибка; субтитры помечены data-layout-allow-caption-zone.
export const SAFE_BOTTOM = 825;
const SEEK = Array.from({ length: 40 }, (_, i) => ((i + 1) / 40).toFixed(3)).join(",");
if (cmd === "check" && !extra.includes("--caption-zone")) extra = [...extra, "--caption-zone", `x0=0;y0=${(SAFE_BOTTOM / 1080).toFixed(4)};x1=1;y1=1;severity=error;seek=${SEEK}`];
// Рамки и фоны (не только текст) тоже не ниже SAFE_BOTTOM: на время check в каждый «ящик» (фон, рамка, обрезка) кладётся невидимый щуп
// (tools/bb-probe.js), и встроенная caption-zone-проверка ловит его вместе с текстом. Исключение — data-layout-allow-caption-zone.
if (cmd === "check") {
  copyFileSync(`${root}/tools/bb-probe.js`, `${dir}/bb-probe.js`);
  const idx = `${dir}/index.html`;
  writeFileSync(idx, readFileSync(idx, "utf8").replace("</body>", `<script src="bb-probe.js"></script></body>`));
}
// замок браузерной работы (check/snapshot/render): один Chromium за раз на всех сессиях ролика; мёртвый замок (>20 мин) снимается
const lock = `${root}/work/.snaplock`;
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
{
  for (;;) {
    try { mkdirSync(lock); break; } catch {
      if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs > 20 * 60 * 1000) rmSync(lock, { recursive: true, force: true });
      else sleep(3000);
    }
  }
}
try {
  execFileSync("nice", ["-n", "10", "npx", ...hf, cmd, ...extra, dir], { stdio: "inherit", env });
} catch (e) { process.exitCode = e.status || 1; } finally { rmSync(lock, { recursive: true, force: true }); }
