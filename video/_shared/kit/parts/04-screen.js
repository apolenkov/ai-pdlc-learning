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

