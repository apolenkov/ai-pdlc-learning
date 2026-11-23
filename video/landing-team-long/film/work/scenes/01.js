const T = Team.use(L);
T.title("Зачем нужна <span>команда</span>");
T.plates([["Команда развития процессов AI PDLC", 0.4], ["Передать метод", t("передать") - 0.2, "acc"], ["Команда уходит, продукт ведёт сам", t("Команда уходит") - 0.1]]);
T.panel("home-card-team-transition", { x: 390, y: 240, w: 1140, at: 0.5, out: t("Цель") - 0.3 });
// карточка «Образ результата» со страницы
const kick = T.card({ x: 96, y: 240, w: 470, html: '<div class="tm-kick" style="margin:0">Образ результата</div>' }, t("Цель") - 0.1);
kick.style.padding = "14px 32px"; kick.style.whiteSpace = "nowrap"; kick.style.borderColor = "var(--k-ok)";
[
  ["Беседа и аудит потока", "Проходим один сквозной поток по семи этапам беседой с командой, фиксируем разрывы и метрики «до».", t("Цель"), "ok"],
  ["Передача практик", "Обученный наставник проводит изменения сам и помогает коллегам после выхода коуча.", t("Команда уходит"), "acc"],
  ["Метрики до и после", "Закрываем приоритетный разрыв на реальной задаче и сравниваем показатели потока с исходным уровнем.", t("эффект замерен"), "ok"],
].forEach(([h, body, when, tone], i) => T.card({ x: 96 + i * 588, y: 340, w: 552, hgt: 330, tone, html: "<h4>" + h + "</h4><p>" + body + "</p>" }, when));
// что будет в ролике
const cap = el("tm-kick", "В ролике"); cap.style.position = "absolute"; cap.style.left = "96px"; cap.style.top = "700px"; T.show(cap, t("В ролике") - 0.1, 200);
const chips = [["шесть задач", "шесть", 250], ["семь этапов", "семь", 250], ["план изменений", "план", 290], ["аудит", "аудит", 150], ["обучение по ролям", "обучение", 360], ["метрики", "метрики", 190], ["порядок выхода", "порядок", 290]];
const row = el("", null); row.style.position = "absolute"; row.style.left = "96px"; row.style.top = "760px"; row.style.width = "1728px"; row.style.display = "flex"; row.style.flexWrap = "wrap"; row.style.gap = "18px";
let x = 96;
chips.forEach(([txt, ph, w], i) => {
  const c = el("tm-pill " + (i % 2 ? "ok" : "info"), txt, row);
  c.style.fontSize = "34px"; c.style.padding = "8px 26px"; c.style.whiteSpace = "nowrap";
  T.show(c, t(ph, 1) - 0.1, x + w / 2);
  x += w + 22;
});
