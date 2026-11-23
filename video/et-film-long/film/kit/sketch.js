/* Kit.sketch(S, { name, x, y, w, at, dur, hold, parent }): скетч человека, дорисовывается штрих за штрихом.
   Подключать после kit.js и sketches.js (порядок с kit.js не важен: Kit дополняется при любом порядке).
   Детерминирован: нет Math.random, Date.now, fetch; анимация только через S.tl.
   at: когда скетч начинает рисоваться; dur: сколько рисуется (2.4); hold: сколько держится после (нет = остаётся) и затем гаснет. */
(function () {
  const gsap = window.gsap;
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function sketch(S, o) {
    const src = window.SKETCHES && window.SKETCHES[o.name];
    if (!src) throw new Error(`Kit.sketch: нет скетча «${o.name}» (подключите kit/sketches.js; есть: ${Object.keys(window.SKETCHES || {}).join(", ") || "ничего"})`);
    const parent = !o.parent ? S.root : typeof o.parent === "string" ? S.root.querySelector(o.parent) : o.parent;
    const el = document.createElement("div");
    el.className = "k-sketch";
    el.innerHTML = src;
    el.style.left = (o.x || 0) + "px";
    el.style.top = (o.y || 0) + "px";
    el.style.width = (o.w || 640) + "px";
    parent.appendChild(el);

    const at = o.at || 0, dur = o.dur != null ? o.dur : 2.4;
    const strokes = [...el.querySelectorAll(".s")];
    gsap.set(el, { autoAlpha: 0 });
    gsap.set(strokes, { strokeDashoffset: 1 });
    S.tl.set(el, { autoAlpha: 1 }, at);

    // время штриха пропорционально его длине, но не меньше 14: короткие детали успевают быть видны
    const w = strokes.map((p) => Math.max(p.getTotalLength(), 14)), sum = w.reduce((a, b) => a + b, 0);
    let t = at;
    strokes.forEach((p, i) => {
      const d = (dur * w[i]) / sum;
      S.tl.to(p, { strokeDashoffset: 0, duration: d, ease: "none" }, t);
      t += d;
    });

    const out = (when) => S.tl.to(el, { autoAlpha: 0, duration: parseFloat(css("--k-dur-out")), ease: css("--k-ease-in") }, when);
    if (o.hold != null) out(at + dur + o.hold);
    return { el, svg: el.firstElementChild, end: at + dur, out };
  }

  const reg = (K) => { K.sketch = sketch; return K; };
  if (window.Kit) reg(window.Kit);
  else {
    // sketch.js подключён раньше kit.js: kit.js присваивает window.Kit целиком, дополняем в момент присваивания
    Object.defineProperty(window, "Kit", {
      configurable: true,
      get: () => undefined,
      set: (K) => Object.defineProperty(window, "Kit", { value: reg(K), writable: true, configurable: true }),
    });
  }
})();
