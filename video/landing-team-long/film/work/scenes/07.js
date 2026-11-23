const T = Team.use(L);
T.title("Аудит <span>этапов</span>");
T.plates([["Аудит — это беседа", 0.4], ["Аудит команды · Разбор · План изменений", t("Для этого") - 0.1, "info"], ["Автопроверки — дисциплина, человек — качество", t("Автопроверки") - 0.1], ["Разрыв устраняет продукт", t("Разрыв") - 0.1, "acc"]]);
const A = [], B = [], C = [];
// А: беседа по семи этапам
for (let i = 0; i < 7; i++) {
  const x = 96 + i * 246;
  const n = el("tm-node ok", '<div class="c" style="width:72px;height:72px;font-size:32px">' + (i + 1) + "</div>"); n.style.left = x + "px"; n.style.top = "240px"; n.style.width = "228px";
  T.fadeIn(n, t("Берём") + i * 0.12, 10); A.push(n);
}
T.cue("pop", t("Берём"), 400);
[["Как работаете сейчас?", t("Как работаете"), "info", 96], ["Что мешает?", t("что мешает"), "acc", 688], ["Что хотите попробовать?", t("что хотите"), "ok", 1280]].forEach(([h, w, tone, x]) =>
  A.push(T.card({ x, y: 400, w: 544, hgt: 190, tone, html: '<h3 style="font-size:40px;margin:0">' + h + "</h3>" }, w - 0.1)));
A.push(T.card({ x: 96, y: 640, w: 1728, hgt: 120, tone: "ok", html: '<p style="font-size:38px;color:var(--k-text)">Фиксируем <b style="color:var(--k-ok)">разрывы</b> и <b style="color:var(--k-ok)">метрики «до»</b> внедрения</p>' }, t("Фиксируем") - 0.1));
// Б: три шаблона
const cutA = t("Для этого") - 0.5;
A.forEach((e) => T.fadeOut(e, cutA));
B.push(T.card({ x: 96, y: 240, w: 640, html: '<div class="tm-kick" style="margin:0">Шаблоны аудита · Confluence</div>' }, t("Для этого") - 0.05));
[["Аудит команды", "Беседа с командой по семи этапам", t("аудит команды"), "ok"], ["Разбор", "Закрытая страница команды развития", t("разбор"), "acc"], ["План изменений", "По итогам разбора, с согласованием", t("план изменений"), "info"]].forEach(([h, s, w, tone], i) =>
  B.push(T.card({ x: 96 + i * 592, y: 330, w: 544, hgt: 250, tone, html: "<h3>" + h + "</h3><p>" + s + "</p>" }, w - 0.1)));
B.push(T.card({ x: 96, y: 620, w: 1728, hgt: 100, html: '<p style="font-size:36px;color:var(--k-text)">Дату начала аудита записывают в <b>шапке аудита команды</b></p>' }, t("Дату") - 0.1));
B.push(T.card({ x: 96, y: 750, w: 1728, hgt: 100, tone: "ok", html: '<p style="font-size:36px;color:var(--k-text)">Заполненный пример — продукт <b>«Витрина заказов»</b></p>' }, t("Заполненный") - 0.1));
const cutB = t("Дальше") - 0.5;
B.forEach((e) => T.fadeOut(e, cutB));
// В: каждый проверяет свой этап
C.push(T.card({ x: 96, y: 240, w: 1000, html: '<div class="tm-kick" style="margin:0">Аудит этапов: каждый проверяет свой этап</div>' }, t("Дальше") - 0.05));
[["1", "Смотрим выход этапа", "Ответственный за этап берёт выход этапа в продукте", t("Ответственный за этап"), "info"], ["2", "Сверяем с контрактом", "Выход сверяют с контрактом этапа", t("сверяет"), "ok"], ["3", "Фиксируем и исправляем", "Разрыв фиксирует ответственный за этап", t("фиксирует"), "acc"]].forEach(([n, h, s, w, tone], i) =>
  C.push(T.card({ x: 96 + i * 592, y: 330, w: 544, hgt: 340, tone, html: '<div class="tm-kick">Шаг ' + n + "</div><h3>" + h + "</h3><p>" + s + "</p>" }, w - 0.1)));
[["Автопроверки CI — дисциплина", t("Автопроверки"), "info", 96], ["Человек — качество решения", t("человек оценивает"), "ok", 760]].forEach(([txt, w, tone, x]) => {
  const p = el("tm-pill " + tone, txt); p.style.position = "absolute"; p.style.left = x + "px"; p.style.top = "700px"; p.style.fontSize = "34px"; p.style.padding = "8px 26px"; p.style.whiteSpace = "nowrap";
  T.show(p, w - 0.1, x + 300);
});
const sp = el("tm-pill acc", "Спор решает программа"); sp.style.position = "absolute"; sp.style.left = "96px"; sp.style.top = "790px"; sp.style.fontSize = "34px"; sp.style.padding = "8px 26px"; T.show(sp, t("спор") - 0.1, 300);
