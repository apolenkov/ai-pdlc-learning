// Щуп низа для `scene.mjs check`: подкладывает в каждый видимый «ящик» (фон, рамка, обрезка overflow) невидимый текст «x» у его нижнего края,
// и встроенная проверка hyperframes --caption-zone ловит его, если низ ящика ниже SAFE_BOTTOM. Классы компонентов не перечисляются.
// Не проверяются: инлайновые элементы, мелкие (< 24×40 px: линии, точки, шкалы), элементы внутри обрезающего предка (их ограничивает сам предок), заменяемые (img/video/svg),
// всё с data-layout-allow-caption-zone на элементе или предке (субтитры). Намеренный заход помечайте data-layout-allow-caption-zone с причиной.
(function () {
  const SKIP = /^(SCRIPT|STYLE|LINK|META|TITLE|HEAD|HTML|BODY|SOURCE|TRACK|AUDIO|VIDEO|IMG|SVG|CANVAS|BR|PATH|G|CIRCLE|RECT|LINE|POLYLINE|POLYGON|USE|DEFS)$/i;
  const box = (e, cs) => {
    const bg = cs.backgroundColor.match(/[\d.]+/g);
    if (bg && (bg.length < 4 || parseFloat(bg[3]) > 0.03)) return true;
    if (cs.backgroundImage !== "none") return true;
    if ((cs.overflowX !== "visible" || cs.overflowY !== "visible") && e.offsetHeight < 900) return true;
    return ["Top", "Right", "Bottom", "Left"].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && !/rgba?\([^)]*,\s*0\)/.test(cs[`border${s}Color`]));
  };
  const clipped = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if ((c.overflowX !== "visible" || c.overflowY !== "visible") && a.offsetHeight < 900) return true; } return false; };
  const add = (e) => {
    if (e.__bb || SKIP.test(e.tagName) || e.closest("svg") || e.classList.contains("bb-probe") || e.closest("[data-layout-allow-caption-zone]")) return;
    const cs = getComputedStyle(e);
    if (cs.display === "none" || cs.display === "inline" || cs.display === "contents") return;
    if (e.offsetHeight >= 900 || e.offsetHeight < 24 || e.offsetWidth < 40 || !box(e, cs) || clipped(e)) return;
    e.__bb = 1;
    if (cs.position === "static") e.style.position = "relative";
    const p = document.createElement("span");
    p.className = "bb-probe"; p.setAttribute("data-layout-allow-occlusion", ""); p.textContent = "x";
    p.style.cssText = "position:absolute;left:12px;bottom:2px;font:14px/14px sans-serif;color:rgba(255,255,255,.3);pointer-events:none";
    e.appendChild(p);
  };
  let q = false;
  const run = () => { q = false; document.body && document.body.querySelectorAll("*").forEach(add); };
  const sched = () => { if (!q) { q = true; requestAnimationFrame(run); } };
  sched();
  new MutationObserver(sched).observe(document.documentElement, { childList: true, subtree: true });
})();
