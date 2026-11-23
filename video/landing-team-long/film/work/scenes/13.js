const T = Team.use(L);
T.title("С чего <span>начать</span>");
T.plates([["«предлагаем» — наше предложение", t("«предлагаем»") - 0.1, "info"], ["«гипотеза» — проверяем в работе", t("«гипотеза»") - 0.1], ["Начните с аудита своего продукта", t("Начните") - 0.1, "acc"], ["Шаблоны — в Confluence", t("Шаблоны лежат") - 0.1, "info"], ["Остальное пройдём вместе", t("Остальное") - 0.1]]);
const P = T.panel("home-card-team-transition", { x: 460, y: 240, w: 1000, at: 0.4 });
P.hl([56, 416, 186, 36], t("Начните") - 0.1, t("Шаблоны лежат") - 0.2, "ok");
const s = T.card({ x: 96, y: 830, w: 1728, hgt: 76, tone: "info", html: '<p style="font-size:30px;line-height:1.2;color:var(--k-text)"><b>Шаблоны аудита:</b> Development Department › AI PDLC › Audit products › Шаблоны</p>' }, t("Шаблоны лежат") - 0.1);
s.style.padding = "12px 28px"; s.style.display = "flex"; s.style.alignItems = "center";
