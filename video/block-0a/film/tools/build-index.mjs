#!/usr/bin/env node
// Генерирует корневую композицию по scenes.json.
//   node tools/build-index.mjs                       -> index.html со всеми сценами
//   node tools/build-index.mjs --only 3 --out work/scene-03/index.html   -> одна сцена (для check/snapshot/render)
// Заставка tN (kind: "title") собирается tools/build-titles.mjs в compositions/scene-tN.html, озвучки нет.
// Сцена N подключается как compositions/scene-NN.html; data-start = сумма длительностей предыдущих сцен.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const only = opt("--only") || null;   // "3" или "t3" (id заставки)
const out = resolve(opt("--out") || `${root}/index.html`);
const pad = (n) => String(n).padStart(2, "0");
const fid = (s) => s.id || pad(s.n);   // у сцен id = NN, у заставок (kind: "title") id = tN

const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const terms = JSON.parse(readFileSync(`${root}/terms.json`, "utf8"));
let start = 0;
// Заставка-наложение (overlay: true) стоит в списке перед своей сценой, начинается вместе с ней и времени не добавляет.
const placed = manifest.map((s) => { const p = { ...s, start }; if (!s.overlay) start += s.duration; return p; });
const list = only == null ? placed : placed.filter((s) => fid(s) === (/^\d+$/.test(only) ? pad(only) : only)).map((s) => ({ ...s, start: 0 }));
if (!list.length) { console.error("Сцена не найдена в scenes.json"); process.exit(1); }
const total = list.reduce((a, s) => a + (s.overlay && only == null ? 0 : s.duration), 0);

const active = list.filter((s) => {
  if (!s.planned || existsSync(`${root}/compositions/scene-${fid(s)}.html`)) return true;
  if (only) throw new Error(`Сцена ${fid(s)} пока запланирована, композиции нет`);
  console.warn(`Сцена ${fid(s)} запланирована: ${s.duration} с зарезервировано без композиции`);
  return false;
});

for (const s of active) {
  const f = `${root}/compositions/scene-${fid(s)}.html`;
  if (!existsSync(f)) { console.error(`Нет файла ${f}${s.kind === "title" ? " (node tools/build-titles.mjs)" : ""}`); process.exit(1); }
  if (s.audio && s.kind !== "title" && !existsSync(`${root}/assets/vo/scene-${fid(s)}.alignment.js`)) { console.error(`Нет assets/vo/scene-${fid(s)}.alignment.js (node tools/json2js.mjs align ...)`); process.exit(1); }
}

const html = `<!doctype html>
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <link rel="stylesheet" href="kit/tokens.css" />
    <link rel="stylesheet" href="kit/components.css" />
    <link rel="stylesheet" href="kit/sketch.css" />
    <script src="assets/gsap.min.js"></script>
${active.filter((s) => s.audio && s.kind !== "title").map((s) => `    <script src="assets/vo/scene-${fid(s)}.alignment.js"></script>`).join("\n")}
${manifest.some((s) => s.header) ? `    <script>window.KIT_SCENES = ${JSON.stringify(Object.fromEntries(manifest.map((s) => [fid(s), s]))).replace(/</g, "\\u003c")};</script>\n` : ""}    <script>window.KIT_TERMS = ${JSON.stringify(terms)};</script>
    <script src="kit/kit.js"></script>
    <script src="kit/sketches.js"></script>
    <script src="kit/sketch.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--k-bg); }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--k-bg); }
      #bg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
      #grid { position: absolute; left: -128px; top: -128px; width: 2176px; height: 1336px; background-image: linear-gradient(var(--k-grid) 1px, transparent 1px), linear-gradient(90deg, var(--k-grid) 1px, transparent 1px); background-size: 64px 64px; }
      #glow { position: absolute; left: 1100px; top: -380px; width: 1100px; height: 1100px; border-radius: 50%; background: radial-gradient(closest-side, var(--k-glow), transparent); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
      <div id="bg"><div id="grid"></div><div id="glow"></div></div>
${[...active.filter((s) => !s.overlay), ...active.filter((s) => s.overlay)].map((s, i) => `      <div id="scene-${fid(s)}" class="clip" data-composition-id="scene-${fid(s)}" data-composition-src="compositions/scene-${fid(s)}.html" data-start="${s.start}" data-duration="${s.duration}" data-track-index="${i + 1}"${s.overlay ? ' style="z-index:55"' : ""}></div>${s.audio ? `
      <audio id="vo-${fid(s)}" src="${s.audio}" data-start="${s.start}" data-duration="${s.audioDuration}" data-track-index="${list.length + i + 1}" data-volume="1"></audio>` : ""}`).join("\n")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#grid", { x: 0, y: 0 }, { x: -64, y: -64, duration: ${total}, ease: "none" }, 0);
      tl.fromTo("#glow", { x: 0, y: 0 }, { x: -120, y: 80, duration: ${total}, ease: "none" }, 0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log("записан", out, `(${list.length} сцен, ${total} с)`);
