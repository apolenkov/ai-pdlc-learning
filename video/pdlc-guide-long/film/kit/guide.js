/* Сцены «Подробно» · гайд PDLC. Детерминированно: только S.tl, без Math.random/Date. Единицы подсветки — единицы скетча (viewBox 960×540, кадр от y=90). */
window.Guide = (function () {
  const U = 1.55, CROP = 90, BODY = 450, NS = "http://www.w3.org/2000/svg";
  const C = (i) => 91 + i * 129.2; // центры колонок ленты главного скетча (единицы)
  const REG = {
    P: { x: 30, y: 96, width: 402, height: 378 }, G: { x: 480, y: 96, width: 450, height: 378 },
    GA: { x: 492, y: 334, width: 426, height: 76 }, GD: { x: 492, y: 411, width: 426, height: 40 },
    IN: { x: 28, y: 494, width: 440, height: 32 }, OUT: { x: 470, y: 494, width: 462, height: 32 },
    RIB: { x: 30, y: 150, width: 900, height: 176 }, LOOP: { x: 80, y: 98, width: 800, height: 49 },
    HUM: { x: 30, y: 332, width: 440, height: 142 }, AGT: { x: 488, y: 332, width: 442, height: 142 },
  };
  for (let i = 0; i < 7; i++) REG["COL" + i] = { x: C(i) - 70, y: 150, width: 140, height: 176 };
  REG.COL01 = { x: C(0) - 70, y: 150, width: C(1) - C(0) + 140, height: 176 }; // соседние колонки одним окном: рамки не налезают
  function begin(id, spec) {
    const S = Kit.scene(id), tl = S.tl, root = S.root;
    const DUR = parseFloat(root.getAttribute("data-duration"));
    const el = (cls, html, parent) => { const d = document.createElement("div"); d.className = cls; if (html != null) d.innerHTML = html; (parent || root).appendChild(d); return d; };
    const show = (e, at, y) => { gsap.set(e, { autoAlpha: 0 }); tl.fromTo(e, { autoAlpha: 0, y: y == null ? 14 : y }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, at); return e; };
    const at = (p, n) => Math.min(S.t(p, n), DUR - 2);
    // карточка: шапка (своя, роли по 590) + скетч без своей шапки
    const card = el("g-card");
    const head = el("g-head", `<div class="g-kick">${spec.kicker}</div><div class="g-title">${spec.num ? `<span class="g-num">${spec.num}</span>` : ""}${spec.title}</div>${spec.of ? `<div class="g-of">этап ${spec.of} из 7</div>` : ""}`, card);
    show(head, 0.1, 10);
    const clip = el("g-clip", null, card);
    Kit.sketch(S, { name: spec.sketch, x: 0, y: -CROP * U, w: 960 * U, at: 0.3, dur: 2.2, parent: clip });
    // подсветка: маска с «окнами» (до трёх), затемнение вне окон, рамка у окон
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "g-veil"); svg.setAttribute("viewBox", `0 ${CROP} 960 ${BODY}`); svg.setAttribute("data-layout-allow-overlap", "");
    const mid = "gm-" + id;
    svg.innerHTML = `<defs><mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="${CROP}" width="960" height="${BODY}"><rect x="0" y="${CROP}" width="960" height="${BODY}" fill="#fff"/>${[0, 1, 2].map((j) => `<rect class="hole" data-j="${j}" x="0" y="0" width="1" height="1" rx="14" fill="#000" opacity="0"/>`).join("")}</mask></defs><rect class="veil" x="0" y="${CROP}" width="960" height="${BODY}" fill="#10141b" mask="url(#${mid})" opacity="0"/>${[0, 1, 2].map((j) => `<rect class="ring" data-j="${j}" x="0" y="0" width="1" height="1" rx="14" fill="none" stroke="#ff7a59" stroke-width="3" opacity="0"/>`).join("")}`;
    clip.appendChild(svg);
    const holes = [...svg.querySelectorAll(".hole")], rings = [...svg.querySelectorAll(".ring")], veil = svg.querySelector(".veil");
    const state = [null, null, null];
    const spot = (when, names) => {
      const rs = names.map((n) => REG[n]);
      holes.forEach((h, j) => {
        const r = rs[j], rg = rings[j];
        if (r && state[j]) { tl.to([h, rg], { attr: r, duration: 0.55, ease: "power2.inOut" }, when); }
        else if (r) { tl.set([h, rg], { attr: r }, when - 0.01); tl.fromTo([h, rg], { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, when); }
        else if (state[j]) tl.to([h, rg], { opacity: 0, duration: 0.4 }, when);
        state[j] = r || null;
      });
      tl.to(veil, { opacity: rs.length ? 0.52 : 0, duration: 0.5 }, when);
    };
    (spec.steps || []).forEach(([ph, names]) => spot(Math.max(at(ph) - 0.15, 1.0), names));
    // плашки
    const row = el("g-plates");
    (spec.plates || []).forEach(([ph, html, cls]) => { const p = el("g-plate " + (cls || ""), html, row); show(p, at(ph) - 0.1, 12); });
    // полоса этапов
    const prog = el("g-prog", Array.from({ length: 7 }, (_, i) => `<i class="${spec.of ? (i + 1 === spec.of ? "cur" : i + 1 < spec.of ? "on" : "") : "on"}"></i>`).join(""));
    show(prog, 0.3, 0);
    return { S, tl, DUR, fin: () => S.finish(DUR) };
  }
  return { begin, REG, U };
})();
