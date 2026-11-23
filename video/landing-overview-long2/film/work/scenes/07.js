const g1 = el("e7-g");
L.head("Среда и контуры <span>· 4 материала</span>");
// карточки раздела главной #environment: названия и строки — со страницы (catalog.html)
const cards = [
  ["chart", "Измеримый контур", "Шкалы зрелости", "Единая рамка, чтобы обсуждать доступы, инструменты, процесс и поддержку на языке фактов.", 96, 190, false],
  ["folder", "Фактическая граница", "Контуры", "Что входит в среду, где проходят ограничения и какие переходы требуют отдельного решения.", 984, 190, false],
  ["search", "Презентация DevOps · по коду доступа", "Логи через Grafana", "Почему логи пропадали при перезапуске контейнера, как их теперь смотреть и к кому идти за подключением.", 96, 510, true],
  ["bulb", "Материал для решения · по коду доступа", "Обоснование среды разработки", "Зачем нужен управляемый контур и почему продуктам требуется закреплённая поддержка.", 984, 510, true],
].map(([ic, lab, ttl, body, x, y, lock]) => {
  const c = el("e7-card" + (lock ? " lock" : ""), "<div class='top'><div class='ico'>" + F.icon(ic, 36, F.C.t2) + "</div><div class='lab'>" + lab + "</div></div><h3>" + ttl + "</h3><p>" + body + "</p>", g1);
  F.setPos(c, x, y); return c;
});
// появление по списку в первой фразе
[t("шкалы"), t("контуры,"), t("логи"), t("обоснование")].forEach((w, i) => show(cards[i], w - 0.1, 14));
// пояснения по строкам карточек
const on = (c, at, off) => { tl.to(c, { borderColor: F.C.ok, backgroundColor: "rgba(60,207,145,.10)", duration: 0.3 }, at); if (off != null) tl.to(c, { borderColor: F.C.line, backgroundColor: "#171a21", duration: 0.35 }, off); };
on(cards[0], t("Шкалы зрелости"), t("контуры показывают") - 0.1);
on(cards[1], t("контуры показывают"), t("Логи и обоснование") - 0.2);
// последняя фраза: две карточки открываются по коду доступа
const lk = t("Логи и обоснование");
cards.slice(2).forEach((c) => { tl.to(c, { borderColor: F.C.acc, duration: 0.3 }, lk); tl.to(c.querySelector(".lab"), { color: F.C.accS, duration: 0.3 }, lk); tl.to(c.querySelector("svg"), { stroke: F.C.accS, duration: 0.3 }, lk); });
