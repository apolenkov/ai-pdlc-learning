const g1 = el("t8-g");
L.head("Команды и поддержка <span>· 2 материала</span>");
// карточки раздела главной #teams: названия и строки — со страницы (catalog.html)
const mk = (ic, lab, ttl, body, x, tags) => {
  const c = el("t8-card", "<div class='top'><div class='ico'>" + F.icon(ic, 40, F.C.accS) + "</div><div class='lab'>" + lab + "</div></div><h3>" + ttl + "</h3><p>" + body + "</p><div class='t8-tags'></div>", g1);
  F.setPos(c, x, 200);
  const row = c.querySelector(".t8-tags");
  const tg = tags.map(([txt, w]) => { const d = el("lg-tag", txt, row); gsap.set(d, { autoAlpha: 0 }); tl.fromTo(d, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false }, w); return d; });
  return c;
};
const atlas = mk("sitemap", "Инженерная карта · по коду доступа", "Атлас команд и продуктов", "Технологические направления, связи и роли специалистов в одном интерактивном представлении.", 96,
  [["направления", t("направления")], ["связи", t("связи")], ["роли специалистов", t("роли специалистов")]]);
const support = mk("users", "Рабочая карта · по коду доступа", "Разработка и поддержка продуктов", "Текущий срез, техническое владение и передача знаний по продуктам.", 984,
  [["текущий срез", t("текущий срез")], ["владение", t("владение")], ["передача знаний", t("передача знаний")]]);
show(atlas, t("два материала") - 0.2, 14);
show(support, t("два материала") + 0.3, 14);
// «оба открываются по коду доступа»
[atlas, support].forEach((c) => { tl.to(c, { borderColor: F.C.acc, duration: 0.3 }, t("оба")); tl.to(c, { borderColor: F.C.line, duration: 0.35 }, t("Атлас") - 0.1); });
const on = (c, at, off) => { tl.to(c, { borderColor: F.C.ok, backgroundColor: "rgba(60,207,145,.10)", duration: 0.3 }, at); if (off != null) tl.to(c, { borderColor: F.C.line, backgroundColor: "#171a21", duration: 0.35 }, off); };
on(atlas, t("Атлас"), t("Карта «") - 0.1);
on(support, t("Карта «"));
