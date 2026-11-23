L.head("Выход из сопровождения · <span>по готовности</span>", 0.1);
const svg = F.layer(S.root);
// «не по календарю, а по готовности»
const cal = el("s7-pair no", F.icon("cal", 52, F.C.t2) + "<span>календарь</span>"); cal.style.left = "480px";
const rdy = el("s7-pair yes", F.icon("flag", 52, F.C.ok) + "<span>готовность</span>"); rdy.style.left = "1090px";
show(cal, t("календарю") - 0.5, 10); show(rdy, t("готовности") - 0.2, 10);
const strike = F.path(svg, "M 470 236 L 870 262", F.C.acc, 8); F.draw(tl, strike, t("не") + 0.05, 0.5, "power2.out");
// ось «пять точек»: старт → первые задачи → выход → итоговая встреча → проверки
const TL = 300;
tl.to([cal, rdy, strike], { autoAlpha: 0, y: -14, duration: 0.45, ease: "power2.in" }, t("На") - 0.4);
const names = [["Старт", "условия и исходный уровень"], ["Первые задачи", "вместе с коучем"], ["Выход из сопровождения", "после аудита"], ["Итоговая встреча", "решение о тираже"], ["Проверки после выхода", "подтверждают решение"]];
const when = [t("старте") - 0.2, t("первые") - 0.1, t("Из") - 0.1, t("Решение") - 0.1, t("проверки") - 0.1];
const PX = (i) => 96 + 1728 * (i + 0.5) / 5;
const stops = names.map(([a, b], i) => {
  const st = el("s7-stop", "<div class='s7-node'>" + (i === 2 ? "" : "") + "</div><div class='s7-lab'>" + a + "</div><div class='s7-sub'>" + b + "</div>"); st.style.left = PX(i) - 150 + "px"; st.style.top = TL + "px";
  show(st, when[i], 12);
  return st;
});
const icons = ["flag", "users", "box", "cal", "search"];
stops.forEach((st, i) => { st.firstChild.innerHTML = F.icon(icons[i], 46, i === 2 ? F.C.accS : F.C.ok, 2.2); });
// связи между точками
for (let i = 0; i < 4; i++) { const p = F.path(svg, `M ${PX(i) + 62} ${TL + 48} L ${PX(i + 1) - 62} ${TL + 48}`, i === 3 ? "#a3a9b4" : F.C.ok, 6); F.draw(tl, p, when[i + 1] - 0.25, 0.4, "power1.out"); }
// ворота выхода: аудит + решение владельца метода
const g1 = el("s7-gate", F.icon("search", 34, F.C.accS) + "аудит"); F.setPos(g1, PX(2) - 190, TL + 262); show(g1, t("аудита") - 0.2, 8);
const g2 = el("s7-gate", F.icon("users", 34, F.C.accS) + "решение владельца метода"); F.setPos(g2, PX(2) - 190, TL + 322); show(g2, t("отдельного") - 0.1, 8);
tl.to(stops[2].firstChild, { borderColor: F.C.acc, boxShadow: "0 0 0 8px rgba(255,122,89,.16)", duration: 0.4 }, t("метода"));
tl.to(stops[4].firstChild, { borderColor: F.C.ok, duration: 0.4 }, t("подтверждают"));
// метрики поставки против исходного уровня продукта
const mAt = t("Метрики");
const chart = el("lg-card ok s7-chart", "<h3>Метрики поставки · против исходного уровня продукта</h3>"); show(chart, mAt - 0.2, 14);
const sv2 = F.layer(S.root); // слой линий поверх карточки
const CX0 = 220, CX1 = 1700, CY0 = 930;
const bl = F.path(sv2, `M ${CX0} ${CY0} L ${CX1} ${CY0}`, "#a3a9b4", 4); bl.setAttribute("stroke-dasharray", "0.015 0.01"); gsap.set(bl, { strokeDashoffset: 0, opacity: 0 }); tl.to(bl, { opacity: 1, duration: 0.4 }, mAt + 0.3);
const lbl = el("s7-cap", "исходный уровень самого продукта"); F.setPos(lbl, CX0, CY0 + 18); show(lbl, t("исходным") - 0.1, 6);
const line = F.path(sv2, `M ${CX0} ${CY0} C 600 ${CY0 + 18}, 800 ${CY0 - 10}, 1000 ${CY0 - 50} S 1500 ${CY0 - 100}, ${CX1} ${CY0 - 130}`, F.C.ok, 8);
F.draw(tl, line, t("поставки"), 2.4, "power1.inOut");
const ml = el("s7-cap", "метрики поставки"); ml.style.color = F.C.ok; F.setPos(ml, 980, 800); show(ml, t("поставки") + 0.3, 6);
