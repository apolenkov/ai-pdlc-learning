// светлая заставка = кадр 0 (постер), растворяется к 2,1 с; речь начинается в 2,0 с
People.poster(S, { kicker: "Обзор · AI PDLC", title: "Один маршрут от&nbsp;намерения до&nbsp;работающего результата", sketch: { name: "intro-idea", x: 1010, y: 270, w: 760 }, until: 1.45, fade: 0.65 });
const h = el("s1-h", "<b>Один маршрут</b><span>от намерения до <em>работающего</em> результата</span>");
show(h, 2.3, 16);
const Y = 740, X0 = 168, X1 = 1752, W = X1 - X0;
const svg = F.layer(S.root);
const route = F.path(svg, `M ${X0} ${Y} L ${X1} ${Y}`, "#a3a9b4", 6);
F.draw(tl, route, t("намерения") - 0.1, 1.9, "power1.inOut");
const d0 = el("s1-dot", "", S.root); F.setPos(d0, X0 - 18, Y - 18); show(d0, t("намерения") - 0.1, 0);
const d1 = el("s1-dot end", "", S.root); F.setPos(d1, X1 - 18, Y - 18); show(d1, t("результата"), 0);
const c0 = el("s1-cap", "намерение", S.root); F.setPos(c0, X0 - 100, Y + 40, 200); show(c0, t("намерения"));
const c1 = el("s1-cap", "работающий результат", S.root); F.setPos(c1, X1 - 150, Y + 40, 300); show(c1, t("результата"));
// три фигуры: кто-то решает / принимает / смотрит
const figs = [["решает", "Кто-то решает", 560, "acc"], ["принимает", "Кто-то принимает", 960, "ok"], ["смотрит, что стало", "Кто-то смотрит", 1360, "info"]].map(([lab, key, cx, col]) => {
  const f = el("s1-fig", F.person(180, F.C[col], 5) + '<div class="f-lab" style="color:' + F.C[col] + '">' + lab + "</div>", S.root);
  F.setPos(f, cx - 114, Y - 300);
  show(f, t(key), 14);
  tl.fromTo(f.querySelector("svg"), { scale: 0.82 }, { scale: 1, duration: 0.45, ease: "back.out(2)", transformOrigin: "50% 100%", immediateRender: false }, t(key));
  return f;
});
// агент (искра) пролетает вдоль маршрута на слове «ИИ»
const sp = el("s1-spark", People.robotIcon(44), S.root); sp.setAttribute("data-layout-allow-overlap", "");
F.setPos(sp, X0 - 36, Y - 36); gsap.set(sp, { autoAlpha: 0 });
const aAt = t("ИИ") - 0.1;
tl.set(sp, { autoAlpha: 1 }, aAt);
tl.to(sp, { x: W, duration: 2.1, ease: "power1.inOut" }, aAt);
tl.to(sp, { autoAlpha: 0, duration: 0.4 }, aAt + 2.1);
const trail = F.path(svg, `M ${X0} ${Y} L ${X1} ${Y}`, F.C.ok, 8); F.draw(tl, trail, aAt, 2.1, "power1.inOut");
tl.to(trail, { autoAlpha: 0, duration: 0.5 }, aAt + 2.3);
// в конце маршрут замыкается в кольцо: фигуры переходят на окружность
const rAt = t("человек") + 0.1, CX = 960, CY = 500, R = 250;
tl.to([c0, c1, d0, d1, route], { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, rAt);
const ang = [-90, 30, 150];
figs.forEach((f, i) => {
  const cx = [560, 960, 1360][i], a = ang[i] * Math.PI / 180;
  tl.to(f, { x: CX + R * Math.cos(a) - cx, y: (CY + R * Math.sin(a) - 120) - (Y - 300), duration: 0.9, ease: "power2.inOut" }, rAt);
});
tl.to(h, { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, rAt);
const ring = F.path(svg, `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R}`, F.C.ok, 6);
F.draw(tl, ring, rAt + 0.1, 1.2, "power1.inOut");
