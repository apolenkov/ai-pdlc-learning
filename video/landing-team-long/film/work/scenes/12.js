const T = Team.use(L);
T.title("До старта <span>договориться</span>");
T.plates([["Границы полномочий агента — обязательно", t("Обязательно") - 0.1, "acc"], ["Стартовый набор: Kilo и OpenSpec", t("Стартовый") - 0.1, "info"], ["Наставник и учёт его часов", t("Нужен") - 0.1]]);
const items = [
  ["Границы полномочий агента", '<span class="tm-pill acc">обязательно</span>', "допустимые данные и среды · проверка человеком · условия остановки", t("Обязательно"), "acc"],
  ["Стартовый набор инструментов", "", "<b>Kilo</b> и <b>OpenSpec</b>", t("Стартовый"), "info"],
  ["Общий репозиторий решений", '<span class="tm-pill info">предлагаем</span>', "корпоративный, с версиями и откатом, не меньше двух действующих мейнтейнеров", t("Общий"), "info"],
  ["Наставники, выпуск и AI-сервис", "", "доброволец-наставник и учёт его часов · выпуск вместе с эксплуатацией · назначенный ответственный за AI-сервис", t("Нужен"), "ok"],
];
const cs = items.map(([h, tag, body, w, tone], i) => {
  const x = 96 + (i % 2) * 882, y = 250 + Math.floor(i / 2) * 320;
  return T.card({ x, y, w: 846, hgt: 290, tone, html: '<div style="display:flex;gap:16px;align-items:center;justify-content:space-between;margin-bottom:10px"><h3 style="margin:0;font-size:38px">' + h + "</h3>" + tag + '</div><p style="font-size:34px">' + body + "</p>" }, w - 0.1);
});
L.focus(cs, items.map((x) => x[3]), DUR - 1.4, { color: "acc" });
