#!/usr/bin/env node
// Титульная карточка ролика: светлая «бумага» сайта, тёмные линии, акценты сайта. Она же первый кадр ролика и poster плеера.
//   node tools/build-poster.mjs               -> compositions/scene-poster.html из poster.json ({ kicker, title, lead?, sketch? })
//   node tools/build-poster.mjs --snapshot    -> то же + work/poster/ (один кадр t=0 через hyperframes snapshot)
// Карточка лежит оверлеем поверх начала ролика (build-index.mjs подключает её, если есть compositions/scene-poster.html), времени не добавляет:
// держится HOLD секунд, затем плавно растворяется в тёмную сцену.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const POSTER_DURATION = 2.6;
const HOLD = 1.9;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(`${root}/poster.json`, "utf8"));
for (const key of ["kicker", "title"]) if (typeof cfg[key] !== "string" || !cfg[key].trim()) throw new Error(`poster.json: нужно поле ${key}`);
// Встроенная зарисовка «маршрут» для роликов без своих скетчей: цепочка станций, последняя — акцент.
const ROUTE = (() => {
  const xs = [60, 190, 320, 450, 580, 710, 840], y = [380, 300, 340, 240, 280, 180, 140];
  const line = xs.map((x, i) => `${i ? "L" : "M"} ${x} ${y[i]}`).join(" ");
  const dots = xs.map((x, i) => `<circle cx="${x}" cy="${y[i]}" r="${i === xs.length - 1 ? 26 : 18}" stroke="${i === xs.length - 1 ? "#ff7a59" : "#eef0f3"}" stroke-width="4"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 480" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${line}" stroke="#a3a9b4" stroke-width="4" stroke-dasharray="2 14"/>${dots}<path d="M 40 440 L 880 440" stroke="#a3a9b4" stroke-width="3"/></svg>`;
})();
const J = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

// Палитра сайта (docs/pages/sdlc-development/catalog.html): paper #f4f1e8, ink #1f2d2a, muted #5f6863, line #d6d0c4, green #216650, amber #965b0d, blue #3f6f88; литералы, не переменные: у корня сцены переменные не наследуются.
const html = `<template id="scene-poster-template">
  <div data-composition-id="scene-poster" data-width="1920" data-height="1080" data-duration="${POSTER_DURATION}">
    <style>
      [data-composition-id="scene-poster"] .p-card { position: absolute; inset: 0; background: #f4f1e8; overflow: hidden; }
      [data-composition-id="scene-poster"] .p-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(31, 45, 42, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(31, 45, 42, 0.05) 1px, transparent 1px); background-size: 64px 64px; }
      [data-composition-id="scene-poster"] .p-frame { position: absolute; left: 64px; top: 64px; width: 1792px; height: 952px; border: 2px solid #d6d0c4; border-radius: 36px; background: rgba(255, 253, 248, 0.72); }
      [data-composition-id="scene-poster"] .p-kicker { position: absolute; left: 128px; top: 150px; width: 840px; font-size: 34px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #216650; }
      [data-composition-id="scene-poster"] .p-rule { position: absolute; left: 128px; top: 214px; width: 120px; height: 6px; border-radius: 3px; background: #965b0d; }
      [data-composition-id="scene-poster"] .p-title { position: absolute; left: 128px; top: 290px; width: 860px; font-size: 92px; font-weight: 800; line-height: 1.08; letter-spacing: -0.02em; color: #1f2d2a; text-wrap: balance; }
      [data-composition-id="scene-poster"] .p-lead { position: absolute; left: 128px; width: 820px; font-size: 40px; line-height: 1.3; color: #5f6863; }
      [data-composition-id="scene-poster"] .p-brand { position: absolute; left: 128px; top: 900px; display: flex; align-items: center; gap: 14px; font-size: 32px; font-weight: 700; color: #5f6863; }
      [data-composition-id="scene-poster"] .p-brand i { display: block; width: 18px; height: 18px; border-radius: 50%; background: #216650; }
      [data-composition-id="scene-poster"] .p-sketch { position: absolute; left: 1000px; top: 270px; width: 780px; }
      [data-composition-id="scene-poster"] .p-sketch svg { display: block; width: 100%; height: auto; overflow: visible; }
      [data-composition-id="scene-poster"] .p-sketch [stroke="#eef0f3"] { stroke: #1f2d2a; }
      [data-composition-id="scene-poster"] .p-sketch [stroke="#a3a9b4"], [data-composition-id="scene-poster"] .p-sketch [stroke="#8e96a3"] { stroke: #8a938d; }
      [data-composition-id="scene-poster"] .p-sketch [stroke="#3ccf91"] { stroke: #216650; }
      [data-composition-id="scene-poster"] .p-sketch [stroke="#ff7a59"] { stroke: #965b0d; }
      [data-composition-id="scene-poster"] .p-sketch [stroke="#7cc4ff"] { stroke: #3f6f88; }
    </style>
    <script>
      (function () {
        window.ALIGN = window.ALIGN || {};
        window.ALIGN.poster = { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] };
        const S = Kit.scene("poster");
        const el = (cls, text) => { const d = document.createElement("div"); d.className = cls; if (text != null) d.textContent = text; S.root.appendChild(d); return d; };
        const card = el("p-card");
        card.appendChild(Object.assign(document.createElement("div"), { className: "p-grid" }));
        card.appendChild(Object.assign(document.createElement("div"), { className: "p-frame" }));
        const parts = [card];
        el("p-kicker", ${J(cfg.kicker)}); el("p-rule");
        el("p-title", ${J(cfg.title)});
        ${cfg.lead ? `const lead = el("p-lead", ${J(cfg.lead)}); lead.style.top = "640px";` : ""}
        const brand = el("p-brand"); brand.innerHTML = "<i></i>Custom Dev";
        ${cfg.sketch ? `const sk = el("p-sketch"); sk.innerHTML = ${cfg.sketch === "route" ? J(ROUTE) : `(window.SKETCHES || {})[${J(cfg.sketch)}] || ""`}; if (!sk.innerHTML) throw new Error("scene-poster: нет скетча ${cfg.sketch}");` : ""}
        /* статичная карточка с первого кадра; затем плавное растворение в тёмную сцену */
        const all = [...S.root.children];
        S.tl.to(all, { autoAlpha: 0, duration: ${(POSTER_DURATION - HOLD).toFixed(2)}, ease: "power2.inOut" }, ${HOLD});
        S.finish(${POSTER_DURATION});
      })();
    </script>
  </div>
</template>
`;
mkdirSync(`${root}/compositions`, { recursive: true });
writeFileSync(`${root}/compositions/scene-poster.html`, html);
console.log("записана compositions/scene-poster.html");

if (process.argv.includes("--snapshot")) {
  const dir = `${root}/work/poster`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const d of ["kit", "compositions"]) cpSync(`${root}/${d}`, `${dir}/${d}`, { recursive: true, filter: (src) => !/\/compositions\/scene-(?!poster)/.test(src) });
  mkdirSync(`${dir}/assets`, { recursive: true });
  cpSync(`${root}/assets/fonts`, `${dir}/assets/fonts`, { recursive: true });
  copyFileSync(`${root}/assets/gsap.min.js`, `${dir}/assets/gsap.min.js`);
  for (const f of ["hyperframes.json", "meta.json"]) copyFileSync(`${root}/${f}`, `${dir}/${f}`);
  writeFileSync(`${dir}/index.html`, `<!doctype html>
<html lang="ru" data-resolution="landscape"><head><meta charset="UTF-8" /><meta name="viewport" content="width=1920, height=1080" />
<link rel="stylesheet" href="kit/tokens.css" /><link rel="stylesheet" href="kit/components.css" /><link rel="stylesheet" href="kit/sketch.css" />
<script src="assets/gsap.min.js"></script><script>window.KIT_TERMS = {};</script><script src="kit/kit.js"></script><script src="kit/sketches.js"></script><script src="kit/sketch.js"></script>
<style>* { margin: 0; padding: 0; box-sizing: border-box; } html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--k-bg); } #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--k-bg); }</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="${POSTER_DURATION}" data-width="1920" data-height="1080">
<div id="scene-poster" class="clip" data-composition-id="scene-poster" data-composition-src="compositions/scene-poster.html" data-start="0" data-duration="${POSTER_DURATION}" data-track-index="1"></div></div>
<script>window.__timelines = window.__timelines || {}; const tl = gsap.timeline({ paused: true }); tl.to({}, { duration: ${POSTER_DURATION} }, 0); window.__timelines["main"] = tl;</script></body></html>
`);
  const hf = ["--yes", "hyperframes@0.8.164", "snapshot", "--at", "0,2.3", "-o", `${root}/snapshots/poster`];
  mkdirSync(`${root}/snapshots`, { recursive: true });
  execFileSync("npx", hf, { cwd: dir, stdio: "inherit", env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_SKIP_SKILLS: "1" } });
}
