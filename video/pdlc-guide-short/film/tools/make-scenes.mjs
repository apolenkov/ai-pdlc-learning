#!/usr/bin/env node
// scenes.json (длительности по озвучке) + work/scenes/NN.{css,js}: плашки и скетч каждой главы по сценарию G-short.
//   node tools/make-scenes.mjs && node tools/wrap-scene.mjs && node tools/build-index.mjs . && node tools/sync-dur.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const r1 = (x) => Math.round(x * 10) / 10;

// head — заголовок главы (HTML), num — номер этапа, tags — плашки [фраза-триггер, класс, текст]
const CH = [
  { title: "Принцип", sketch: "home-pdlc-overview", full: true, head: '7 этапов <span>PDLC</span>', tags: [["Человек", "ok", "Человек решает"], ["Агент", "acc", "Агент — внутри границ"]] },
  { title: "Намерение и план", sketch: "pdlc-01-intent", num: "01", head: "Намерение и план", tags: [["Решает", "ok", "Решает владелец продукта"]] },
  { title: "Анализ требований", sketch: "pdlc-02-analysis", num: "02", head: "Анализ требований", tags: [["одобряет", "ok", "Одобряет владелец продукта"]] },
  { title: "Архитектура и дизайн", sketch: "pdlc-03-architecture", num: "03", head: "Архитектура и дизайн", tags: [["утверждает", "ok", "ADR утверждает архитектор"]] },
  { title: "Реализация", sketch: "pdlc-04-build", num: "04", head: "Реализация", tags: [["принимает", "ok", "Код принимает техлид"]] },
  { title: "Тестирование", sketch: "pdlc-05-test", num: "05", head: "Тестирование", tags: [["Решает", "ok", "Решает инженер качества"]] },
  { title: "Выпуск", sketch: "pdlc-06-release", num: "06", head: "Выпуск", tags: [["допускает", "ok", "Допускает техлид"]] },
  { title: "Наблюдение", sketch: "pdlc-07-observe", num: "07", head: "Наблюдение", tags: [["Решает", "ok", "Решает владелец продукта"]] },
  { title: "Вывод", sketch: "home-pdlc-overview", full: true, head: "Агент <span>помогает</span>", tags: [["решение", "ok", "Решает человек"]] },
];
const scenes = CH.map((c, i) => {
  const nn = String(i + 1).padStart(2, "0");
  const audio = `assets/vo/scene-${nn}.mp3`;
  const ad = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${root}/${audio}`], { encoding: "utf8" }));
  return { n: i + 1, duration: r1(ad + (i === CH.length - 1 ? 1.4 : 0.5)), chapter: c.title, title: c.title, audio, audioDuration: Number(ad.toFixed(2)) };
});
writeFileSync(`${root}/scenes.json`, JSON.stringify(scenes, null, 2) + "\n");

mkdirSync(`${root}/work/scenes`, { recursive: true });
const css = `.pd-h { position: absolute; left: 96px; top: 52px; width: 1100px; font-size: 62px; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; white-space: nowrap; }
.pd-h b { font-weight: 800; color: var(--k-ok); margin-right: 22px; }
.pd-h span { color: var(--k-ok); }
.pd-tags { position: absolute; right: 96px; top: 56px; display: flex; gap: 20px; justify-content: flex-end; }
.pd-tag { padding: 8px 28px; border-radius: 18px; font-size: 38px; font-weight: 800; background: var(--k-ok-tint); color: var(--k-ok); border: 2px solid var(--k-ok); white-space: nowrap; }
.pd-tag.acc { background: var(--k-accent-tint); color: var(--k-accent-soft); border-color: var(--k-accent); }
.pd-card { position: absolute; background: #f4f1e8; border-radius: 40px; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,.45); }
.pd-card svg { display: block; width: 100%; height: auto; }
.pd-card .s { stroke-dasharray: 1 2; stroke-dashoffset: 1; }`;
scenes.forEach((s, i) => {
  const c = CH[i], nn = String(s.n).padStart(2, "0");
  const card = c.full ? { x: 240, y: 200, w: 1440 } : { x: 160, y: 200, w: 1600 };
  const headHtml = c.num ? `<b>${c.num} ·</b>${c.head}` : c.head;
  const tags = c.tags.map(([ph, cls, text], k) => `  const tag${k} = el("pd-tag${cls === "acc" ? " acc" : ""}", ${JSON.stringify(text)}, tags); show(tag${k}, t(${JSON.stringify(ph)}) - 0.1);`).join("\n");
  const js = `const head = el("pd-h", ${JSON.stringify(headHtml)}); show(head, ${i === 0 ? 0.7 : 0.1}, 18);
  const tags = el("pd-tags");
${tags}
  const card = el("pd-card", window.SKETCHES[${JSON.stringify(c.sketch)}]);
  card.style.left = "${card.x}px"; card.style.top = "${card.y}px"; card.style.width = "${card.w}px";
  const svg = card.firstElementChild;
  svg.removeAttribute("role"); svg.setAttribute("aria-hidden", "true");
  ${c.full ? "" : `svg.setAttribute("viewBox", "0 90 960 450"); // шапку скетча закрывает плашка ролика`}
  const strokes = [...svg.querySelectorAll(".s")], texts = [...svg.querySelectorAll("text")];
  const t0 = ${i === 0 ? 1.0 : 0.3}, span = Math.min(4.5, DUR * 0.45);
  gsap.set(card, { autoAlpha: 0 });
  gsap.set(strokes, { strokeDashoffset: 1 });
  gsap.set(texts, { opacity: 0 });
  tl.fromTo(card, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out", immediateRender: false }, t0);
  strokes.forEach((p, k) => tl.to(p, { strokeDashoffset: 0, duration: Math.max(0.5, span / 6), ease: "none" }, t0 + 0.3 + (span * k) / strokes.length));
  texts.forEach((x, k) => tl.to(x, { opacity: 1, duration: 0.4, ease: "power1.out" }, t0 + 0.3 + (span * k) / texts.length));
  tl.fromTo(card, { scale: 1 }, { scale: 1.02, duration: DUR, ease: "none", immediateRender: false }, 0);
  [head, tags, card].forEach((e) => hide(e, DUR - 0.3));`;
  writeFileSync(`${root}/work/scenes/${nn}.css`, css + "\n");
  writeFileSync(`${root}/work/scenes/${nn}.js`, js + "\n");
});
console.log(`scenes.json: ${scenes.length} сцен, ${r1(scenes.reduce((a, s) => a + s.duration, 0))} с`);
