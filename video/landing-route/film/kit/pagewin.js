/* Шаблон «окно страницы»: PageWin.begin(L, { Y, s, spot }) → W. Координаты прямоугольников — в пикселях страницы (ширина 1920, колонка x 256–1664); блок R пишет tools/shoot-page.ts.
   Камера: окно видит страницу с верхней строкой Y и масштабом s (центр колонки x=960 — в центре окна).
   Шов между сценами: конечное состояние сцены N (камера и прожектор) = начальное сцены N+1. */
window.PageWin = (function () {
  const WW = 1620, WH = 780, PAGE = "assets/page/page.jpg";
  const R = /*RECTS*/{"nav":{"x":256,"y":12,"w":1408,"h":64},"hero":{"x":256,"y":92,"w":1408,"h":240},"h1":{"x":281,"y":117,"w":1060,"h":121},"lede":{"x":281,"y":256,"w":770,"h":51},"navLinks":[{"x":269,"y":26,"w":101,"h":36},{"x":377,"y":26,"w":76,"h":36}],"sdlc":{"x":256,"y":356,"w":1408,"h":334},"stages":[{"x":277,"y":430,"w":171,"h":237},{"x":448,"y":430,"w":171,"h":237},{"x":619,"y":430,"w":171,"h":237},{"x":789,"y":430,"w":171,"h":237},{"x":960,"y":430,"w":171,"h":237},{"x":1131,"y":430,"w":171,"h":237},{"x":1302,"y":430,"w":171,"h":237},{"x":1472,"y":430,"w":171,"h":237}],"nodes":[{"x":339,"y":465,"w":46,"h":46},{"x":510,"y":465,"w":46,"h":46},{"x":681,"y":465,"w":46,"h":46},{"x":852,"y":465,"w":46,"h":46},{"x":1022,"y":465,"w":46,"h":46},{"x":1193,"y":465,"w":46,"h":46},{"x":1364,"y":465,"w":46,"h":46},{"x":1535,"y":465,"w":46,"h":46}],"agents":[{"x":285,"y":557,"w":155,"h":29},{"x":467,"y":557,"w":132,"h":29},{"x":643,"y":557,"w":123,"h":29},{"x":814,"y":557,"w":121,"h":29},{"x":968,"y":557,"w":155,"h":29},{"x":1139,"y":557,"w":155,"h":29},{"x":1310,"y":557,"w":155,"h":29},{"x":1477,"y":557,"w":161,"h":29}],"roles":[{"x":327,"y":589,"w":70,"h":18},{"x":475,"y":589,"w":116,"h":18},{"x":654,"y":589,"w":99,"h":18},{"x":827,"y":589,"w":95,"h":18},{"x":1000,"y":589,"w":91,"h":18},{"x":1171,"y":589,"w":90,"h":18},{"x":1340,"y":589,"w":95,"h":18},{"x":1475,"y":589,"w":165,"h":18}],"ctas":[{"x":331,"y":614,"w":64,"h":18},{"x":501,"y":614,"w":64,"h":18},{"x":651,"y":614,"w":105,"h":18},{"x":823,"y":614,"w":104,"h":18},{"x":993,"y":614,"w":105,"h":18},{"x":1163,"y":614,"w":105,"h":18},{"x":1334,"y":614,"w":105,"h":18}],"chips":[{"x":332,"y":639,"w":61,"h":20},{"x":510,"y":639,"w":47,"h":20},{"x":684,"y":639,"w":40,"h":20},{"x":858,"y":639,"w":32,"h":20},{"x":1018,"y":639,"w":54,"h":20},{"x":1178,"y":639,"w":76,"h":20},{"x":1363,"y":639,"w":47,"h":20},{"x":1505,"y":639,"w":105,"h":20}],"intent":{"x":256,"y":714,"w":1408,"h":323},"intentCards":[{"x":281,"y":836,"w":671,"h":177},{"x":968,"y":836,"w":671,"h":177}],"analysis":{"x":256,"y":1086,"w":1408,"h":344},"analysisCards":[{"x":281,"y":1207,"w":671,"h":198},{"x":968,"y":1207,"w":671,"h":198}],"help":{"x":256,"y":1478,"w":1408,"h":537},"helpCards":[{"x":281,"y":1599,"w":671,"h":198},{"x":968,"y":1599,"w":671,"h":198},{"x":281,"y":1813,"w":671,"h":177},{"x":968,"y":1813,"w":671,"h":177}]}/*END*/;
  const grow = (r, p) => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p });
  const ARROW = {
    down: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffb59f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16M5 13l7 7 7-7"/></svg>',
    right: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffb59f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M13 5l7 7-7 7"/></svg>',
    lock: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffb59f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  };
  const need = (what, at, until) => { if (until != null && !(until > at + 0.25)) throw new Error("PageWin: " + what + " скрывается раньше показа (at " + at.toFixed(2) + ", until " + until.toFixed(2) + ")"); };
  function begin(L, o) {
    const { S, tl, el } = L;
    const win = el("pw-win"); win.setAttribute("data-layout-allow-overlap", "");
    const layer = el("pw-layer", null, win); layer.setAttribute("data-layout-allow-overlap", ""); layer.setAttribute("data-layout-allow-overflow", "");
    const img = document.createElement("img"); img.className = "pw-img"; img.src = PAGE; img.alt = "Главная страница"; layer.appendChild(img);
    const frame = el("pw-frame"); frame.setAttribute("data-layout-allow-overlap", "");
    const tx = (s) => WW / 2 - 960 * s;
    const cam0 = Object.assign({}, o.cam);
    gsap.set(layer, { x: tx(cam0.s), y: -cam0.Y * cam0.s, scale: cam0.s, transformOrigin: "0 0" });
    const W = { win, layer, R, cam: cam0, spotRect: null };
    const pose = (e, r) => gsap.set(e, { left: r.x, top: r.y, width: r.w, height: r.h });
    // прожектор: всё вне rect затемнено, вокруг rect кольцо
    const spot = el("pw-spot", null, layer); spot.setAttribute("data-layout-allow-overlap", "");
    W.spotEl = spot;
    if (o.spot) { W.spotRect = grow(o.spot, 7); pose(spot, W.spotRect); } else gsap.set(spot, { autoAlpha: 0 });
    W.moveCam = (at, dur, to, ease) => {
      const c = W.cam, t2 = Object.assign({}, c, to);
      tl.fromTo(layer, { x: tx(c.s), y: -c.Y * c.s, scale: c.s }, { x: tx(t2.s), y: -t2.Y * t2.s, scale: t2.s, duration: dur, ease: ease || "power2.inOut", immediateRender: false }, at);
      W.cam = t2; return W;
    };
    W.moveSpot = (rect, at, dur, ease) => {
      const a = W.spotRect, b = grow(rect, 7);
      if (!a) { pose(spot, b); tl.fromTo(spot, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur || 0.5, immediateRender: false }, at); }
      else tl.fromTo(spot, { left: a.x, top: a.y, width: a.w, height: a.h }, { left: b.x, top: b.y, width: b.w, height: b.h, duration: dur == null ? 0.7 : dur, ease: ease || "power2.inOut", immediateRender: false }, at);
      W.spotRect = b; return W;
    };
    // смена секции без «езды» прямоугольника по тексту: прожектор гаснет, переходит на новую секцию, загорается к концу рывка камеры
    W.hopSpot = (rect, out, back) => {
      const b = grow(rect, 7);
      tl.fromTo(spot, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, out);
      tl.set(spot, { left: b.x, top: b.y, width: b.w, height: b.h }, out + 0.35);
      tl.fromTo(spot, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "power1.out", immediateRender: false }, back);
      W.spotRect = b; return W;
    };
    W.spotOff = (at, dur) => { tl.to(spot, { autoAlpha: 0, duration: dur || 0.4 }, at); W.spotRect = null; return W; };
    W.ring = (rect, at, until, kind) => {
      need("кольцо", at, until);
      const r = el("pw-ring" + (kind === "round" ? " round" : ""), null, layer); r.setAttribute("data-layout-allow-overlap", "");
      pose(r, grow(rect, 4)); gsap.set(r, { autoAlpha: 0 });
      tl.fromTo(r, { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power2.out", transformOrigin: "50% 50%", immediateRender: false }, at);
      if (until != null) tl.to(r, { autoAlpha: 0, duration: 0.3 }, until);
      return r;
    };
    W.badge = (html, px, py, at, until) => {
      need("значок", at, until);
      const b = el("pw-badge", html, layer); b.setAttribute("data-layout-allow-overlap", "");
      gsap.set(b, { left: px - 32, top: py - 32, autoAlpha: 0 });
      tl.fromTo(b, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)", transformOrigin: "50% 50%", immediateRender: false }, at);
      if (until != null) tl.to(b, { autoAlpha: 0, duration: 0.3 }, until);
      return b;
    };
    // экранные координаты (в окне) точки страницы при камере c
    W.scr = (px, py, c) => { c = c || W.cam; return [WW / 2 + (px - 960) * c.s, (py - c.Y) * c.s]; };
    // выноска у точки страницы: side — где плашка относительно точки (above|below|left|right), текст ≤ 2 слов
    W.call = (text, o2) => {
      need("выноска «" + text + "»", o2.at, o2.until);
      const c = o2.cam || W.cam, [sx, sy] = o2.scr || W.scr(o2.to[0], o2.to[1], c), side = o2.side || "above", gap = o2.gap == null ? 30 : o2.gap;
      const tail = { above: "t-down", below: "t-up", left: "t-right", right: "t-left" }[side] || "t-none";
      const e = el("pw-call " + (o2.notail || o2.align ? "t-none" : tail), (o2.pre || "") + "<span>" + text + "</span>" + (o2.arrow ? ARROW[o2.arrow] : ""), win);
      e.setAttribute("data-layout-allow-overlap", "");
      let x = sx, y = sy, xp = -50, yp = -50;
      if (side === "above") { y = sy - gap; yp = -100; }
      if (side === "below") { y = sy + gap; yp = 0; }
      if (side === "left") { x = sx - gap; xp = -100; }
      if (side === "right") { x = sx + gap; xp = 0; }
      if (o2.align === "l") xp = 0; if (o2.align === "r") xp = -100;
      gsap.set(e, { left: x + (o2.dx || 0), top: y + (o2.dy || 0), xPercent: xp, yPercent: yp, autoAlpha: 0 });
      tl.fromTo(e, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, o2.at);
      if (o2.until != null) tl.to(e, { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, o2.until);
      return e;
    };
    return W;
  }
  return { begin, R, grow, ARROW };
})();
