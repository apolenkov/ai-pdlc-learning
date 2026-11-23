#!/usr/bin/env node
// Заставки из scenes.json; команда и название ролика — из course-names.json.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PART_DURATION = 2; // заставка части лежит поверх первой фразы части (overlay в scenes.json)
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const titles = manifest.filter((s) => s.kind === "title");
const J = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

// Две строки для длинного титула; сохраняем неразрывные пробелы внутри фраз.
const split = (text, max) => {
  if (text.length <= max) return [text];
  const mid = text.length / 2;
  const sp = [...text.matchAll(/ /g)].map((m) => m.index).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
  return sp == null ? [text] : [text.slice(0, sp), text.slice(sp + 1)];
};

// Одна строка под титулом: добавляет новое, не повторяет слова титула; без Jira, названия команды и слова «ступень».
const LEADS = {
  1: "Ветка и «Сбросить»",
  2: "Учебный черновик в specification.md",
  3: "Лишнее, пропуски, числа, противоречия, принятое",
  4: "Разница, Commit, Publish Branch",
  5: "Проверка → требования",
  6: "Комментарии аналитика и техлида · одно одобрение владельца продукта",
  7: "Слияние без удаления ветки",
};

// По умолчанию карточка видна с первого кадра (без пустого кадра на 00:00 файла и частей); TITLE_ANIMATED=1 включает появление.
const STATIC = process.env.TITLE_ANIMATED !== "1";

function body(t) {
  const D = PART_DURATION;
  assert.equal(t.duration, D, `scenes.json: duration заставки ${t.id}`);
  assert.equal(t.header?.mode, "parts");
  assert.equal(t.header?.total, 7);
  const title = manifest.find((s) => s.n === t.of)?.title;
  assert(typeof title === "string" && title.trim(), `Нет названия сцены ${t.of}`);
  const big = `Часть ${t.step}`;
  const header = { header: t.header, chapter: title, step: t.step,
    mode: "step", enter: !STATIC, progress: [0, 0], duration: D };
  const lines = split(title, 34);
  return `<template id="scene-${t.id}-template">
  <div data-composition-id="scene-${t.id}" data-width="1920" data-height="1080" data-duration="${D}">
    <script>
      (function () {
        /* ГЕНЕРИРУЕТСЯ: node tools/build-titles.mjs. Руками не править. */
        window.ALIGN = window.ALIGN || {};
        window.ALIGN[${J(t.id)}] = { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] };
        const S = Kit.scene(${J(t.id)});
        const DURATION = ${D};
        const center = (k) => { k.el.style.left = "96px"; k.el.style.width = "1728px"; k.el.style.textAlign = "center"; return k; };
        /* заставка: без шапки и рейла (шапка повторяла бы титул), только крупный титул */
        const s1 = S.stage();
        /* заставка лежит поверх начала сцены: сплошной фон скрывает то, что под ней */
        const cover = document.createElement("div"); cover.style.cssText = "position:absolute;inset:0;background:var(--k-bg)"; s1.prepend(cover);
        ${STATIC ? "gsap.set(s1, { autoAlpha: 1 });" : 'S.tl.fromTo(s1, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: "power2.out", immediateRender: false }, 0);'}
        center(Kit.kinetic(S, { parent: s1, x: 0, y: 290, size: 120, color: "var(--k-accent)", text: ${J(big)}, at: ${STATIC ? 0 : 0.1}, stagger: ${STATIC ? 0 : 0.06}, dur: ${STATIC ? 0.01 : 0.5} }));
        ${lines.map((line, i) => `center(Kit.kinetic(S, { parent: s1, x: 0, y: ${530 + i * 100}, size: 72, text: ${J(line)}, at: ${STATIC ? 0 : 0.2}, stagger: ${STATIC ? 0 : 0.03}, dur: ${STATIC ? 0.01 : 0.5} }));`).join("\n        ")}
        ${LEADS[t.of] ? `center(Kit.kinetic(S, { parent: s1, x: 0, y: ${530 + lines.length * 100 + 40}, size: 48, color: "var(--k-text-2)", text: ${J(LEADS[t.of])}, at: ${STATIC ? 0 : 0.5}, stagger: ${STATIC ? 0 : 0.02}, dur: ${STATIC ? 0.01 : 0.5} }));` : ""}
        ${STATIC ? `        /* STATIC: карточка видна с первого кадра - снимаем стартовый yPercent 118 и autoAlpha 0 у кинетики, иначе на кадре 0 tween с at: 0 ещё не отрисован. */
        S.tl.killTweensOf(s1.querySelectorAll(".k-wi"));
        S.tl.killTweensOf(s1.querySelectorAll(".k-kin"));
        gsap.set(s1.querySelectorAll(".k-wi"), { yPercent: 0 });
        gsap.set(s1.querySelectorAll(".k-kin"), { autoAlpha: 1 });` : ""}
        S.tl.to(s1, { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, DURATION - 0.3);
        S.finish(DURATION);
      })();
    </script>
  </div>
</template>
`;
}

mkdirSync(`${root}/compositions`, { recursive: true });
for (const t of titles) {
  writeFileSync(`${root}/compositions/scene-${t.id}.html`, body(t));
  writeFileSync(`${root}/compositions/scene-${t.id}.meta.json`, JSON.stringify(t) + "\n");
}
console.log(`записано заставок: ${titles.length}`);
