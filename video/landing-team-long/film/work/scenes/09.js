const T = Team.use(L);
T.title("Метрики <span>до и после</span>");
T.plates([["Пять показателей DORA", t("Пять") - 0.1], ["Время от намерения до эффекта", t("время от") - 0.1, "info"], ["Против исходного уровня продукта", t("Сравниваем") - 0.1, "acc"]]);
const col = (x, tone, kick, sub, when) => T.card({ x, y: 250, w: 800, hgt: 400, tone, kick, html: '<p style="font-size:34px">' + sub + "</p>" }, when);
col(96, "info", "Исходный уровень", "зафиксирован на старте", 0.4);
col(1024, "ok", "После внедрения", "после закрытия приоритетного разрыва на реальной задаче", 0.6);
const mrow = (x, y, txt, when, tone) => {
  const r = el("tm-row", "<div>" + txt + "</div>"); r.style.left = x + "px"; r.style.top = y + "px"; r.style.width = "744px"; r.style.height = "92px"; r.style.borderColor = tone === "ok" ? "var(--k-ok)" : "var(--k-info)"; r.style.fontSize = "36px";
  T.show(r, when, x + 372); return r;
};
mrow(124, 410, "5 показателей DORA", t("Пять") - 0.1, "info");
mrow(124, 520, "Время от намерения до эффекта", t("время от") - 0.1, "info");
mrow(1052, 410, "5 показателей DORA", t("показателях") - 0.1, "ok");
mrow(1052, 520, "Время от намерения до эффекта", t("показателях") + 0.2, "ok");
const ar = el("tm-arrow", "→"); ar.style.left = "906px"; ar.style.top = "420px"; ar.style.fontSize = "76px"; T.show(ar, 0.8, 960);
const cl = T.card({ x: 96, y: 700, w: 1728, hgt: 130, tone: "acc", html: '<p style="font-size:40px;color:var(--k-text)">↻ Метрики мониторинга снова попадают в <b style="color:var(--k-accent-soft)">бэклог метода</b></p>' }, t("Это замыкает") - 0.1);
cl.style.display = "flex"; cl.style.alignItems = "center";
