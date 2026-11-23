/* Помощники сцен ролика «Команда развития» (подробно, R11-T-long). Детерминированно: только S.tl, без Math.random/Date.
   Team.use(L) — L от Long.begin(). Каждое появление пишет звуковую метку в window.__CUES[сцена] (читает tools/make-sfx.mjs). */
window.Team = (function () {
  const NS = "http://www.w3.org/2000/svg";
  function use(L) {
    const { S, tl, el, DUR } = L;
    const cues = ((window.__CUES = window.__CUES || {})[S.id] = []);
    const cue = (kind, time, x) => cues.push({ kind, t: Number(time.toFixed(3)), pan: x == null ? 0 : Number(Math.max(-0.5, Math.min(0.5, (x / 1920 - 0.5))).toFixed(2)) });
    const T = { cue };
    const fadeIn = (e, at, y) => { gsap.set(e, { autoAlpha: 0 }); tl.fromTo(e, { autoAlpha: 0, y: y == null ? 14 : y }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, at); };
    const fadeOut = (e, at) => tl.to(e, { autoAlpha: 0, duration: 0.35, ease: "power2.in" }, at);
    T.fadeIn = fadeIn; T.fadeOut = fadeOut;
    // появление элемента со звуком; x — центр элемента для панорамы
    T.show = (e, at, x, y) => { fadeIn(e, at, y); cue("pop", at, x); return e; };
    T.title = (html, when) => { const h = L.head(html, when); cue("pop", when == null ? 0.1 : when, 400); return h; };
    // плашка под заголовком; список [текст, время, тон?] — каждая гаснет к началу следующей, последняя — к концу сцены
    T.plates = (list) => list.map(([text, at, tone], i) => {
      const p = el("tm-plate" + (tone ? " " + tone : ""), text);
      const out = i + 1 < list.length ? list[i + 1][1] - 0.4 : DUR - 0.5;
      fadeIn(p, at, 10); cue("pop", at, 400); fadeOut(p, out);
      return p;
    });
    // бумажная панель со скетчем; o: x, y, w, at, out
    T.panel = (name, o) => {
      const src = window.SKETCHES[name];
      if (!src) throw new Error("нет скетча " + name);
      const vb = /viewBox="([\d.\- ]+)"/.exec(src)[1].split(" ").map(Number);
      const k = o.w / vb[2];
      const d = el("tm-paper"); d.innerHTML = src;
      d.style.left = o.x + "px"; d.style.top = o.y + "px"; d.style.width = o.w + "px"; d.style.height = Math.round(vb[3] * k) + "px";
      fadeIn(d, o.at, 10); cue("pop", o.at, o.x + o.w / 2);
      if (o.out != null) fadeOut(d, o.out);
      const P = { el: d, k, vb, h: vb[3] * k, x: o.x, y: o.y, w: o.w };
      // рамка вокруг области скетча в его координатах (viewBox); from — когда включить, to — когда погасить
      P.hl = (r, from, to, tone) => {
        const b = el("tm-hl" + (tone ? " " + tone : ""));
        b.style.left = o.x + (r[0] - vb[0]) * k - 8 + "px"; b.style.top = o.y + (r[1] - vb[1]) * k - 8 + "px";
        b.style.width = r[2] * k + 16 + "px"; b.style.height = r[3] * k + 16 + "px";
        gsap.set(b, { autoAlpha: 0 });
        tl.fromTo(b, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power2.out", immediateRender: false }, from);
        if (to != null) tl.to(b, { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, to);
        return b;
      };
      return P;
    };
    T.card = (o, at) => {
      const c = el("tm-card" + (o.tone ? " " + o.tone : ""), (o.kick ? '<div class="tm-kick">' + o.kick + "</div>" : "") + (o.h ? "<h3>" + o.h + "</h3>" : "") + (o.html || ""));
      c.style.left = o.x + "px"; c.style.top = o.y + "px"; c.style.width = o.w + "px"; if (o.hgt) c.style.height = o.hgt + "px";
      if (at != null) T.show(c, at, o.x + o.w / 2);
      return c;
    };
    T.row = (o, at) => {
      const r = el("tm-row", '<div class="n">' + (o.n == null ? "" : o.n) + "</div><div>" + o.t + (o.s ? "<small>" + o.s + "</small>" : "") + "</div>");
      r.style.left = o.x + "px"; r.style.top = o.y + "px"; r.style.width = o.w + "px"; r.style.height = o.h + "px";
      if (at != null) T.show(r, at, o.x + o.w / 2);
      return r;
    };
    return T;
  }
  return { use };
})();
