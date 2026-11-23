#!/usr/bin/env node
// План звуковых событий ролика → sfx.json (формат sfx-plan.ts: явный список events).
//   node tools/make-sfx.mjs          пишет sfx.json
// События берутся из тех же сцен, что и картинка: тела work/scenes/NN.js исполняются с заглушками DOM/gsap,
// настоящие — Team (kit/team.js) и t() по озвучке; Team.cue пишет pop в window.__CUES[сцена], F.draw — swipe.
// Добавляются: swipe на смене сцены, subdrop при выходе из заставки (сц.1) и в хвосте ролика; одинаковые события ближе 0,25 с сливаются.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const starts = scenes.reduce((a, s) => (a.push(a.at(-1) + s.duration), a), [0]);
const stub = () => { const f = function () {}; const p = new Proxy(f, { get: (_, k) => (k === Symbol.toPrimitive ? () => 0 : k === "style" ? {} : p), apply: () => p, set: () => true, construct: () => p }); return p; };
const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
const ev = [];
const add = (n, t, kind, pan, note) => ev.push({ kind, t: Number((starts[n - 1] + t).toFixed(3)), pan, note: `${n}: ${note}` });
const teamSrc = readFileSync(`${root}/kit/team.js`, "utf8");
const sketches = readFileSync(`${root}/kit/sketches.js`, "utf8");
for (const sc of scenes) {
  const nn = String(sc.n).padStart(2, "0");
  const al = JSON.parse(readFileSync(`${root}/assets/vo/scene-${nn}.alignment.json`, "utf8"));
  const text = al.characters.join("");
  const t = (phrase, nth = 1) => {
    let from = 0, idx = -1;
    for (let i = 0; i < nth; i++) {
      idx = text.indexOf(phrase, from);
      if (idx < 0) idx = norm(text).indexOf(norm(phrase), from);
      if (idx < 0) throw new Error(`сцена ${nn}: нет фразы «${phrase}»`);
      from = idx + 1;
    }
    return al.character_start_times_seconds[idx];
  };
  const swipes = [];
  const F = new Proxy({}, { get: (_, k) => (k === "draw" ? (_tl, _p, at) => { swipes.push(Number(at)); return stub(); } : stub()) });
  const window = { gsap: stub(), F, People: stub(), Kit: stub(), console }; window.window = window;
  const ctx = vm.createContext(window);
  vm.runInContext(sketches, ctx); vm.runInContext(teamSrc, ctx);
  const L = { S: { id: nn, root: stub() }, tl: stub(), el: stub(), DUR: sc.duration, head: stub(), show: stub(), hide: stub(), at: stub(), t, focus: stub(), fin: stub() };
  ctx.L = L; ctx.t = t; ctx.el = L.el; ctx.DUR = sc.duration; ctx.S = L.S; ctx.tl = L.tl; ctx.at = L.at;
  vm.runInContext(readFileSync(`${root}/work/scenes/${nn}.js`, "utf8").replace(/^const /gm, "var "), ctx);
  for (const c of window.__CUES[nn] || []) add(sc.n, c.t, c.kind, c.pan, "по картинке");
  for (const s of swipes) add(sc.n, s, "swipe", 0, "линия рисуется");
  if (sc.n > 1) add(sc.n, 0, "swipe", sc.n % 2 ? -0.4 : 0.4, "смена сцены");
}
add(1, 1.4, "subdrop", 0, "начало ролика");
const total = starts.at(-1);
ev.push({ kind: "subdrop", t: Number((total - 2.3).toFixed(3)), pan: 0, note: "хвост — выход из ролика" });
ev.sort((a, b) => a.t - b.t);
for (let i = ev.length - 1; i > 0; i--) { const p = ev.slice(0, i).reverse().find((q) => q.kind === ev[i].kind); if (p && ev[i].t - p.t < 0.25) ev.splice(i, 1); }
for (const e of ev) if (e.t < 0 || e.t > total) throw new Error("событие вне ролика " + JSON.stringify(e));
writeFileSync(`${root}/sfx.json`, JSON.stringify({ events: ev }, null, 1) + "\n");
const k = (x) => ev.filter((e) => e.kind === x).length;
console.log(`sfx.json: ${ev.length} событий (swipe ${k("swipe")}, pop ${k("pop")}, subdrop ${k("subdrop")}) на ${total.toFixed(1)} с`);
