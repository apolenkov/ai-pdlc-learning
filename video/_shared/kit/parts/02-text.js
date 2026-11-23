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
      ? (m === "intro" ? `<b>${total} частей</b>` : m === "done" ? `<b>Готово: ${total} из ${total}</b>` : `<b>Часть ${n} из ${total}</b>`)
      : m === "intro" ? `<b>${total} шагов в двух частях</b>`
      : m === "done" ? `<b>Готово: ${total} из ${total}</b>`
      : `<b>Шаг ${n} из ${total}</b><span> · ${left(n)}</span>`;
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
        cues.push({ text: backSub(text.slice(pa, pb + 1)), start, end });
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

