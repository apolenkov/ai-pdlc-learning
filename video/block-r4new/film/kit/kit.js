/* СГЕНЕРИРОВАНО из video/_shared/kit/parts/*.js (node video/_shared/build-kit.mjs). Руками не править. */
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

  /* ---------- шапка ---------- */
  /* Два блока по половине шагов («На компьютере» 1–7, «В GitLab» 8–14), подписи над ними, строка «Шаг N из 14 · осталось M».
     Слои сегмента: cur (фон текущего), fill (залит акцентом = пройден), ring (контур+свечение), trk (полоска прогресса шага).
     o.enter — заставка шага: мягкий переход из состояния предыдущей сцены (предыдущий сегмент остывает в «пройден», новый зажигается). */
  const SEG = {
    off: { cur: 0, fill: 0, ring: 0, trk: 0, fg: () => C("seg-off-fg") },
    cur: { cur: 1, fill: 0, ring: 1, trk: 1, fg: () => C("text") },
    done: { cur: 0, fill: 1, ring: 0, trk: 0, fg: () => C("on-accent") },
  };
  function header(S, o) {
    o = { ...window.KIT_SCENES?.[S.id], ...o };
    const config = o.header || {};
    const parts = config.mode === "parts" || o.mode === "parts";
    const total = config.total || o.total || 14, half = Math.ceil(total / 2);
    const noStep = o.step == null;
    const mode = noStep ? (o.mode === "parts" ? "done" : o.mode) || "done" : "step";   // step: null → «done» (все пройдены) или «intro» (вступление, все впереди)
    const left = (n) => (n >= total ? "последний шаг" : `осталось ${total - n}`);
    const label = (m, n) => parts
      ? (m === "intro" ? `<b>${total} частей</b>` : m === "done" ? `<b>Готово</b>` : `<b>Часть ${n} ·</b>`)
      : m === "intro" ? `<b>${total} шагов в двух частях</b>`
      : m === "done" ? `<b>Готово</b>`
      : `<b>Шаг ${n}</b><span> · ${left(n)}</span>`;
    const stOf = (i, m, n) => m === "intro" ? "off" : m === "done" ? "done" : i < n ? "done" : i === n ? "cur" : "off";
    const blocks = parts ? [[o.chapter || o.title || "", 1, total]] : [["На компьютере", 1, half], ["В GitLab", half + 1, total]];
    const lab = (bi, m, n) => (!parts && m === "step" && (n > half ? 1 : 0) !== bi ? C("text-2") : C("text"));
    const prev = !o.enter ? null : noStep ? (mode === "done" ? { m: "step", n: total } : null) : o.step > 1 ? { m: "step", n: o.step - 1 } : { m: "intro" };
    const ease = E("out"), AT = 0.15, DUR = 0.6;
    const pr = o.progress || [0, 1];

    const box = mk("div", "k-header" + (parts ? " k-header-parts" : ""), null, S.root);
    const stepEl = mk("div", "k-step", null, box);
    const prog = mk("div", "k-prog", null, box);
    const cur = noStep ? { m: mode } : { m: "step", n: o.step };
    const lNew = mk("div", "k-hs", label(cur.m, cur.n), stepEl);
    if (prev) {
      const lOld = mk("div", "k-hs", label(prev.m, prev.n), stepEl);
      S.tl.fromTo(lOld, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: E("in") }, AT - 0.05);
      S.tl.fromTo(lNew, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: DUR, ease }, AT);
    }
    blocks.forEach(([name, a, b], bi) => {
      const grp = mk("div", "k-pg", null, prog);
      const pl = mk("div", "k-pl" + (parts ? " k-chapter" : ""), parts ? `<b>${esc(name)}</b>` : `<b>${esc(name)}</b><span>шаги ${a}–${b}</span>`, parts ? stepEl : grp);
      const from = prev ? lab(bi, prev.m, prev.n) : lab(bi, cur.m, cur.n), to = lab(bi, cur.m, cur.n);
      pl.firstChild.style.color = from;
      if (from !== to) S.tl.fromTo(pl.firstChild, { color: from }, { color: to, duration: DUR, ease }, AT);
      const row = mk("div", "k-pr", null, grp);
      for (let i = a; i <= b; i++) {
        const seg = mk("div", "k-sg", '<span class="k-sg-cur"></span><span class="k-sg-fill"></span><span class="k-sg-ring"></span><span class="k-sg-trk"><i></i></span><em>' + i + "</em>", row);
        const q = (c) => seg.querySelector(c);
        const lay = { cur: q(".k-sg-cur"), fill: q(".k-sg-fill"), ring: q(".k-sg-ring"), trk: q(".k-sg-trk"), fg: q("em") };
        const s1 = stOf(i, cur.m, cur.n), s0 = prev ? stOf(i, prev.m, prev.n) : s1;
        const set = (k, st) => gsap.set(lay[k], k === "fg" ? { color: SEG[st].fg() } : { opacity: SEG[st][k] });
        Object.keys(lay).forEach((k) => set(k, s0));
        if (s0 !== s1) {
          Object.keys(lay).forEach((k) => {
            const v = k === "fg" ? { color: SEG[s1].fg() } : { opacity: SEG[s1][k] };
            if (k === "ring") S.tl.fromTo(lay.ring, { scale: s1 === "cur" ? 1.2 : 1 }, { scale: 1, duration: DUR, ease }, AT);
            S.tl.to(lay[k], { ...v, duration: DUR, ease }, AT);
          });
        }
        const bar = q(".k-sg-trk i");
        if (s1 === "cur") S.tl.fromTo(bar, { scaleX: pr[0] }, { scaleX: pr[1], duration: o.duration, ease: "none" }, 0);
        else if (s0 === "cur") gsap.set(bar, { scaleX: 1 });
      }
    });
    if (o.enter && !prev) S.tl.fromTo(box, { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.7, ease }, 0.2);   // вступление: шапка появляется впервые
    const wrap = mk("div", "k-part", null, S.root);
    wrap.setAttribute("data-layout-allow-overflow", "");
    const vs = (o.parts || []).map((p) => mk("div", "k-part-v", p.blank ? "" : esc(p.name || `Часть ${p.n}`), wrap));   // blank: подпись состояния не нужна (она пересказывала бы шапку)
    gsap.set(vs, { yPercent: 115, autoAlpha: 0 });   // скрыты до своего момента: не «лежат» под окнами записи
    (o.parts || []).forEach((p, i) => {
      const at = i === 0 ? Math.max(p.at, 0.1) : p.at;
      if (i > 0) {
        S.tl.to(vs[i - 1], { yPercent: -115, duration: 0.5, ease: E("in") }, at - 0.35);
        S.tl.set(vs[i - 1], { autoAlpha: 0 }, at + 0.15);
      }
      S.tl.set(vs[i], { autoAlpha: 1 }, at);
      S.tl.to(vs[i], { yPercent: 0, duration: D("pop"), ease: E("out") }, at);
    });
    return { box, wrap };
  }

  /* ---------- субтитры ---------- */
  function sentenceSpans(text) {
    const out = [];
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      if (!".!?…".includes(text[i])) continue;
      let j = i; while (j + 1 < text.length && "»\"”')".includes(text[j + 1])) j++;   // закрывающие кавычки/скобки входят в предложение
      if (j === text.length - 1 || /\s/.test(text[j + 1])) { out.push([start, j]); start = j + 1; i = j; }
    }
    if (text.slice(start).trim()) out.push([start, text.length - 1]);
    return out.map(([a, b]) => { while (/\s/.test(text[a])) a++; while (/\s/.test(text[b])) b--; return [a, b]; });
  }
  function splitSpan(text, a, b, max) {
    if (b - a + 1 <= max) return [[a, b]];
    const cands = [];
    for (let k = a; k < b; k++) {
      if (",:;".includes(text[k]) && text[k + 1] === " ") cands.push([k, k + 2]);
      else if (text[k] === " " && text[k + 1] === "—" && text[k + 2] === " ") cands.push([k - 1, k + 1]);
    }
    let best = null;
    cands.forEach(([le, rs]) => {
      const l = le - a + 1, r = b - rs + 1;
      if (l < 10 || r < 10) return;
      const sc = Math.abs(l - r);
      if (!best || sc < best.sc) best = { le, rs, sc };
    });
    if (!best) {
      const mid = a + Math.floor((b - a) / 2);
      let k = mid;
      while (k > a && text[k] !== " ") k--;
      best = { le: k - 1, rs: k + 1 };
    }
    return splitSpan(text, a, best.le, max).concat(splitSpan(text, best.rs, b, max));
  }
  const SUB_FIX = (s) => s.replace(/[Оо]пенспек(?:а|у|е|ом)?/g, "OpenSpec").replace(/«ориджин»/g, "«origin»"); // озвучка по-русски, на экране — как на странице
  /* Озвучка записана по-русски («Гитлаб», «эс-ди-ди»), на экране — как на страницах («GitLab», «SDD»): словарь terms.json. */
  function backSub(s) {
    for (const [from, to] of window.KIT_TERMS || []) s = s.replace(new RegExp(`(?<![\\p{L}\\p{N}])${from}(?![\\p{L}\\p{N}])`, "giu"), to);
    // короткий предлог не остаётся в конце строки субтитра: неразрывный пробел после него
    return s.replace(/(?<![\p{L}\p{N}])(в|во|к|ко|с|со|у|о|об|от|по|на|до|за|из)[ \t]+/giu, "$1\u00a0");
  }
  function subtitles(S, o) {
    o = o || {};
    const max = o.maxChars || 62, hold = o.hold != null ? o.hold : 0.35;
    const text = S.align.characters.join("").replace(/(?<![\p{L}\p{N}])(в|во|к|ко|с|со|у|о|об|от|по|на|до|за|из)[ \t]+/giu, (m) => m.replace(/[ \t]+$/, "\u00a0"));   // длина та же: индексы выравнивания не сдвигаются; предлог не оказывается в конце реплики
    const st = S.align.character_start_times_seconds, en = S.align.character_end_times_seconds;
    const box = mk("div", "k-subs", null, S.root);
    box.setAttribute("data-layout-allow-caption-zone", ""); // субтитры живут в нижней полосе; остальной контент — выше SAFE_BOTTOM (tools/scene.mjs check)
    const cues = [];
    sentenceSpans(text).forEach(([a, b]) => {
      const parts = splitSpan(text, a, b, max);
      parts.forEach(([pa, pb], i) => {
        const start = st[pa];
        const end = i < parts.length - 1 ? st[parts[i + 1][0]] : en[pb] + hold;
        cues.push({ text: backSub(SUB_FIX(text.slice(pa, pb + 1))), start, end });
      });
    });
    cues.forEach((c, i) => {
      const el = mk("div", "k-sub", `<div class="k-sub-pill">${esc(c.text)}</div>`, box);
      hide0(el);
      const next = cues[i + 1];
      const end = next ? Math.min(c.end, next.start - 0.02) : c.end;
      S.tl.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: E("out"), immediateRender: false }, c.start);
      S.tl.to(el, { autoAlpha: 0, duration: 0.2, ease: E("in") }, Math.max(end - 0.2, c.start + 0.3));
    });
    S.cues = cues;
    return cues;
  }

  /* ---------- Markdown: подсветка и оформленный вид ---------- */
  function mdClasses(l) {
    const a = new Array(l.length).fill("");
    let m, start = 0;
    if ((m = /^(#{1,6}) /.exec(l))) { for (let i = 0; i < l.length; i++) a[i] = i < m[1].length ? "t-mark" : "t-head"; return a; }
    if (/^```/.test(l)) return a.fill("t-fence");
    if (/^[-*] /.test(l)) { a[0] = "t-dash"; start = 2; }
    else if ((m = /^(\d+\.) /.exec(l))) { for (let i = 0; i < m[1].length; i++) a[i] = "t-dash"; start = m[1].length + 1; }
    else if (l.startsWith("> ")) return a.fill("t-quote");
    const apply = (re, fn) => { re.lastIndex = start; let x; while ((x = re.exec(l))) fn(x); };
    apply(/\[([^\]]*)\]\(([^)]*)\)/g, (x) => {
      const s = x.index, e1 = s + 1 + x[1].length;
      for (let i = s; i < s + x[0].length; i++) a[i] = i === s || i === e1 || i === e1 + 1 || i === s + x[0].length - 1 ? "t-br" : i < e1 ? "t-link" : "t-url";
    });
    apply(/\*\*([^*]+)\*\*/g, (x) => { for (let i = x.index; i < x.index + x[0].length; i++) a[i] = "t-bold"; });
    apply(/`([^`]+)`/g, (x) => { for (let i = x.index; i < x.index + x[0].length; i++) a[i] = "t-code"; });
    return a;
  }
  function mdInline(s) {
    return esc(s).replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<span class="lk">$1</span>').replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
  }
  function mdRender(l) {
    let m;
    if ((m = /^(#{1,6}) (.*)$/.exec(l))) return { kind: m[1].length === 1 ? "h1" : "h2", html: mdInline(m[2]) };
    if ((m = /^[-*] (.*)$/.exec(l))) return { kind: "li", html: mdInline(m[1]) };
    if ((m = /^> (.*)$/.exec(l))) return { kind: "q", html: mdInline(m[1]) };
    return { kind: "p", html: mdInline(l) };
  }
  function rowsFor(text, cpr) {
    if (!text.length) return 1;
    let rows = 1, cur = 0;
    text.split(" ").forEach((w, i) => {
      const need = (i ? 1 : 0) + w.length;
      if (cur + need > cpr && cur > 0) { rows++; cur = w.length; } else cur += need;
    });
    return rows;
  }

  /* ---------- окно редактора ---------- */
  function editor(S, o) {
    const tl = S.tl;
    const win = mk("div", "k-win k-ed", null, P(S, o.parent));
    place(win, o);
    if (!o.visible) hide0(win);
    const bar = mk("div", "k-ed-bar", null, win);
    mk("div", "k-dots", "<i></i><i></i><i></i>", bar);
    if (o.crumb) mk("div", "k-ed-crumb", esc(o.crumb), bar);
    const tabsEl = mk("div", "k-ed-tabs", null, win);
    const tabs = (o.tabs || [{ name: "intent.md", active: true }]).map((t) => mk("div", "k-ed-tab" + (t.active ? " on" : ""), `<span class="ic"></span>${esc(t.name)}<span class="dot"></span>`, tabsEl));
    const codeEl = mk("div", "k-ed-code", null, win);
    const lh = parseFloat(css("--k-lh-code")), fs = parseFloat(css("--k-fs-code"));
    const cpr = Math.floor((o.w - 84 - 24 - 2) / (fs * 0.6));
    const rows = o.lines.map((ln, i) => {
      const raw = typeof ln === "string" ? ln : ln.t, add = typeof ln === "object" && !!ln.add;
      const row = mk("div", "k-ln" + (add ? " add" : ""), null, codeEl);
      const no = mk("span", "k-no", String(i + 1), row);
      const tx = mk("span", "k-tx", null, row);
      const cls = mdClasses(raw);
      const chars = [...raw].map((ch, j) => mk("span", "k-c" + (cls[j] ? " " + cls[j] : ""), esc(ch), tx));
      return { raw, add, row, no, tx, chars, h: rowsFor(raw, cpr) * lh };
    });
    let blink = null;
    const endBlink = (at) => {
      if (!blink) return;
      for (let t = blink.from + 0.5; t + 0.5 < at; t += 1.0) { tl.set(blink.k, { opacity: 0 }, t); tl.set(blink.k, { opacity: 1 }, t + 0.5); }
      tl.set(blink.k, { opacity: 0 }, at);
      blink = null;
    };
    function typeRows(idxs, t0, t1, lead) {
      endBlink(t0);
      const cost = idxs.map((i) => rows[i].chars.length + 5);
      const total = cost.reduce((a, b) => a + b, 0);
      let acc = 0;
      idxs.forEach((i, n) => {
        const r = rows[i];
        const T = (c) => t0 + (c / total) * (t1 - t0);
        const tStart = T(acc);
        tl.set(r.no, { opacity: 1 }, tStart);
        const len = r.chars.length;
        for (let j = 0; j <= len; j++) {
          const k = mk("i", "k-k", null, null);
          r.tx.insertBefore(k, j < len ? r.chars[j] : null);
          const on = j === 0 ? (n === 0 ? tStart - (lead != null ? lead : 0.4) : tStart) : T(acc + j);
          const last = n === idxs.length - 1 && j === len;
          tl.set(k, { opacity: 1 }, on);
          if (last) blink = { k, from: on };
          else tl.set(k, { opacity: 0 }, j < len ? T(acc + j + 1) : T(acc + cost[n]));
          if (j < len) tl.set(r.chars[j], { opacity: 1 }, T(acc + j + 1));
        }
        acc += cost[n];
      });
    }
    const ed = {
      el: win, rows, tabs,
      show: (at) => stageInSoft(S, win, at),
      hide: (at) => popOut(S, win, at),
      /* Печать строк from..to (включительно, без add-строк) в интервале t0..t1 (t1 не задан — по --k-type-dur-per-char). */
      type(from, to, t0, t1) {
        const idxs = [];
        for (let i = from; i <= to; i++) if (!rows[i].add) idxs.push(i);
        const chars = idxs.reduce((a, i) => a + rows[i].chars.length + 5, 0);
        typeRows(idxs, t0, t1 != null ? t1 : t0 + chars * parseFloat(css("--k-type-dur-per-char")));
        return ed;
      },
      /* Мгновенно показать строки from..to (уже «напечатанный» текст). */
      reveal(from, to, at) {
        for (let i = from; i <= to; i++) { tl.set(rows[i].no, { opacity: 1 }, at); tl.set(rows[i].chars, { opacity: 1 }, at); }
        return ed;
      },
      caretOff: (at) => endBlink(at),
      mark(i, at, m) {
        m = m || {};
        const r = rows[i];
        if (!r.hl) { r.hl = mk("div", "k-hl" + (m.tone === "ok" ? " ok" : ""), null, r.row); gsap.set(r.hl, { opacity: 0 }); }
        tl.to(r.hl, { opacity: 1, duration: 0.4 }, at);
        if (m.off != null) tl.to(r.hl, { opacity: 0, duration: 0.5 }, m.off);
        return ed;
      },
      /* Морфинг строки Markdown в оформленный вид (одна строка редактора). */
      morph(i, at, m) {
        m = m || {};
        const r = rows[i];
        if (!r.ov) {
          const v = mdRender(r.raw);
          r.ov = mk("div", "k-ov " + v.kind, v.html, r.row);
          r.ov.setAttribute("data-layout-allow-overlap", "");
          r.tx.setAttribute("data-layout-allow-overlap", "");
          gsap.set(r.ov, { opacity: 0 });
        }
        tl.to(r.tx, { opacity: 0, filter: "blur(8px)", duration: 0.45, ease: E("in") }, at);
        tl.fromTo(r.ov, { opacity: 0, y: 8, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: E("out"), immediateRender: false }, at + 0.1);
        return ed;
      },
      unmorph(i, at) {
        const r = rows[i];
        tl.to(r.ov, { opacity: 0, filter: "blur(8px)", duration: 0.4, ease: E("in") }, at);
        tl.to(r.tx, { opacity: 1, filter: "blur(0px)", duration: 0.45, ease: E("out") }, at + 0.1);
        return ed;
      },
      /* Добавленная строка (lines[i] = {t, add:true}): раскрывается, печатается, подсвечивается зелёным как diff. */
      addLine(i, at, m) {
        m = m || {};
        const r = rows[i];
        tl.fromTo(r.row, { height: 0 }, { height: r.h, duration: 0.35, ease: E("out"), immediateRender: false }, at);
        r.hl = r.hl || mk("div", "k-hl ok", null, r.row);
        gsap.set(r.hl, { opacity: 0 });
        r.plus = mk("span", "plus", "+", r.row);
        gsap.set(r.plus, { opacity: 0 });
        tl.to([r.hl, r.plus], { opacity: 1, duration: 0.3 }, at);
        if (m.type !== false) typeRows([i], at + 0.35, at + 0.35 + (m.dur || 0.9));
        else { tl.set(r.no, { opacity: 1 }, at); tl.set(r.chars, { opacity: 1 }, at); }
        if (m.off != null) ed.diffOff(i, m.off);
        return ed;
      },
      diffOff(i, at) { const r = rows[i]; tl.to([r.hl, r.plus], { opacity: 0, duration: 0.5 }, at); return ed; },
      dirty(at, on, tab) { tl.to(tabs[tab || 0].querySelector(".dot"), { opacity: on === false ? 0 : 1, backgroundColor: C("accent"), duration: 0.3 }, at); return ed; },
      saved(at, tab) { tl.to(tabs[tab || 0].querySelector(".dot"), { opacity: 1, backgroundColor: C("ok"), duration: 0.3 }, at); return ed; },
      move(at, m) { tl.to(win, { x: m.x || 0, y: m.y || 0, duration: m.dur || 0.9, ease: E("inout") }, at); return ed; },
    };
    if (o.offsetX || o.offsetY) gsap.set(win, { x: o.offsetX || 0, y: o.offsetY || 0 });
    return ed;
  }
  /* Появление окна (переход blur+scale), позиция transform сохраняется. */
  function stageInSoft(S, el, t) {
    return S.tl.fromTo(el, { autoAlpha: 0, scale: 0.96, filter: BLUR() }, { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: D("in"), ease: E("out"), immediateRender: false }, t);
  }

  /* ---------- карточка тактов клавиш ---------- */
  function capsRow(parent, keys) {
    const row = mk("div", "k-keys", null, parent), caps = [];
    keys.forEach((k, i) => {
      if (i) mk("span", "k-plus", "+", row);
      caps.push(mk("div", "k-cap", esc(k), row));
    });
    return caps;
  }
  function keycard(S, o) {
    const tl = S.tl;
    const box = mk("div", "k-kc", null, P(S, o.parent));
    place(box, { x: o.x, y: o.y, w: o.w || 440 });
    hide0(box);
    const flow = o.layout ? o.layout === "flow" : o.variants.some((v) => v.next);
    const L = Object.assign({ together: "Нажмите вместе", release: "Отпустите обе клавиши", then: "Нажмите" }, o.labels);
    if (!flow) box.classList.add("k-kc-stack");
    const V = {};
    let cur = o.variants[0].id;
    o.variants.forEach((v, idx) => {
      const x = { v };
      if (flow) {
        x.wrap = mk("div", "k-kc-flow", null, box);
        mk("div", "k-pill" + (v.id === "mac" ? " mac" : ""), esc(v.label), x.wrap);
        const c1 = mk("div", "k-card k-kcard", `<div class="cap-l">${esc(L.together)}</div>`, x.wrap);
        x.caps1 = capsRow(c1, v.press);
        if (v.next) {
          x.a1 = mk("div", null, arrowDown(), x.wrap);
          x.c2 = mk("div", "k-card k-kcard txt", esc(L.release), x.wrap);
          x.a2 = mk("div", null, arrowDown(), x.wrap);
          const c3 = mk("div", "k-card k-kcard", `<div class="cap-l">${esc(L.then)}</div>`, x.wrap);
          x.c3 = c3;
          x.caps3 = capsRow(c3, v.next);
          gsap.set([x.a1, x.c2, x.a2, x.c3], { autoAlpha: 0 });
        }
        if (idx > 0) hide0(x.wrap);
      } else {
        x.card = mk("div", "k-card k-kcard", `<div class="cap-l">${esc(v.label)}</div>`, box);
        x.caps1 = capsRow(x.card, v.press);
        hide0(x.card);
      }
      V[v.id] = x;
    });
    const down = (caps, t) => tl.to(caps, { y: 7, backgroundColor: C("key-press-bg"), color: C("key-press-fg"), borderBottomWidth: 1, duration: D("press"), ease: E("out") }, t);
    const up = (caps, t) => tl.to(caps, { y: 0, backgroundColor: C("key-bg"), color: C("text"), borderBottomWidth: 8, duration: D("release"), ease: E("out") }, t);
    const kc = {
      el: box,
      show(at, id) {
        popIn(S, box, at);
        if (!flow) o.variants.forEach((v, i) => popIn(S, V[v.id].card, at + i * 0.25));
        else cur = id || cur;
        return kc;
      },
      hide: (at) => { popOut(S, box, at); return kc; },
      /* Одиночное сочетание: нажать и отпустить за hold с. Цепочка: нажать и держать до release(). */
      press(id, at, hold) {
        const caps = V[id].caps1;
        down(caps, at);
        if (hold != null) up(caps, at + hold);
        return kc;
      },
      release(id, at) {
        const x = V[id];
        up(x.caps1, at);
        popIn(S, x.a1, at + 0.05, 0.4);
        popIn(S, x.c2, at + 0.15, 0.5);
        tl.set(x.c2, { borderColor: C("accent") }, at + 0.15);
        return kc;
      },
      then(id, at, hold) {
        const x = V[id];
        popIn(S, x.a2, at, 0.4);
        popIn(S, x.c3, at + 0.1, 0.5);
        down(x.caps3, at + 0.4);
        up(x.caps3, at + 0.4 + (hold != null ? hold : 0.7));
        return kc;
      },
      switchTo(id, at) {
        tl.to(V[cur].wrap, { autoAlpha: 0, y: -24, duration: 0.4, ease: E("in") }, at);
        tl.fromTo(V[id].wrap, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: E("out"), immediateRender: false }, at + 0.35);
        cur = id;
        return kc;
      },
    };
    return kc;
  }

  /* ---------- кадр записи экрана ---------- */
  /* Раскладки кадра записи (px кадра 1920x1080). left: окно слева, колонка подсказок справа (x 1304, w 520);
     wide: общий план по центру ~1500 px без колонки, подсказки кладут поверх снизу. */
  const LAYOUT = {
    left: { x: 96, y: 240, w: 1180, maxH: 705 },
    wide: { x: 210, y: 200, w: 1500, maxH: 740 },
    rightX: 1304, rightW: 520,
  };
  function screen(S, o) {
    const tl = S.tl;
    const NW = o.natural.w, NH = o.natural.h;
    const L = LAYOUT[o.layout || "left"];
    const X = o.x != null ? o.x : L.x, Y = o.y != null ? o.y : L.y, W = o.w != null ? o.w : L.w;
    const maxH = o.h != null ? o.h : L.maxH;  // полная высота окна с шапкой; выше — кадр обрезается по камере
    const vw = W - 2, b = vw / NW;
    const vh = Math.min(Math.round(NH * b), maxH - 42);
    const shadow = mk("div", "k-scr-shadow", null, P(S, o.parent));
    shadow.setAttribute("data-layout-allow-caption-zone", "");   // тень-ореол окна: декор, расходится за рамку при движении камеры
    place(shadow, { x: X, y: Y, w: W, h: vh + 42 });
    const win = mk("div", "k-win k-scr", null, P(S, o.parent));
    place(win, { x: X, y: Y, w: W });
    mk("div", "k-scr-bar", '<div class="k-dots"><i></i><i></i><i></i></div>', win);
    const view = mk("div", "k-scr-view", null, win);
    view.style.width = vw + "px"; view.style.height = vh + "px";
    const layer = mk("div", "k-scr-layer", null, view);
    layer.style.width = NW + "px"; layer.style.height = NH + "px";
    let vclicks = null;
    if (o.video) {
      // data-duration в разметке = сколько показывать запись; если файл короче, после его конца держится последний кадр (проверено рендером).
      const vs = o.video.start || 0, vd = o.video.duration;
      // <video> должен быть в статической разметке сцены (сборщик находит его до запуска скриптов): здесь он только переносится в слой.
      const v = typeof o.video.el === "string" ? S.root.querySelector(o.video.el) : o.video.el;
      if (!v || v.tagName !== "VIDEO") throw new Error("Kit.screen: video.el — селектор статического <video> в разметке сцены");
      const hs = parseFloat(v.getAttribute("data-start")), hd = parseFloat(v.getAttribute("data-duration"));
      if (Math.abs(hs - vs) > 0.05 || Math.abs(hd - vd) > 0.05) throw new Error(`Kit.screen: data-start/data-duration в разметке (${hs}/${hd}) не совпадают с video.start/duration (${vs}/${vd}); впишите в разметку ${vs.toFixed(2)} и ${vd}`);
      v.muted = true; v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("preload", "auto");
      layer.appendChild(v);
      // video.poster — первый кадр записи (ffmpeg -i x.mp4 -frames:v 1 x.first.png): виден, пока видео скрыто (до data-start).
      // Это фон слоя, а не <img>: соседние <img> в слое ломают подстановку кадров видео при рендере.
      if (o.video.poster) layer.style.background = `url("${o.video.poster}") 0 0 / 100% 100% no-repeat`;
      let vc = o.video.clicks;
      if (typeof vc === "string") vc = (window.CLICKS || {})[vc];
      if (vc && vc.length) vclicks = vc.map((c) => Object.assign({}, c, { t: c.t + vs })); // t клика — время записи, сдвигаем на start
    } else {
      const im = mk("img", null, null, layer); im.src = o.src; im.alt = o.alt || "";
    }
    gsap.set(layer, { scale: b, x: 0, y: Math.min(0, vh - b * NH) / 2 });
    hide0([shadow, win]);
    const camState = (c) => {
      const k = b * c.scale;
      let x = vw / 2 - k * c.cx, y = vh / 2 - k * c.cy;
      x = Math.min(0, Math.max(vw - k * NW, x));
      y = Math.min(0, Math.max(vh - k * NH, y));
      return { scale: k, x, y };
    };
    const scr = {
      win, shadow, view, layer, b, vw, vh,
      show(at, instant) {
        // instant: окно видно с первого кадра сцены (без появления из пустоты на t=0)
        if (instant) { gsap.set(win, { autoAlpha: 1, scale: 1, filter: "none" }); gsap.set(shadow, { autoAlpha: 1 }); return scr; }
        stageInSoft(S, win, at); tl.fromTo(shadow, { autoAlpha: 0 }, { autoAlpha: 1, duration: D("in"), ease: E("out"), immediateRender: false }, at); return scr; },
      hide(at) { popOut(S, win, at); tl.to(shadow, { autoAlpha: 0, duration: 0.4 }, at); return scr; },
      /* Камера: центр (cx,cy) в пикселях записи, масштаб относительно «весь кадр» (1 = целиком). */
      camera(at, c, dur, ease) {
        const d = dur != null ? dur : D("cam"), e = ease || E("inout");
        const state = camState(c);
        // Check the actual clamped viewport: short windows show less than NH / scale.
        for (const r of c.protect || []) {
          if (![r.x, r.y, r.w, r.h, c.cx, c.cy, c.scale].every(Number.isFinite) || r.w <= 0 || r.h <= 0 || c.scale <= 0 ||
              r.x * state.scale + state.x < -1e-6 || r.y * state.scale + state.y < -1e-6 ||
              (r.x + r.w) * state.scale + state.x > vw + 1e-6 || (r.y + r.h) * state.scale + state.y > vh + 1e-6) {
            throw new Error(`Kit.screen: camera at ${at}s cuts protect ${JSON.stringify(r)}`);
          }
        }
        tl.to(layer, Object.assign(state, { duration: d, ease: e }), at);
        const par = 1 + 0.015 * (c.scale - 1);
        tl.to(win, { scale: par, x: -10 * (c.scale - 1) / 1.2, duration: d, ease: e }, at);
        tl.to(shadow, { scale: 1 + 0.07 * (c.scale - 1) / 1.2, y: 14 * (c.scale - 1) / 1.2, x: -22 * (c.scale - 1) / 1.2, duration: d, ease: e }, at);
        return scr;
      },
      /* Подписи над областями кадра (x0..x1 в пикселях записи). */
      areas(items) {
        items.forEach((it) => {
          const l = X + 1 + it.x0 * b, w = (it.x1 - it.x0) * b;
          const col = it.tone === "ok" ? C("ok") : C("accent-soft");
          const lab = mk("div", "k-area", esc(it.text), P(S, o.parent));
          lab.style.top = Y - 66 + "px"; lab.style.color = col;
          if (it.align === "right") lab.style.left = l + w - 0 + "px"; else lab.style.left = l + "px";
          if (it.align === "right") lab.style.transform = "translateX(-100%)";
          const br = mk("div", "k-area-bar", null, P(S, o.parent));
          br.style.left = l + "px"; br.style.top = Y - 10 + "px"; br.style.width = w - 6 + "px"; br.style.background = it.tone === "ok" ? C("ok") : C("accent");
          hide0(lab); gsap.set(br, { scaleX: 0 });
          popIn(S, lab, it.at, 0.5);
          tl.to(br, { scaleX: 1, duration: 0.8, ease: E("out") }, it.at + 0.1);
          if (it.off != null) tl.to([lab, br], { autoAlpha: 0, duration: 0.4 }, it.off);
        });
        return scr;
      },
    };
    if (o.camera) o.camera.forEach((c) => scr.camera(c.t, c, c.dur, c.ease));
    // курсор по кликам
    let clicks = vclicks || o.clicks;
    if (typeof clicks === "string") clicks = (window.CLICKS || {})[clicks];
    if (clicks && clicks.length) {
      const cg = mk("div", "k-cg", null, layer);
      mk("div", "k-ring", null, cg);
      cg.insertAdjacentHTML("beforeend", `<svg class="k-cur" width="16" height="24" viewBox="0 0 16 24"><path d="M1 1v19l5-4.5 3.5 7.5 3-1.4-3.4-7.3H15z" fill="#fff" stroke="${C("on-accent")}" stroke-width="1.6" stroke-linejoin="round"/></svg>`);
      const from = o.from || { x: NW * 0.45, y: NH * 0.55 };
      gsap.set(cg, { x: from.x, y: from.y, opacity: 0 });
      const sorted = clicks.slice().sort((a, c) => a.t - c.t);
      sorted.forEach((c, i) => {
        const prevT = i ? sorted[i - 1].t : null;
        const d = prevT == null ? 1.0 : Math.max(0.3, Math.min(1.0, c.t - prevT - 0.1));
        if (i === 0) tl.to(cg, { opacity: 1, duration: 0.4 }, c.t - d - 0.3);
        tl.to(cg, { x: c.x, y: c.y, duration: d, ease: E("inout") }, c.t - d);
        [0, 0.25].forEach((dt) => {
          const pu = mk("div", "k-pulse", null, layer);
          pu.style.left = c.x - 17 + "px"; pu.style.top = c.y - 17 + "px";
          gsap.set(pu, { opacity: 0, scale: 1 });
          tl.fromTo(pu, { scale: 1, opacity: 0.9 }, { scale: 3.4, opacity: 0, duration: 0.9, ease: "power2.out", immediateRender: false }, c.t + dt);
        });
        if (c.label) {
          const lab = mk("div", "k-clk", esc(c.label), P(S, o.parent));
          lab.style.left = X + "px"; lab.style.top = Y - 66 + "px";
          gsap.set(lab, { opacity: 0 });
          const end = i < sorted.length - 1 ? Math.min(c.t + 1.6, sorted[i + 1].t - 0.3) : c.t + 1.6;
          tl.to(lab, { opacity: 1, duration: 0.3 }, c.t - 0.3);
          tl.to(lab, { opacity: 0, duration: 0.3 }, end);
        }
      });
      // курсор гаснет через cursorHold с после последнего клика (по умолчанию 1,2 с); cursorHold:0 — не гасить
      if (sorted.length && o.cursorHold !== 0) tl.to(cg, { opacity: 0, duration: 0.4 }, sorted[sorted.length - 1].t + (o.cursorHold || 1.2));
    }
    return scr;
  }

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
