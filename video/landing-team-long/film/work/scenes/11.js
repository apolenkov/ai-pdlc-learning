const T = Team.use(L);
T.title("Один путь и <span>правило решений</span>");
T.plates([["Один поддерживаемый путь", 0.4], ["Исключение — через ADR", t("Отступление") - 0.1, "acc"], ["Спор решает руководитель программы", t("Если разногласие") - 0.1, "info"]]);
// общая методика
T.card({ x: 96, y: 240, w: 1728, hgt: 230, tone: "ok", kick: "Общая методика и инструменты", html: '<p style="font-size:36px;color:var(--k-text)">Один поддерживаемый путь, автопроверки в запросах на слияние</p>' }, 0.5);
const ex = el("tm-kick", "В ADR:"); ex.style.position = "absolute"; ex.style.left = "128px"; ex.style.top = "396px"; ex.style.textTransform = "none"; ex.style.fontSize = "32px"; ex.style.color = "var(--k-accent-soft)"; ex.style.whiteSpace = "nowrap";
T.show(ex, t("Отступление") - 0.1, 300);
const fl = el("", null); fl.style.position = "absolute"; fl.style.left = "300px"; fl.style.top = "384px"; fl.style.display = "flex"; fl.style.gap = "14px"; fl.style.whiteSpace = "nowrap";
[["ответственный", "ответственный"], ["область", "область"], ["совместимость", "совместимость"], ["стоимость", "стоимость"], ["дата пересмотра", "дата"]].forEach(([txt, w], i) => {
  const p = el("tm-pill acc", txt, fl); p.style.fontSize = "30px";
  T.show(p, t(w) - 0.1, 600 + i * 220);
});
// правило решений А → Б → В → Г
const R = [
  ["А", "Выполняет ли набор контракт этапа", t("Выполняет"), "ok"],
  ["Б", "Одинаковы ли процедура и критерии до сравнения", t("Одинаковы"), "info"],
  ["В", "Записан ли выбор в ADR", t("Записан"), "ok"],
  ["Г", "Разногласие решает руководитель программы или спонсор", t("Если разногласие"), "acc"],
];
const kk = el("tm-kick", "Правило решений"); kk.style.position = "absolute"; kk.style.left = "96px"; kk.style.top = "496px"; T.show(kk, t("правило решений") - 0.1, 300);
const boxes = R.map(([l, s, w, tone], i) => {
  const bx = 96 + i * 444;
  const c = T.card({ x: bx, y: 540, w: 390, hgt: 270, tone, html: '<h3 style="font-size:54px;margin:0 0 8px">' + l + '</h3><p style="font-size:30px;line-height:1.25">' + s + "</p>" }, w - 0.1);
  if (i < 3) { const a = el("tm-arrow", "→"); a.style.left = bx + 398 + "px"; a.style.top = "640px"; a.style.fontSize = "44px"; T.fadeIn(a, w + 0.8, 0); }
  return c;
});
const pn = el("tm-pill", "Принятый набор — наравне со стартовым, у назначенного мейнтейнера"); pn.style.position = "absolute"; pn.style.left = "96px"; pn.style.top = "834px"; pn.style.fontSize = "30px"; pn.style.whiteSpace = "nowrap";
T.show(pn, t("Принятый") - 0.1, 600);
L.focus(boxes, R.map((r) => r[2]), t("Принятый") - 0.2, { color: "acc" });
