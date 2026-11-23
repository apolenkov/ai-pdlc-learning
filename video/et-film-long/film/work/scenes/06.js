L.head("Один <span>поддерживаемый</span> путь", 0.1);
const svg = F.layer(S.root);
// путь: от этапов к результату, толстая линия; на нём — контракты и автопроверки, затем стартовый набор
const PY = 410, X0 = 96, X1 = 1824;
const base = F.path(svg, `M ${X0} ${PY} L ${X1} ${PY}`, "#2a2f3a", 12);
F.draw(tl, base, t("один") - 0.1, 1.0, "power1.out");
const path = F.path(svg, `M ${X0} ${PY} L ${X1} ${PY}`, F.C.ok, 12);
F.draw(tl, path, t("поддерживаемый"), 2.2, "power1.inOut");
const cap = el("s6-cap", "путь — для всех продуктов"); F.setPos(cap, 96, PY - 150); show(cap, t("поддерживаемый") + 0.1, 8);
const chip = (txt, sub, x, y, when, cls) => { const c = el("s6-chip" + (cls ? " " + cls : ""), txt + (sub ? " <small>" + sub + "</small>" : "")); F.setPos(c, x, y); show(c, when, 12); return c; };
const cA = chip("контракты этапов", "", 200, PY - 100, t("контракты") - 0.1);
const cB = chip("автопроверки", "", 700, PY - 100, t("автопроверки") - 0.1);
// стартовый набор
const kit = el("s6-cap", "стартовый набор"); F.setPos(kit, 1270, PY - 150); show(kit, t("Стартовый") + 0.1, 8);
const cK = chip(F.icon("gear", 38, F.C.ok) + "Kilo", "", 1420, PY + 50, t("кило") - 0.1);
const cO = chip(F.icon("doc", 38, F.C.ok) + "OpenSpec", "", 1620, PY + 50, t("опенспек") - 0.1);
cK.style.left = "1270px"; cK.style.top = PY - 100 + "px"; cO.style.left = "1500px"; cO.style.top = PY - 100 + "px";
// исключение: ответвление от пути в ADR
const bx = 1000;
const br = F.path(svg, `M ${bx} ${PY} C ${bx} ${PY + 40}, ${bx + 60} ${PY + 44}, ${bx + 60} ${PY + 94}`, F.C.acc, 6);
const exAt = t("Отступить");
F.draw(tl, br, exAt, 1.0, "power1.inOut");
const ex = el("lg-card acc s6-adr", F.icon("flag", 56, F.C.accS) + "<div><b>Исключение — только через ADR</b><span>решение записано: кто, зачем, до какой даты</span></div>"); F.setPos(ex, bx - 340, PY + 94); ex.style.width = "980px"; show(ex, t("решением") - 0.1, 14);
// правило для нового инструмента: А → Б → В, ветвь Г
const hAt = t("Новый");
tl.to([cA, cB, cK, cO, cap, kit, ex, br, path, base], { opacity: 0.3, y: -110, duration: 0.6, ease: "power2.inOut" }, hAt - 0.2);
const hh = el("s6-h", "Правило для нового инструмента · <span>одно для всех</span>"); show(hh, hAt, 10);
const rules = [["А", "Контракт этапа выполнен", t("выполнен"), ""], ["Б", "Одинаковая процедура сравнения", t("процедура"), ""], ["В", "Решение записано в ADR", t("решение", 2) || t("записано"), ""], ["Г", "Разногласие решает руководитель программы или спонсор", t("разногласие"), " acc"]];
const rEls = rules.map(([k, tx, when, cls], i) => { const c = el("lg-card" + (cls ? " acc" : " ok") + " s6-rule" + cls, "<div class='k'>" + k + "</div><p>" + tx + "</p>"); c.style.left = 96 + i * 440 + "px"; show(c, when - 0.2, 14); return c; });
rules.slice(0, 3).forEach((r, i) => { const x0 = 96 + i * 440 + 408, x1 = x0 + 32, y = 836; const p = F.path(svg, `M ${x0} ${y} L ${x1} ${y}`, F.C.ok, 6); F.draw(tl, p, rules[i + 1][2] - 0.4, 0.3, "power1.out"); });
