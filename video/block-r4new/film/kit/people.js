/* Люди и подсветка для лендинговых роликов (TASK-577). Детерминированно: только S.tl, без Math.random/Date.
   People.focus(S, items, starts, end, o): подсветка того, о чём говорит голос.
     items  — DOM-элементы группы (этапы, плитки, строки);
     starts — время начала реплики о каждом элементе (S.t("фраза")), по возрастанию;
     end    — когда реплика о последнем элементе кончилась (после него группа возвращается в норму);
     o.color — "ok" (агент/смысл, по умолчанию), "acc" (решает человек) или массив цветов по элементам; o.dim — яркость остальных (0.42).
   Элемент держит рамку 4 px + заливку + свечение ВЕСЬ интервал [starts[i], starts[i+1]); остальные приглушены до смены.
   People.robotIcon(px): иконка агента — окно терминала (решение владельца 17.10) для ленты этапов и меток «агент». */
window.People = (function () {
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const RGB = { ok: [60, 207, 145], acc: [255, 122, 89] };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function focus(S, items, starts, end, o) {
    o = o || {};
    // элементы идут в порядке реплик: сортируем по времени; элемент может быть массивом (общая подсветка группы)
    const order = items.map((_, i) => i).sort((a, b) => starts[a] - starts[b]);
    const cols = Array.isArray(o.color) ? o.color : null;
    items = order.map((i) => (Array.isArray(items[i]) ? items[i] : [items[i]]));
    const colOf = order.map((i) => RGB[cols ? cols[i] : o.color || "ok"]);
    starts = order.map((i) => starts[i]);
    const dim = `brightness(${o.dim != null ? o.dim : 0.42}) saturate(0.7)`, norm = "brightness(1) saturate(1)";
    const zero = (c) => `0 0 0 0px ${rgba(c, 0)}, 0 0 0px ${rgba(c, 0)}`;
    const all = items.flat();
    const base = new Map(all.map((e) => {
      const bg = getComputedStyle(e).backgroundColor;
      return [e, /rgba\(.*,\s*0\)|transparent/.test(bg) ? "rgba(0,0,0,0)" : bg];
    }));
    all.forEach((e) => {
      const init = { filter: norm, boxShadow: zero(RGB.ok) };
      if (getComputedStyle(e).borderRadius === "0px") init.borderRadius = "24px"; // у «голых» блоков рамка без углов смотрится грубо
      gsap.set(e, init);
    });
    const hl = (g, c, at) => g.forEach((e) => {
      const b = base.get(e);
      S.tl.to(e, { filter: norm, boxShadow: `0 0 0 4px ${rgba(c, 1)}, 0 0 36px ${rgba(c, 0.38)}`, backgroundColor: b === "rgba(0,0,0,0)" ? rgba(c, 0.14) : mix(b, c, 0.18), duration: 0.3, ease: "power2.out" }, at);
    });
    const off = (g, c, at) => g.forEach((e) => S.tl.to(e, { filter: dim, boxShadow: zero(c), backgroundColor: base.get(e), duration: 0.3, ease: "power2.inOut" }, at));
    all.forEach((e) => S.tl.to(e, { filter: dim, duration: 0.3 }, starts[0]));
    items.forEach((g, i) => {
      if (i) off(items[i - 1], colOf[i - 1], Math.max(starts[i] - 0.05, starts[i - 1] + 0.3)); // не раньше, чем кончилось включение того же элемента
      hl(g, colOf[i], starts[i]);
    });
    // конец реплики: подсветка гаснет, группа возвращается в норму (не раньше, чем кончилось последнее включение)
    end = Math.max(end, starts[starts.length - 1] + 0.6);
    items.forEach((g, i) => g.forEach((e) => S.tl.to(e, { filter: norm, boxShadow: zero(colOf[i]), backgroundColor: base.get(e), duration: 0.4, ease: "power2.inOut" }, end + (i === items.length - 1 ? 0 : 0.01))));
  }
  // «rgb(a)» подсвечиваемого элемента → цвет заливки: у непрозрачных плиток подмешиваем акцент, у полупрозрачных (метки) усиливаем прозрачность
  function mix(solid, c, k) {
    const m = solid.match(/[\d.]+/g).map(Number);
    if (m.length > 3 && m[3] < 1) return rgba(c, Math.min(1, m[3] + 0.16));
    return `rgb(${[0, 1, 2].map((i) => Math.round(m[i] * (1 - k) + c[i] * k)).join(",")})`;
  }
  const robotIcon = (px) => { const c = css("--k-ok") || "#3ccf91"; return `<svg class="pp-robot" width="${px || 40}" height="${px || 40}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3.5"/><path d="M3 9.5h18"/><path d="M7.5 13l3 2.5-3 2.5M13 18h4"/></svg>`; };

  /* Титульная карточка на светлом фоне в палитре сайта — один стиль с build-poster.mjs (feat/no-subs): бумага, панель-рамка, кикер, янтарная черта,
     название, справа зарисовка тёмными штрихами, внизу «● Custom Dev». Она же первый кадр ролика и постер плеера (кадр 0 готового mp4).
     Статична с t=0, держится o.until (1,9 с), затем o.fade (0,7 с) растворяется в тёмную сцену; оверлей, время не добавляет.
     o: kicker, title (html), lead (необязательно), sketch {name,x,y,w} — рисуется целиком, без анимации штрихов. */
  const PAPER = { bg: "#f4f1e8", surface: "#fffdf8", ink: "#1f2d2a", muted: "#5f6863", line: "#d6d0c4", green: "#216650", amber: "#965b0d", blue: "#3f6f88" };
  const LIGHT = { "#eef0f3": PAPER.ink, "#a3a9b4": "#8a938d", "#8e96a3": "#8a938d", "#ff7a59": PAPER.amber, "#3ccf91": PAPER.green, "#7cc4ff": PAPER.blue };
  function poster(S, o) {
    if (!document.getElementById("pp-poster-css")) {
      const st = document.createElement("style"); st.id = "pp-poster-css";
      st.textContent = `.pp-poster{position:absolute;left:0;top:0;width:1920px;height:1080px;background:${PAPER.bg};z-index:40;overflow:hidden;color:${PAPER.ink}}
.pp-poster .pp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(31,45,42,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(31,45,42,.05) 1px,transparent 1px);background-size:64px 64px}
.pp-poster .pp-frame{position:absolute;left:64px;top:64px;width:1792px;height:952px;border:2px solid ${PAPER.line};border-radius:36px;background:rgba(255,253,248,.72)}
.pp-poster .pp-kicker{position:absolute;left:128px;top:150px;width:840px;font-size:34px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${PAPER.green}}
.pp-poster .pp-rule{position:absolute;left:128px;top:214px;width:120px;height:6px;border-radius:3px;background:${PAPER.amber}}
.pp-poster .pp-title{position:absolute;left:128px;top:290px;width:860px;font-size:92px;font-weight:800;line-height:1.08;letter-spacing:-.02em;color:${PAPER.ink};text-wrap:balance}
.pp-poster .pp-lead{position:absolute;left:128px;top:640px;width:820px;font-size:40px;line-height:1.3;color:${PAPER.muted}}
.pp-poster .pp-brand{position:absolute;left:128px;top:900px;display:flex;align-items:center;gap:14px;font-size:32px;font-weight:700;color:${PAPER.muted}}
.pp-poster .pp-brand i{display:block;width:18px;height:18px;border-radius:50%;background:${PAPER.green}}
.pp-poster .pp-sk{position:absolute}.pp-poster .pp-sk svg{display:block;width:100%;height:auto;overflow:visible}`;
      document.head.appendChild(st);
    }
    const d = document.createElement("div"); d.className = "pp-poster"; d.setAttribute("data-layout-allow-overlap", ""); // карточка намеренно лежит поверх тёмной сцены
    d.innerHTML = `<div class="pp-grid"></div><div class="pp-frame"></div><div class="pp-kicker">${o.kicker}</div><div class="pp-rule"></div><div class="pp-title">${o.title}</div>` +
      (o.lead ? `<div class="pp-lead">${o.lead}</div>` : "") + `<div class="pp-brand"><i></i>Custom Dev</div>`;
    if (o.sketch) {
      const sk = document.createElement("div"); sk.className = "pp-sk";
      Object.assign(sk.style, { left: o.sketch.x + "px", top: o.sketch.y + "px", width: o.sketch.w + "px" });
      sk.innerHTML = window.SKETCHES[o.sketch.name].replace(/class="s"/g, 'class="p"').replace(/stroke="(#[0-9a-f]{6})"/gi, (m, c) => `stroke="${LIGHT[c.toLowerCase()] || c}"`);
      d.appendChild(sk);
    }
    S.root.appendChild(d);
    S.tl.to(d, { autoAlpha: 0, duration: o.fade || 0.7, ease: "power2.inOut" }, o.until != null ? o.until : 1.9);
    return d;
  }
  return { focus, robotIcon, poster, PAPER };
})();
