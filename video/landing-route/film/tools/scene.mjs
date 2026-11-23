#!/usr/bin/env node
// Проверка, кадры и рендер ОДНОЙ сцены ролика (TASK-602): рабочий каталог work/scene-NN со своим index.html (старт 0).
//   node tools/scene.mjs N check|snapshot|render [аргументы hyperframes]
//   snapshot: --at 1,5,9 (секунды сцены) → snapshots/scene-NN/;  render → renders/scene-NN.mp4 (без звука сцены)
// Тяжёлое (snapshot, render) запускать только через ~/work/handoffs/customdev-unify/heavy-slot.sh.
import { execFileSync } from "node:child_process";
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [n, cmd, ...rest] = process.argv.slice(2);
if (!/^\d+$/.test(n || "") || !["check", "snapshot", "render"].includes(cmd)) { console.error("Использование: node tools/scene.mjs <N> <check|snapshot|render> [аргументы hyperframes]"); process.exit(1); }
const pad = String(n).padStart(2, "0");
const entry = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8")).find((s) => String(s.n) === String(Number(n)));
if (!entry) throw new Error(`Сцена ${pad} не найдена`);
const dir = `${root}/work/scene-${pad}`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(`${dir}/assets/vo`, { recursive: true }); mkdirSync(`${dir}/compositions`, { recursive: true });
for (const d of ["kit"]) cpSync(`${root}/${d}`, `${dir}/${d}`, { recursive: true, dereference: true }); // kit/kit.js — ссылка на общий файл обзорного ролика (лимит размера новых файлов)
for (const f of ["gsap.min.js"]) copyFileSync(`${root}/assets/${f}`, `${dir}/assets/${f}`);
cpSync(`${root}/assets/fonts`, `${dir}/assets/fonts`, { recursive: true });
cpSync(`${root}/assets/sketches`, `${dir}/assets/sketches`, { recursive: true });
cpSync(`${root}/assets/page`, `${dir}/assets/page`, { recursive: true });
// до озвучки mp3 нет (alignment — оценка по тексту, tools/estimate-align.mjs): сцена без звука
for (const f of [`scene-${pad}.mp3`, `scene-${pad}.alignment.js`]) if (existsSync(`${root}/assets/vo/${f}`)) copyFileSync(`${root}/assets/vo/${f}`, `${dir}/assets/vo/${f}`);
copyFileSync(`${root}/compositions/scene-${pad}.html`, `${dir}/compositions/scene-${pad}.html`);
for (const f of ["hyperframes.json", "terms.json"]) copyFileSync(`${root}/${f}`, `${dir}/${f}`);
writeFileSync(`${dir}/scenes.json`, JSON.stringify([entry]));
execFileSync("node", [`${root}/tools/build-index.mjs`, dir], { stdio: "inherit" });
const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_SKIP_SKILLS: "1" };
let extra = rest;
if (cmd === "snapshot" && !rest.includes("-o")) { mkdirSync(`${root}/snapshots`, { recursive: true }); extra = ["-o", `${root}/snapshots/scene-${pad}`, "--no-end", "--describe", "false", ...rest]; }
if (cmd === "render" && !rest.includes("-o") && !rest.includes("--output")) { mkdirSync(`${root}/renders`, { recursive: true }); extra = ["--output", `${root}/renders/scene-${pad}.mp4`, "-q", "standard", "-w", "1", ...rest]; }
// Нижняя граница контента 825 px из 1080 (плашка субтитров плеера): текст ниже — ошибка.
const SEEK = Array.from({ length: 40 }, (_, i) => ((i + 1) / 40).toFixed(3)).join(",");
if (cmd === "check" && !extra.includes("--caption-zone")) extra = [...extra, "--caption-zone", `x0=0;y0=${(825 / 1080).toFixed(4)};x1=1;y1=1;severity=error;seek=${SEEK}`];
if (cmd === "render" && !extra.includes("--video-frame-format")) extra = [...extra, "--video-frame-format", "png"];
try { execFileSync("npx", ["--yes", "hyperframes@0.8.172", cmd, ...extra, dir], { stdio: "inherit", env }); } catch (e) { process.exit(e.status || 1); }
