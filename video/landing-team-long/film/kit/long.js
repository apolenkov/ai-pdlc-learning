/* Помощники сцен «Один маршрут» (TASK-577): фигуры без лиц, иконки, линии с отрисовкой. Детерминированно: только S.tl. */
window.F = (function () {
  const NS = "http://www.w3.org/2000/svg";
  const C = { ok: "#3ccf91", acc: "#ff7a59", accS: "#ffb59f", info: "#7cc4ff", text: "#eef0f3", t2: "#a3a9b4", line: "#2a2f3a" };
  const ICONS = {
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
    box: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
    branch: '<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
    sitemap: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    cursor: '<path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    play: '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/>',
    flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    commit: '<circle cx="12" cy="12" r="4"/><path d="M2 12h6M16 12h6"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
  };
  const icon = (name, px, col, sw) => `<svg class="f-ic" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="${col || C.text}" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  // фигура человека без лица
  const person = (px, col, sw) => `<svg class="f-person" width="${px * 0.8}" height="${px}" viewBox="0 0 80 100" fill="none" stroke="${col || C.text}" stroke-width="${sw || 5}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="40" cy="26" r="18"/><path d="M10 96C10 68 22 56 40 56S70 68 70 96Z"/></svg>`;
  const setPos = (e, x, y, w, h) => { const s = e.style; s.left = x + "px"; s.top = y + "px"; if (w != null) s.width = w + "px"; if (h != null) s.height = h + "px"; return e; };
  // слой линий 1920×1080 поверх сцены; линии рисуются dashoffset (pathLength=1)
  const layer = (root) => { const svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "f-layer"); svg.setAttribute("viewBox", "0 0 1920 1080"); svg.setAttribute("data-layout-allow-overlap", ""); root.appendChild(svg); return svg; };
  const path = (svg, d, col, w, dash) => { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); p.setAttribute("fill", "none"); p.setAttribute("stroke", col || C.ok); p.setAttribute("stroke-width", w || 5); p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round"); p.setAttribute("pathLength", "1"); p.setAttribute("stroke-dasharray", dash || "1 2"); p.setAttribute("stroke-dashoffset", "1"); svg.appendChild(p); return p; };
  const draw = (tl, p, at, dur, ease) => tl.to(p, { strokeDashoffset: 0, duration: dur == null ? 0.8 : dur, ease: ease || "power1.inOut" }, at);
  const arrowHead = (svg, x, y, ang, col, size) => { const g = document.createElementNS(NS, "path"); const s = size || 14; g.setAttribute("d", `M ${-s} ${-s * 0.7} L 0 0 L ${-s} ${s * 0.7}`); g.setAttribute("fill", "none"); g.setAttribute("stroke", col || C.ok); g.setAttribute("stroke-width", 5); g.setAttribute("stroke-linecap", "round"); g.setAttribute("stroke-linejoin", "round"); g.setAttribute("transform", `translate(${x} ${y}) rotate(${ang})`); g.style.opacity = 0; svg.appendChild(g); return g; };
  return { C, icon, person, setPos, layer, path, draw, arrowHead, ICONS };
})();
/* Помощники сцен длинных роликов TASK-577. Детерминированно: только S.tl, без Math.random/Date. */
window.Long = (function () {
  const NAMES = ["Намерение", "Анализ", "Архитектура", "Реализация", "Тестирование", "Выпуск", "Наблюдение"];
  const W = 1728, PITCH = W / 7;
  function begin(id) {
    const S = Kit.scene(id), tl = S.tl;
    const DUR = parseFloat(S.root.getAttribute("data-duration")); // sync-dur обновляет атрибут по озвучке
    const el = (cls, html, parent) => { const d = document.createElement("div"); d.className = cls; if (html != null) d.innerHTML = html; (parent || S.root).appendChild(d); return d; };
    const show = (e, at, y) => { gsap.set(e, { autoAlpha: 0 }); tl.fromTo(e, { autoAlpha: 0, y: y == null ? 14 : y }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, at); return e; };
    const hide = (e, at) => tl.to(e, { autoAlpha: 0, duration: 0.35, ease: "power2.in" }, at);
    const at = (p, n, max) => Math.min(S.t(p, n), max == null ? DUR - 2 : max);
    const ctx = { S, tl, DUR, el, show, hide, at, t: S.t, root: S.root };
    ctx.head = (html, when) => show(el("lg-h", html), when == null ? 0.1 : when, 18);
    // вшитых субтитров нет (владелец 17.10 20:05): текст — дорожкой VTT в плеере
    ctx.fin = () => { S.finish(DUR); };
    // подсветка группы по репликам: items, starts — S.t(...) по порядку, end — конец последней реплики
    ctx.focus = (items, starts, end, o) => People.focus(S, items, starts, end == null ? DUR - 1.2 : end, o);
    // лента из 7 этапов; o: top, names, agent[], cls ("ok"|"acc"|""), links (bool), reveal: (i)=>время или null (показ сразу)
    ctx.ribbon = (o) => {
      const rail = el("lg-rail"); rail.style.top = o.top + "px";
      const names = o.names || NAMES, cx = (i) => PITCH * (i + 0.5), stops = [], nodes = [], links = [];
      names.forEach((n, i) => {
        if (i < 6) {
          const l = el("lg-link" + (o.cls === "ok" ? " ok" : ""), null, rail);
          l.style.left = cx(i) + 48 + "px"; l.style.width = PITCH - 96 + "px"; links.push(l);
        }
        const st = el("lg-stop", null, rail); st.style.left = cx(i) - 114 + "px";
        st.innerHTML = '<div class="lg-node ' + (o.cls || "") + '">' + ((o.agent || []).includes(i) ? '<span class="lg-spark">' + People.robotIcon(40) + '</span>' : "") + String(i + 1).padStart(2, "0") + '</div><div class="lg-lab">' + n + "</div>";
        stops.push(st); nodes.push(st.firstChild);
      });
      stops.forEach((st, i) => {
        const w = o.reveal ? o.reveal(i) : null;
        if (w == null) return;
        gsap.set(st, { autoAlpha: 0 });
        tl.fromTo(st, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, w);
        if (links[i]) { gsap.set(links[i], { autoAlpha: 0 }); tl.fromTo(links[i], { autoAlpha: 0, scaleX: 0.4 }, { autoAlpha: 1, scaleX: 1, duration: 0.4, ease: "power2.inOut", immediateRender: false }, w); }
      });
      return { rail, stops, nodes, links, cx: (i) => 96 + cx(i), pitch: PITCH };
    };
    // поштучная зарисовка из kit/sketches.js: wrapper на всю ширину ленты
    ctx.sketch = (name, top, when, dur, extra) => Kit.sketch(S, Object.assign({ name, x: 96, y: top, w: W, at: when, dur }, extra || {}));
    // зарисовка в произвольном месте кадра (px 1920×1080): рисуется штрих за штрихом с момента when
    ctx.pic = (name, x, y, w, when, dur) => Kit.sketch(S, { name, x, y, w, at: when, dur: dur || 3 });
    return ctx;
  }
  return { begin, NAMES, W, PITCH };
})();
