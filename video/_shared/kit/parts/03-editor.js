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

