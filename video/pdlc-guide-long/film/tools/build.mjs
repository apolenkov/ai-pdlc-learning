#!/usr/bin/env node
// Сборка «Подробно · гайд PDLC»: scenes.json (по длительности озвучки), compositions/scene-NN.html, index.html,
// kit/sketches.js, sfx.json, VTT (по предложениям), главы. Запуск: node tools/build.mjs (из film/).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SPEC } from "./spec.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "..");
const NAME = "pdlc-guide-long";
const TAIL = 0.35, LAST_TAIL = 1.0;
const nn = (n) => String(n).padStart(2, "0");
const r2 = (x) => Math.round(x * 100) / 100;
const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));

// --- scenes.json
const scenes = SPEC.map((s, i) => {
  const audioDuration = r2(dur(`${root}/assets/vo/scene-${nn(s.n)}.mp3`));
  const duration = Math.ceil((audioDuration + (i === SPEC.length - 1 ? LAST_TAIL : TAIL)) * 10) / 10;
  return { n: s.n, duration, chapter: s.title, title: s.title, audio: `assets/vo/scene-${nn(s.n)}.mp3`, audioDuration };
});
writeFileSync(`${root}/scenes.json`, JSON.stringify(scenes, null, 2) + "\n");
const starts = scenes.reduce((a, s) => (a.push(r2(a.at(-1) + s.duration)), a), [0]);
const total = starts.at(-1);

// --- время фразы в озвучке сцены (как Kit.timeOf)
const align = scenes.map((s) => JSON.parse(readFileSync(`${root}/assets/vo/scene-${nn(s.n)}.alignment.json`, "utf8")));
const T = (i, phrase) => {
  const a = align[i], text = a.characters.join("");
  let idx = text.indexOf(phrase);
  if (idx < 0) idx = norm(text).indexOf(norm(phrase));
  if (idx < 0) throw new Error(`сцена ${i + 1}: нет фразы «${phrase}»`);
  return a.character_start_times_seconds[idx];
};

// --- kit/sketches.js
const sk = readdirSync(`${root}/assets/sketches`).filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)).sort();
writeFileSync(`${root}/kit/sketches.js`, "/* ГЕНЕРИРУЕТСЯ: node tools/build.mjs из assets/sketches/*.svg. Руками не править. */\nwindow.SKETCHES = {\n" + sk.map((n) => `${JSON.stringify(n)}: ${JSON.stringify(readFileSync(`${root}/assets/sketches/${n}.svg`, "utf8").replace(/>\s+</g, "><").trim())}`).join(",\n") + "\n};\n");

// --- compositions
mkdirSync(`${root}/compositions`, { recursive: true });
SPEC.forEach((s, i) => {
  const { n, ...spec } = s;
  spec.steps.forEach(([ph]) => T(i, ph));
  spec.plates.forEach(([ph]) => T(i, ph));
  writeFileSync(`${root}/compositions/scene-${nn(n)}.html`, `<template id="scene-${nn(n)}-template">
  <div data-composition-id="scene-${nn(n)}" data-width="1920" data-height="1080" data-duration="${scenes[i].duration}">
    <script>
      (function () {
        const G = Guide.begin("${nn(n)}", ${JSON.stringify(spec)});
        G.fin();
      })();
    </script>
  </div>
</template>
`);
});

// --- index.html
const terms = [["пи-ди-эл-си", "PDLC"]];
writeFileSync(`${root}/terms.json`, JSON.stringify(terms, null, 1) + "\n");
const clips = scenes.map((s, i) => `      <div id="scene-${nn(s.n)}" class="clip" data-composition-id="scene-${nn(s.n)}" data-composition-src="compositions/scene-${nn(s.n)}.html" data-start="${starts[i]}" data-duration="${s.duration}" data-track-index="${i + 1}"></div>`);
const audios = scenes.map((s, i) => `      <audio id="vo-${nn(s.n)}" src="${s.audio}" data-start="${starts[i]}" data-duration="${s.audioDuration}" data-track-index="${scenes.length + i + 1}" data-volume="1"></audio>`);
writeFileSync(`${root}/index.html`, `<!doctype html>
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <link rel="stylesheet" href="kit/tokens.css" />
    <link rel="stylesheet" href="kit/components.css" />
    <link rel="stylesheet" href="kit/sketch.css" />
    <link rel="stylesheet" href="kit/guide.css" />
    <script src="assets/gsap.min.js"></script>
${scenes.map((s) => `    <script src="assets/vo/scene-${nn(s.n)}.alignment.js"></script>`).join("\n")}
    <script>window.KIT_TERMS = ${JSON.stringify(terms)};</script>
    <script src="kit/kit.js"></script>
    <script src="kit/sketch.js"></script>
    <script src="kit/sketches.js"></script>
    <script src="kit/guide.js"></script>
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
${clips.join("\n")}
${audios.join("\n")}
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
`);

// --- sfx.json: swipe на смене главы, pop на появлении плашек (не чаще 1,2 с)
const ev = [];
const add = (t, kind, pan, note) => { if (kind === "swipe" || !ev.length || t - ev.filter((e) => e.kind !== "swipe").at(-1).t >= 1.2) ev.push({ kind, t: r2(t), pan, note }); };
SPEC.forEach((s, i) => {
  if (i) add(starts[i], "swipe", i % 2 ? 0.4 : -0.4, `${s.n}: смена главы`);
  add(starts[i] + 0.12, "pop", -0.2, `${s.n}: шапка карточки`);
  s.plates.forEach(([ph], k) => add(starts[i] + Math.min(T(i, ph), scenes[i].duration - 2) - 0.1, "pop", k % 2 ? 0.3 : -0.3, `${s.n}: плашка ${k + 1}`));
});
ev.sort((a, b) => a.t - b.t);
writeFileSync(`${root}/sfx.json`, JSON.stringify({ events: ev }, null, 1) + "\n");
const tail = starts.at(-1) - 2.3;
console.log(`sfx: ${ev.length} событий`);

// --- VTT по предложениям (. ! ?); длинное (>150 зн.) режется по «;» и «:»
const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = x % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`; };
const backSub = (s) => terms.reduce((acc, [from, to]) => acc.replace(new RegExp(`(?<![\\p{L}\\p{N}])${from}(?![\\p{L}\\p{N}])`, "giu"), to), s);
let vtt = "WEBVTT\n\n", count = 0;
const GAP = 0.02;
scenes.forEach((s, i) => {
  const a = align[i], text = a.characters.join("");
  const re = /[^.!?]+[.!?]?/g; let m; const cues = [];
  const push = (from, to) => { // индексы символов [from, to]
    const body = text.slice(from, to + 1);
    const lead = body.length - body.trimStart().length, trail = body.trimEnd().length;
    const b = body.trim(); if (!b) return;
    cues.push({ start: starts[i] + a.character_start_times_seconds[from + lead], end: starts[i] + a.character_end_times_seconds[from + trail - 1] + 0.3, text: backSub(b) });
  };
  while ((m = re.exec(text))) {
    const from = m.index, to = m.index + m[0].length - 1, raw = m[0];
    if (raw.trim().length > 150) {
      let p = from;
      for (let k = 0; k < raw.length; k++) if ((raw[k] === ";" || raw[k] === ":") && k - (p - from) >= 30 && raw.length - k > 30) { push(p, from + k); p = from + k + 1; }
      push(p, to);
    } else push(from, to);
  }
  cues.forEach((c, k) => { if (cues[k + 1]) c.end = Math.min(c.end, cues[k + 1].start - GAP); c.end = Math.min(c.end, starts[i + 1]); });
  for (const c of cues) vtt += `${++count}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n\n`;
});
writeFileSync(`${out}/${NAME}.vtt`, vtt);
console.log(`VTT: ${count} реплик`);

// --- главы
const r3 = (x) => Number(x.toFixed(3));
const cts = (x) => { const m = Math.floor(x / 60), s = x % 60; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`; };
const chapters = scenes.map((s, i) => {
  const a = align[i], speech = a.character_start_times_seconds.find((_, k) => /\S/u.test(a.characters[k]));
  return { n: s.n, title: s.title, step: null, chapter: s.title, start: r3(starts[i]), titleStart: r3(starts[i]), speechStart: r3(starts[i] + speech), end: r3(starts[i + 1]) };
});
writeFileSync(`${out}/${NAME}.chapters.json`, JSON.stringify(chapters, null, 2) + "\n");
writeFileSync(`${out}/${NAME}.chapters.vtt`, "WEBVTT\n\n" + chapters.map((c) => `${c.n}\n${cts(c.start)} --> ${cts(c.end)}\n${c.title}\n`).join("\n"));
console.log(`сцен ${scenes.length}, всего ${total} с (${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, "0")}), глав ${chapters.length}`);
