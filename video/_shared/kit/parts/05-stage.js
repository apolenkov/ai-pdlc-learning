  /* ---------- итоговые карточки «Получилось, если…» ---------- */
  function goals(S, o) {
    const n = o.items.length;
    if (n < 2 || n > 4) throw new Error("Kit.goals: нужно 2–4 пункта");
    const dur = D("pop"), deadline = S.speechEnd + 1.5;
    const start = o.start != null ? o.start : S.speechEnd;
    const step = n > 1 ? Math.min(0.5, (deadline - dur - start) / (n - 1)) : 0;
    const starts = o.items.map((_, i) => start + i * step);
    if (starts[n - 1] + dur > deadline + 1e-6) throw new Error(`Kit.goals: пункты не успевают появиться до конца речи + 1,5 с (${starts[n - 1] + dur} > ${deadline}); начните раньше`);
    const box = mk("div", "k-goals", null, P(S, o.parent));
    // по умолчанию блок по центру свободной зоны (170..950 px) по вертикали; o.center === false — взять o.y
    const goalH = parseFloat(css("--k-goal-h")), sumH = 64, gap = 44;
    const blockH = goalH + (o.summary ? gap + sumH : 0);
    const top = o.center === false && o.y != null ? o.y : Math.round(560 - blockH / 2);
    place(box, { x: o.x != null ? o.x : 96, y: top, w: o.w != null ? o.w : 1728 });
    const row = mk("div", "row", null, box);
    const cards = o.items.map((it, i) => {
      const c = mk("div", "k-goal", `<div class="ic">${ICONS[it.icon] || it.icon || ICONS.check}</div><div class="tx">${esc(it.text)}</div>`, row);
      hide0(c);
      popIn(S, c, starts[i], dur);
      return c;
    });
    let summary = null;
    if (o.summary) {
      summary = mk("div", "k-goal-sum", esc(o.summary), box);
      hide0(summary);
      popIn(S, summary, starts[n - 1] + 0.3, dur);
    }
    return { el: box, cards, summary, starts, out: (t) => popOut(S, box, t) };
  }

  /* ---------- боковая подсказка ---------- */
  function aside(S, o) {
    const el = mk("div", "k-aside k-card", null, P(S, o.parent));
    place(el, o);
    hide0(el);
    if (o.tail !== false) el.insertAdjacentHTML("beforeend", `<svg class="tail" viewBox="0 0 56 30" fill="none"><path d="M53 15H7M17 5L6 15l11 10" stroke="${C("accent")}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
    if (o.title) mk("div", "ttl", esc(o.title), el);
    if (o.text) mk("div", "sub", esc(o.text), el);
    if (o.button) mk("span", "btn", esc(o.button), el);
    if (o.html) el.insertAdjacentHTML("beforeend", o.html);
    return { el, show: (at) => popIn(S, el, at), hide: (at) => popOut(S, el, at) };
  }

  /* ---------- плитки пути ---------- */
  function path(S, o) {
    const box = mk("div", "k-path", null, P(S, o.parent));
    place(box, o);
    const out = [];
    o.items.forEach((it, i) => {
      if (i) { const sl = mk("div", "k-sl", o.sep || "/", box); hide0(sl); popIn(S, sl, it.at - 0.45, 0.4); }
      const t = mk("div", "k-tile" + (it.ghost ? " ghost" : ""), `${(TILE_ICONS[it.icon] || TILE_ICONS.folder)()}${esc(it.text)}`, box);
      hide0(t);
      popIn(S, t, it.at);
      out.push(t);
    });
    return { el: box, tiles: out, out: (t) => popOut(S, box, t) };
  }

  /* ---------- схема Git ---------- */
  function gitGraph(S, o) {
    const tl = S.tl;
    const svg = sv("svg", { class: "k-git", width: o.w, height: o.h, viewBox: `0 0 ${o.w} ${o.h}` }, P(S, o.parent));
    place(svg, o);
    const labelW = o.labelW != null ? o.labelW : Math.max(230, Math.max(...o.lanes.map((l) => l.label.length)) * 17 + 60), colW = o.colW || 150;  // авто: по самой длинной подписи дорожки
    const defs = sv("defs", {}, svg);
    const mkr = (id, col) => {
      const m = sv("marker", { id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: "auto-start-reverse" }, defs);
      sv("path", { d: "M0 0L10 5L0 10z", fill: col }, m);
    };
    const uid = "g" + S.id + "-";
    const lanes = {};
    o.lanes.forEach((ln, i) => {
      const y = ln.y != null ? ln.y : 60 + i * ((o.h - 120) / Math.max(1, o.lanes.length - 1));
      lanes[ln.id] = { y, color: ln.color || C("git-main") };
      const g = sv("g", {}, svg);
      sv("line", { x1: labelW - 30, y1: y, x2: o.w, y2: y, stroke: C("git-line"), "stroke-width": 3, "stroke-dasharray": "4 10" }, g);
      const t = sv("text", { x: 0, y: y + 10, class: "lane-l" }, g); t.textContent = ln.label;
    });
    const pos = {};
    const dots = {};
    const px = (lane, col) => ({ x: labelW + col * colW, y: lanes[lane].y });
    const show = (el, at, kind) => {
      gsap.set(el, { opacity: 0 });
      tl.to(el, { opacity: 1, duration: 0.3 }, at);
    };
    (o.commits || []).forEach((c) => {
      const p = px(c.lane, c.col); pos[c.id] = p;
      const g = sv("g", {}, svg);
      const d = sv("circle", { cx: p.x, cy: p.y, r: 17, fill: lanes[c.lane].color, stroke: C("bg"), "stroke-width": 5 }, g);
      if (c.label) { const t = sv("text", { x: p.x, y: p.y + 54, "text-anchor": "middle" }, g); t.textContent = c.label; }
      gsap.set(g, { opacity: 0 });
      tl.fromTo(g, { opacity: 0, scale: 0.2, svgOrigin: `${p.x} ${p.y}` }, { opacity: 1, scale: 1, svgOrigin: `${p.x} ${p.y}`, duration: 0.45, ease: E("back"), immediateRender: false }, c.at);
      dots[c.id] = g;
    });
    const drawPath = (d, col, at, w, dash) => {
      const pth = sv("path", { d, fill: "none", stroke: col, "stroke-width": w || 5, "stroke-linecap": "round" }, svg);
      const len = pth.getTotalLength();
      pth.style.strokeDasharray = len; pth.style.strokeDashoffset = len;
      gsap.set(pth, { opacity: 0 });                         // наконечник marker-end не виден до отрисовки линии
      tl.set(pth, { opacity: 1 }, at);
      tl.to(pth, { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" }, at);
      return pth;
    };
    (o.edges || []).forEach((e) => {
      const a = pos[e.from], b2 = pos[e.to];
      let d;
      if (Math.abs(a.y - b2.y) < 1) d = `M${a.x} ${a.y}L${b2.x} ${b2.y}`;
      else { const dx = (b2.x - a.x) * 0.5; d = `M${a.x} ${a.y}C${a.x + dx} ${a.y} ${b2.x - dx} ${b2.y} ${b2.x} ${b2.y}`; }
      drawPath(d, e.color || C("git-main"), e.at, 5);
    });
    (o.arrows || []).forEach((ar, i) => {
      const a = ar.from.id ? pos[ar.from.id] : px(ar.from.lane, ar.from.col), b2 = ar.to.id ? pos[ar.to.id] : px(ar.to.lane, ar.to.col);
      const col = ar.color || C("ok");
      mkr(uid + i, col);
      const dy = b2.y > a.y ? -26 : 26, dx = b2.x === a.x ? 0 : (b2.x > a.x ? -26 : 26);
      const pth = drawPath(`M${a.x} ${a.y + (b2.y > a.y ? 26 : -26)}L${b2.x - dx * 0} ${b2.y + dy}`, col, ar.at, 6);
      pth.setAttribute("marker-end", `url(#${uid}${i})`);
      const mx = (a.x + b2.x) / 2, my = (a.y + b2.y) / 2;
      const g = sv("g", {}, svg);
      const w = ar.label.length * 17 + 36;
      sv("rect", { x: mx + 14, y: my - 24, width: w, height: 48, rx: 12, fill: C("panel"), stroke: col, "stroke-width": 2 }, g);
      const t = sv("text", { x: mx + 14 + w / 2, y: my + 10, "text-anchor": "middle" }, g); t.textContent = ar.label;
      show(g, ar.at + 0.3);
    });
    (o.badges || []).forEach((bd) => {
      const p = pos[bd.on];
      const g = sv("g", {}, svg);
      const w = bd.text.length * 17 + 36;
      sv("rect", { x: p.x + 34, y: p.y - 64, width: w, height: 48, rx: 24, fill: C("accent") }, g);
      const t = sv("text", { x: p.x + 34 + w / 2, y: p.y - 30, "text-anchor": "middle", style: `fill:${C("on-accent")};font-weight:700` }, g); t.textContent = bd.text;
      gsap.set(g, { opacity: 0 });
      const bo = `${p.x + 34 + w / 2} ${p.y - 40}`;
      tl.fromTo(g, { opacity: 0, scale: 0.6, svgOrigin: bo }, { opacity: 1, scale: 1, svgOrigin: bo, duration: 0.45, ease: E("back"), immediateRender: false }, bd.at);
    });
    return { svg, pos, out: (t) => tl.to(svg, { opacity: 0, duration: 0.4 }, t) };
  }

  window.Kit = {
    timeOf, endOf, speechEnd, layout: LAYOUT, scene, header, subtitles, kinetic, editor, keycard, screen, goals, aside, path, gitGraph,
    stageIn, stageOut, swap, popIn, popOut, icons: ICONS, token: css, mdClasses, mdRender, splitSpan, sentenceSpans,
  };
})();
