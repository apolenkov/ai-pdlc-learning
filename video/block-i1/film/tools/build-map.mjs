#!/usr/bin/env node
// Сцена «карта маршрута» (id 0m): первая сцена каждого ролика, текущий шаг подсвечен «вы здесь».
//   node tools/build-map.mjs <id гайда>        # 0, 0a, sdd, 1, 2, 3, 4-team, 3-star, 4-new, 4-legacy, delivery
// Порядок, номера и названия — guides/route-steps.json; дополнительные ролики и цели — course-names.json.
// Озвучка — блок 0m раскадровки (assets/vo/scene-0m.*); тайминги — по выравниванию озвучки. Результат: compositions/scene-0m.html.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const loadNames = () => JSON.parse(readFileSync(process.env.COURSE_NAMES ?? resolve(root, "../../../docs/pages/sdlc-development/course-names.json"), "utf8"));
const loadRoute = () => JSON.parse(readFileSync(process.env.COURSE_ROUTE ?? resolve(root, "../../../docs/pages/sdlc-development/guides/route-steps.json"), "utf8"));
const flat = (s) => String(s).replaceAll(" ", " ");
const J = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);

/** Что получит зритель: строка на экране после слов диктора (ключ — id гайда); якорь — слово речи, с которого строка появляется. */
export const GOALS = {
  "0": ["Поймёте, зачем меняем способ работы с требованиями", "Вы"],
  "0a": ["Сможете вести документ с историей и отдавать правки на проверку", "Вы"],
  sdd: ["Поймёте, почему изменение записывают до кода", "Вы"],
  metarepo: ["Находите контекст продукта и проверенную версию кода", "Вы"],
  "1": ["Первое требование, которое можно проверить", "У вас"],
  "2": ["Одобрение коллег на вашем требовании", "Ваше"],
  "3": ["Изменение, оформленное так, как принято в команде", "Вы"],
  "4-team": ["Кто в команде что делает и что одобряет", "Вы"],
  "3-star": ["Согласованное изменение в общем хранилище продукта", "Вы"],
  "4-new": ["Первое принятое изменение для нового продукта", "Вы"],
  "4-legacy": ["Старые документы становятся проверяемыми требованиями", "Вы"],
  delivery: ["Как по согласованным требованиям пишут код", "Вы"],
  dark: ["Поймёте, куда ведёт процесс и почему проверка остаётся за людьми", "Вы"],
};

/** Нумерация из маршрута; связи по id не зависят от видимого номера подготовки или ветви. */
export const stops = (cn = loadNames(), route = loadRoute()) => {
  if (!Array.isArray(route) || !route.some((r) => r.id === "delivery")) throw new Error("route-steps.json: нет практикума (delivery)");
  const mk = (r) => ({ id: r.id, num: r.number, code: r.number ? `Шаг ${r.number}` : "Подготовка", title: flat(r.title), label: flat(r.title), group: r.group });
  // Карта курса анализа: шагов курса «Намерение и план» (i1–i4) на ней нет — у них своя линия номеров 1–4.
  // Основной признак в данных — course: intent; проверка по id ловит маршрут, где этого поля ещё нет.
  const own = route.filter((r) => !r.course && !/^i\d$/.test(r.id));
  const steps = own.filter((r) => !r.branchOf).map(mk);
  const branches = own.filter((r) => r.branchOf).map((r) => {
    const parent = cn.branches?.find((b) => b.id === r.id)?.of;
    if (!steps.some((s) => s.id === parent)) throw new Error(`Нет родительского шага для ${r.id}`);
    return { ...mk(r), parent };
  });
  const extras = (cn.extras ?? []).map((x) => {
    const parent = steps.find((s) => s.id === x.after);
    if (!parent) throw new Error(`Нет родительского шага для ${x.id}`);
    return { id: x.id, num: "", code: "Дополнение к подготовке", title: flat(x.title), label: flat(x.short ?? x.title), group: parent.group, parent: parent.id, extra: true };
  });
  return { steps, branches, extras, groups: cn.groups };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const id = process.argv[2];
  if (!id || !GOALS[id]) throw new Error("Использование: node tools/build-map.mjs <0|0a|sdd|metarepo|1|2|3|4-team|3-star|4-new|4-legacy|delivery|dark>");
  const { steps, branches: variants, extras, groups } = stops();
  const branches = extras.some((x) => x.id === id) ? extras : variants; // у дополнительного ролика на карте только его карточка
  const all = [...steps, ...branches];
  const here = all.find((s) => s.id === id);
  if (!here) throw new Error(`В route нет гайда ${id}`);
  const [fallback, goalAnchor] = GOALS[id];
  const cn = loadNames();
  const goal = (cn.guides[id] ?? cn.extras?.find((x) => x.id === id))?.gain ?? fallback; // «Что получите» — поле gain из course-names.json
  const data = { version: 2, steps, branches, groups, here: here.id, goal, goalAnchor };
  const posterPath = `${root}/compositions/scene-poster.html`;
  const posterDuration = existsSync(posterPath) ? Number(readFileSync(posterPath, "utf8").match(/data-duration="([\d.]+)"/)?.[1]) : 0;
  if (!Number.isFinite(posterDuration) || posterDuration < 0) throw new Error("Некорректная длительность титульной карточки");
  const html = `<template id="scene-0m-template">
  <div data-composition-id="scene-0m" data-width="1920" data-height="1080" data-duration="__DUR__">
    <style>
      [data-composition-id="scene-0m"] .mp-grp { position: absolute; top: 160px; height: 44px; text-align: center; font-size: 26px; font-weight: 700; letter-spacing: 0.02em; min-width: 0; text-transform: uppercase; white-space: nowrap; color: var(--k-text-2); border-bottom: 3px solid var(--k-line); padding-bottom: 8px; }
      [data-composition-id="scene-0m"] .mp-track { position: absolute; top: 280px; height: 8px; border-radius: 4px; background: var(--k-line); transform-origin: left center; }
      [data-composition-id="scene-0m"] .mp-fill { position: absolute; top: 280px; height: 8px; border-radius: 4px; background: var(--k-accent); transform-origin: left center; }
      [data-composition-id="scene-0m"] .mp-node { position: absolute; width: 80px; height: 80px; border-radius: 50%; display: grid; place-items: center; font-size: 36px; font-weight: 800; background: var(--k-panel-2); border: 4px solid var(--k-line); color: var(--k-text); }
      [data-composition-id="scene-0m"] .mp-node.done { border-color: var(--k-accent-soft); color: var(--k-accent-soft); }
      [data-composition-id="scene-0m"] .mp-node.here { background: var(--k-accent); border-color: var(--k-accent); color: var(--k-bg); box-shadow: 0 0 0 10px var(--k-glow); }
      [data-composition-id="scene-0m"] .mp-lab { position: absolute; top: 340px; text-align: center; font-size: 25px; font-weight: 600; line-height: 1.2; color: var(--k-text-2); }
      [data-composition-id="scene-0m"] .mp-lab.here { color: var(--k-text); }
      [data-composition-id="scene-0m"] .mp-cd { display: block; font-size: 24px; font-weight: 800; letter-spacing: 0.02em; color: var(--k-accent-soft); margin-bottom: 2px; }
      [data-composition-id="scene-0m"] .mp-pin { position: absolute; top: 196px; width: 160px; text-align: center; font-size: 28px; font-weight: 800; color: var(--k-accent); }
      [data-composition-id="scene-0m"] .mp-br { position: absolute; top: 520px; width: 270px; padding: 14px 10px; text-align: center; border: 3px dashed var(--k-line); border-radius: 18px; background: var(--k-panel-2); font-size: 25px; font-weight: 600; line-height: 1.2; color: var(--k-text-2); }
      [data-composition-id="scene-0m"] .mp-br b { display: block; font-size: 30px; color: var(--k-text); margin-bottom: 4px; }
      [data-composition-id="scene-0m"] .mp-br.here { border-style: solid; border-color: var(--k-accent); color: var(--k-text); box-shadow: 0 0 0 8px var(--k-glow); }
      [data-composition-id="scene-0m"] .mp-cur { position: absolute; left: 96px; width: 1728px; top: 690px; font-size: 52px; font-weight: 800; letter-spacing: -0.015em; }
      [data-composition-id="scene-0m"] .mp-cur span { color: var(--k-accent-soft); }
      [data-composition-id="scene-0m"] .mp-goal { position: absolute; left: 96px; width: 1728px; top: 770px; font-size: 30px; font-weight: 600; color: var(--k-text-2); }
      [data-composition-id="scene-0m"] .mp-goal b { color: var(--k-text); }
    </style>
    <script>
      (function () {
        const D = ${J(data)};
        const S = Kit.scene("0m"), t = S.t, tl = S.tl, DUR = __DUR__;
        if (DUR - S.speechEnd < 1.5) throw new Error("Недостаточный хвост сцены");
        const title = document.createElement("div");
        title.style.cssText = "position:absolute;left:96px;top:38px;font-size:34px;font-weight:800;color:var(--k-text)";
        title.textContent = "Маршрут курса";
        S.root.appendChild(title);
        const st = S.stage(); gsap.set(st, { autoAlpha: 1 });
        // Не просвечивать текстом карты через растворяющуюся титульную карточку.
        gsap.set([title, st], { autoAlpha: 0 });
        tl.set([title, st], { autoAlpha: 1 }, ${posterDuration});
        const el = (cls, html, css) => { const e = document.createElement("div"); e.className = cls; e.innerHTML = html || ""; Object.assign(e.style, css || {}); st.appendChild(e); gsap.set(e, { autoAlpha: 0 }); return e; };
        const show = (e, at, dur = 0.45, y = 14) => tl.fromTo(e, { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration: dur, ease: "power2.out", immediateRender: false }, at);
        const X0 = 96, W = 1728, pitch = W / D.steps.length, cx = (i) => X0 + pitch * (i + 0.5);
        const hereStep = D.steps.findIndex((s) => s.id === D.here);
        const hereBranch = D.branches.find((b) => b.id === D.here);
        const focus = hereBranch ? D.steps.findIndex((s) => s.id === hereBranch.parent) : hereStep;

        // группы: подпись над своими остановками (названия — course-names.json, groups)
        [...new Set(D.steps.map((s) => s.group))].forEach((g) => {
          const idx = D.steps.map((s, i) => (s.group === g ? i : -1)).filter((i) => i >= 0);
          const left = cx(idx[0]) - pitch / 2 + 20, right = cx(idx.at(-1)) + pitch / 2 - 20;
          const w = Math.max(right - left, 210), mid = (left + right) / 2;
          show(el("mp-grp", g === "prep" ? "Подготовка" : (D.groups[g] ?? g), { left: mid - w / 2 + "px", width: w + "px" }), 0.05, 0.25);
        });
        show(el("mp-prep", "Подготовка — если ещё не работали с Markdown, Git и SDD", { position: "absolute", left: "96px", top: "100px", fontSize: "26px", color: "var(--k-text-2)" }), 0.05, 0.25, 0);
        const lastIdx = D.steps.length - 1;

        // дорожка и заполнение до текущего шага
        const trackL = cx(0), trackW = cx(lastIdx) - cx(0);
        show(el("mp-track", "", { left: trackL + "px", width: trackW + "px" }), 0.05, 0.25, 0);
        const fill = el("mp-fill", "", { left: trackL + "px", width: cx(focus) - trackL + "px" });
        tl.fromTo(fill, { autoAlpha: 1, scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power2.inOut", immediateRender: false }, t("Тема") + 0.5);

        // остановки
        D.steps.forEach((s, i) => {
          const cls = "mp-node" + (i < focus || (hereBranch && i === focus) ? " done" : i === focus ? " here" : "");
          const n = el(cls, s.num, { left: cx(i) - 40 + "px", top: "248px" });
          show(n, 0.05 + i * 0.01, 0.25, 10);
          if (i === focus && !hereBranch) tl.to(n, { scale: 1.18, duration: 0.5, ease: "back.out(1.6)", immediateRender: false }, t("Тема") + 0.5);
          const lab = el("mp-lab" + (i === focus ? " here" : ""), s.label, { left: cx(i) - (pitch - 14) / 2 + "px", width: pitch - 14 + "px" });
          show(lab, 0.05 + i * 0.01, 0.25, 8);
        });
        const pin = el("mp-pin", hereBranch ? "" : "вы здесь", { left: cx(focus) - 80 + "px" });
        if (!hereBranch) show(pin, t("Тема") + 0.6, 0.4, 10);

        // ответвления шага (если есть)
        if (D.branches.length) {
          const px = cx(D.steps.findIndex((s) => s.id === D.branches[0].parent));
          const bw = 270, gap = 24, total = D.branches.length * bw + (D.branches.length - 1) * gap;
          const left0 = Math.min(px + 90 - total, 1824 - total);
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("style", "position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:visible");
          st.appendChild(svg); gsap.set(svg, { autoAlpha: 0 });
          D.branches.forEach((b, i) => {
            const bx = left0 + i * (bw + gap) + bw / 2;
            const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
            p.setAttribute("d", "M" + px + " 446 V 476 H " + bx + " V 516");
            p.setAttribute("fill", "none"); p.setAttribute("stroke", "var(--k-line)"); p.setAttribute("stroke-width", "4"); p.setAttribute("stroke-dasharray", "10 8");
            svg.appendChild(p);
            const card = el("mp-br" + (b.id === D.here ? " here" : ""), "<b>" + b.code + "</b>" + b.label, { left: left0 + i * (bw + gap) + "px" });
            show(card, 0.5 + i * 0.1, 0.3, 12);
            if (b.id === D.here) {
              const bp = el("mp-pin", "вы здесь", { left: bx + 12 + "px", top: "482px", textAlign: "left", width: "123px", fontSize: "24px" }); show(bp, t("Тема") + 0.6, 0.4, 10);
            }
          });
          tl.to(svg, { autoAlpha: 1, duration: 0.3 }, 0.5);
        }

        // текущий шаг и что получите
        const current = hereBranch || D.steps[hereStep];
        const curText = "<span>" + current.code + " ·</span> " + current.title;
        const curEl = el("mp-cur", curText);
        if (curEl.textContent.length > 63) curEl.style.fontSize = "44px";   // длинное название не переносится на строку «Что получите»
        show(curEl, t("Тема") + 0.9, 0.5);
        show(el("mp-goal", "<b>Что получите:</b> " + D.goal, D.goal.length > 62 ? { fontSize: "30px" } : {}), t(D.goalAnchor), 0.5, 0);   // без сдвига: строка не заходит в зону субтитров во время появления

        Kit.subtitles(S, {});
        S.finish(DUR);
      })();
    </script>
  </div>
</template>
`;
  const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
  const entry = scenes.find((s) => String(s.n) === "0m");
  if (!entry) throw new Error("В scenes.json нет сцены 0m (node tools/build-vo.mjs)");
  writeFileSync(`${root}/compositions/scene-0m.html`, html.replaceAll("__DUR__", String(entry.duration)));
  console.log(`scene-0m.html: ${here.num} ${here.title}, ${entry.duration} с`);
}
