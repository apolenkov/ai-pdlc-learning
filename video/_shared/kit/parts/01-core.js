/* Набор компонентов «Студия» для HyperFrames. Детерминирован: нет Math.random, Date.now, fetch.
   Подключается в корне (index.html) после gsap. API: window.Kit. Подробности в kit/README.md. */
(function () {
  const gsap = window.gsap;
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- токены (читаются из kit/tokens.css) ---------- */
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const D = (n) => parseFloat(css("--k-dur-" + n));
  const E = (n) => css("--k-ease-" + n);
  const C = (n) => css("--k-" + n);
  const BLUR = () => `blur(${css("--k-blur")})`;

  /* ---------- DOM ---------- */
  const mk = (tag, cls, html, parent) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  const sv = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(e);
    return e;
  };
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const place = (el, o) => {
    el.style.left = (o.x || 0) + "px";
    el.style.top = (o.y || 0) + "px";
    if (o.w) el.style.width = o.w + "px";
    if (o.h) el.style.height = o.h + "px";
  };
  const hide0 = (el) => gsap.set(el, { autoAlpha: 0 });

  /* ---------- иконки (viewBox 56, currentColor) ---------- */
  const icon = (inner) => `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const ICONS = {
    file: icon('<path d="M12 8h22l12 12v28a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"/><path d="M33 8v13h13M18 32h20M18 40h14"/>'),
    views: icon('<rect x="5" y="10" width="20" height="36" rx="4"/><rect x="31" y="10" width="20" height="36" rx="4"/>'),
    same: icon('<path d="M10 20h36M10 36h36" stroke-width="5"/>'),
    check: icon('<path d="M10 29l12 12 24-26" stroke-width="5"/>'),
    folder: icon('<path d="M6 16a4 4 0 0 1 4-4h12l5 6h19a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z"/>'),
    save: icon('<path d="M10 8h28l8 8v32H10z"/><path d="M18 8v14h18V8M18 48V34h20v14"/>'),
    key: icon('<rect x="6" y="12" width="44" height="32" rx="7"/><path d="M16 36h24"/>'),
    branch: icon('<circle cx="14" cy="12" r="5"/><circle cx="14" cy="44" r="5"/><circle cx="42" cy="22" r="5"/><path d="M14 17v22M42 27c0 10-28 4-28 12"/>'),
    commit: icon('<circle cx="28" cy="28" r="9"/><path d="M4 28h15M37 28h15"/>'),
    merge: icon('<circle cx="14" cy="12" r="5"/><circle cx="14" cy="44" r="5"/><circle cx="42" cy="32" r="5"/><path d="M14 17v22M14 17c0 14 28 4 28 10"/>'),
    cloud: icon('<path d="M16 42a10 10 0 0 1-1-20 14 14 0 0 1 27 3 8.5 8.5 0 0 1-1 17z"/>'),
  };
  const folderSvg = (c) => `<svg width="56" height="56" viewBox="0 0 56 56"><path d="M5 14a4 4 0 0 1 4-4h12l5 6h21a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill="${c}"/></svg>`;
  const TILE_ICONS = {
    folder: () => folderSvg(C("accent")),
    folder2: () => folderSvg(C("accent-soft")),
    file: () => `<svg width="48" height="56" viewBox="0 0 48 56"><path d="M6 4h24l12 12v34a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="${C("info")}"/><path d="M30 4v12h12z" fill="${C("line")}"/></svg>`,
  };
  const arrowDown = () => `<svg class="k-down" viewBox="0 0 30 40" fill="none"><path d="M15 3v31M5 25l10 11 10-11" stroke="${C("text-2")}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* ---------- время по alignment ---------- */
  function norm(s) { return s.toLowerCase().replace(/ё/g, "е"); }
  function findIdx(align, phrase, n) {
    const text = align.characters.join("");
    let from = 0, idx = -1;
    for (let i = 0; i < (n || 1); i++) {
      idx = text.indexOf(phrase, from);
      if (idx < 0) idx = norm(text).indexOf(norm(phrase), from);
      if (idx < 0) throw new Error(`Kit.timeOf: фраза «${phrase}» (вхождение ${n || 1}) не найдена в тексте озвучки`);
      from = idx + 1;
    }
    return idx;
  }
  const timeOf = (align, phrase, n) => align.character_start_times_seconds[findIdx(align, phrase, n)];
  const endOf = (align, phrase, n) => align.character_end_times_seconds[findIdx(align, phrase, n) + phrase.length - 1];
  const speechEnd = (align) => align.character_end_times_seconds[align.character_end_times_seconds.length - 1];

  /* ---------- сцена ---------- */
  function scene(id) {
    const root = document.querySelector(`[data-composition-id="scene-${id}"]`);
    if (!root) throw new Error("Kit.scene: нет элемента data-composition-id=scene-" + id);
    const align = window.ALIGN && window.ALIGN[id];
    if (!align) throw new Error("Kit.scene: нет window.ALIGN['" + id + "'] (подключите assets/vo/scene-" + id + ".alignment.js)");
    const tl = gsap.timeline({ paused: true });
    const S = {
      id, root, tl, align,
      speechEnd: speechEnd(align),
      $: (s) => root.querySelector(s),
      t: (p, n) => timeOf(align, p, n),
      end: (p, n) => endOf(align, p, n),
      stage(cls) { const s = mk("div", "k-stage " + (cls || ""), null, root); hide0(s); return s; },
      finish(duration) {
        tl.to({}, { duration: 0.001 }, duration - 0.001);
        window.__timelines = window.__timelines || {};
        window.__timelines["scene-" + id] = tl;
        tl.seek(0);
        return tl;
      },
    };
    return S;
  }
  const P = (S, p) => (!p ? S.root : typeof p === "string" ? S.root.querySelector(p) : p);

  /* ---------- общие движения ---------- */
  const stageIn = (S, el, t) => S.tl.fromTo(el, { autoAlpha: 0, scale: parseFloat(css("--k-scale-in")), filter: BLUR() }, { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: D("in"), ease: E("out"), immediateRender: false }, t);
  const stageOut = (S, el, t) => S.tl.to(el, { autoAlpha: 0, scale: parseFloat(css("--k-scale-out")), filter: BLUR(), duration: D("out"), ease: E("in") }, t);
  /* Переход между частями: старая сцена уходит за D(out), новая входит сразу после. */
  const swap = (S, outEl, inEl, t) => { stageOut(S, outEl, t); stageIn(S, inEl, t + D("out") - 0.05); return t + D("out") - 0.05; };
  const popIn = (S, el, t, d) => S.tl.fromTo(el, { autoAlpha: 0, y: 36, scale: 0.94, filter: "blur(10px)" }, { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: d || D("pop"), ease: E("out"), immediateRender: false }, t);
  const popOut = (S, el, t) => S.tl.to(el, { autoAlpha: 0, scale: 1.04, filter: "blur(10px)", duration: 0.4, ease: E("in") }, t);

  function kinetic(S, o) {
    const el = mk("div", "k-kin " + (o.cls || ""), null, P(S, o.parent));
    el.setAttribute("data-layout-allow-overflow", "");
    place(el, o);
    hide0(el);
    S.tl.set(el, { autoAlpha: 1 }, o.at);
    el.style.fontSize = (o.size || parseFloat(css("--k-fs-kin"))) + "px";
    if (o.color) el.style.color = o.color;
    o.text.split(" ").forEach((w, i, a) => {
      mk("span", "k-w", `<span class="k-wi">${esc(w)}</span>`, el);
      if (i < a.length - 1) el.appendChild(document.createTextNode(" "));
    });
    const wi = el.querySelectorAll(".k-wi");
    gsap.set(wi, { yPercent: 118 });
    const st = o.stagger != null ? o.stagger : parseFloat(css("--k-stagger-word"));
    S.tl.to(wi, { yPercent: 0, duration: o.dur || D("word"), ease: E("word"), stagger: st }, o.at);
    return { el, out: (t) => S.tl.to(wi, { yPercent: -118, duration: 0.45, ease: E("in"), stagger: 0.05 }, t) };
  }

