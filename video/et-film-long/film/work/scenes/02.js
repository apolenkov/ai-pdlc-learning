L.head("Три яруса · <span>метод идёт вниз, опыт — вверх</span>", 0.1);
const svg = F.layer(S.root);
const TOP = [210, 470, 730], H = 160, cy = (i) => TOP[i] + H / 2;
const tiers = [["users", "Команда развития", "ведёт общий метод, учит наставников", "lg-card acc", F.C.accS, t("Команда развития")], ["star", "Наставник команды", "доброволец из продуктовой команды", "lg-card ok", F.C.ok, t("Наставник")], ["folder", "Продуктовая команда", "ведёт продукт по методу", "lg-card", F.C.t2, t("Продуктовая")]];
const cardEls = tiers.map(([ic, a, b, cls, col, when], i) => {
  const d = el(cls + " s2-tier", F.icon(ic, 72, col) + "<div><b>" + a + "</b><span>" + b + "</span></div>"); d.style.top = TOP[i] + "px";
  show(d, when - 0.1, 14);
  return d;
});
// коллеги внутри продуктовой команды — на слове «коллегам»
const col = el("s2-colleagues", [0, 1, 2].map(() => "<div>" + F.person(72, F.C.t2, 5) + "</div>").join(""), cardEls[2]);
[...col.children].forEach((c, k) => show(c, t("коллегам") + k * 0.18, 10));
// стрелки вниз: коуч учит, наставник показывает коллегам
const X = 500;
const dn = [["коуч учит на реальных задачах", t("коуч") - 0.1, ""], ["показывает коллегам, как это работает", t("показывает") - 0.1, " g"]];
dn.forEach(([txt, when, cls], i) => {
  const y0 = TOP[i] + H + 4, y1 = TOP[i + 1] - 6;
  const p = F.path(svg, `M ${X} ${y0} L ${X} ${y1}`, i ? F.C.ok : F.C.acc, 5); F.draw(tl, p, when, 0.4, "power1.out");
  const ah = F.arrowHead(svg, X, y1 + 2, 90, i ? F.C.ok : F.C.acc, 14); tl.to(ah, { opacity: 1, duration: 0.15 }, when + 0.35);
  const lb = el("s2-lab" + cls, txt); lb.style.top = (y0 + y1) / 2 - 22 + "px"; show(lb, when + 0.1, 8);
});
// две оси справа: метод и знание вниз, результаты вверх; на репликах загораются и по ним идёт точка
const DX = 1390, UX = 1660, Y0 = 250, Y1 = 880;
const dLab = el("s2-spine", "метод и знание<small>сверху вниз</small>"); dLab.style.left = DX - 150 + "px"; dLab.style.color = F.C.ok;
const uLab = el("s2-spine", "результаты<small>снизу вверх</small>"); uLab.style.left = UX - 150 + "px"; uLab.style.color = F.C.accS;
show(dLab, t("три") + 0.2, 8); show(uLab, t("три") + 0.5, 8);
const dGray = F.path(svg, `M ${DX} ${Y0} L ${DX} ${Y1}`, "#2a2f3a", 6), uGray = F.path(svg, `M ${UX} ${Y1} L ${UX} ${Y0}`, "#2a2f3a", 6);
F.draw(tl, dGray, t("три") + 0.2, 0.9, "power1.out"); F.draw(tl, uGray, t("три") + 0.5, 0.9, "power1.out");
[0, 1, 2].forEach((i) => {
  const tk = F.path(svg, `M 1200 ${cy(i)} L ${UX} ${cy(i)}`, "#2a2f3a", 4, "4 6"); tk.setAttribute("stroke-dasharray", "0.01 0.012"); tk.setAttribute("pathLength", "1");
  gsap.set(tk, { strokeDashoffset: 0, opacity: 0 }); tl.to(tk, { opacity: 1, duration: 0.4 }, tiers[i][5]);
});
const dHot = F.path(svg, `M ${DX} ${Y0} L ${DX} ${Y1}`, F.C.ok, 8), uHot = F.path(svg, `M ${UX} ${Y1} L ${UX} ${Y0}`, F.C.acc, 8);
F.draw(tl, dHot, t("сверху вниз") - 0.1, 1.6, "power1.inOut");
F.draw(tl, uHot, t("возвращаются") - 0.1, 1.6, "power1.inOut");
const dh = F.arrowHead(svg, DX, Y1 + 4, 90, F.C.ok, 16), uh = F.arrowHead(svg, UX, Y0 - 4, -90, F.C.acc, 16);
tl.to(dh, { opacity: 1, duration: 0.2 }, t("сверху вниз") + 1.4); tl.to(uh, { opacity: 1, duration: 0.2 }, t("возвращаются") + 1.4);
const fin = el("s2-lab g", "результаты улучшают метод"); fin.style.left = "1160px"; fin.style.top = "930px"; fin.style.width = "660px"; fin.style.textAlign = "center"; show(fin, t("улучшают") - 0.1, 8);
L.focus(cardEls, [t("Команда развития"), t("Наставник"), t("Продуктовая")], t("Знание") - 0.2, { color: ["acc", "ok", "ok"] });
