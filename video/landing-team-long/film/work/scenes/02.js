const T = Team.use(L);
T.title("Семь этапов: <span>кто решает</span>");
const ST = ["Первый", "Второй", "Третий", "Четвёртый", "Пятый", "Шестой", "Седьмой"].map((w) => t(w));
const NAMES = ["pdlc-01-intent", "pdlc-02-analysis", "pdlc-03-architecture", "pdlc-04-build", "pdlc-05-test", "pdlc-06-release", "pdlc-07-observe"];
const PL = ["01 · решает владелец продукта", "02 · одобряет владелец продукта", "03 · ADR утверждает архитектор", "04 · код принимает техлид", "05 · решает QA", "06 · допускает техлид", "07 · решает владелец продукта"];
const end = t("Одобрить") - 0.25;
T.panel("home-pdlc-overview", { x: 370, y: 240, w: 1180, at: 0.4, out: ST[0] - 0.3 });
NAMES.forEach((n, i) => T.panel(n, { x: 370, y: 240, w: 1180, at: ST[i] - 0.1, out: (i < 6 ? ST[i + 1] : end) - 0.25 }));
T.plates([["Контракт этапа: выход · делает · смотрит · решает", 0.4, "info"], ...PL.map((p, i) => [p, ST[i] - 0.1, i === 1 || i === 3 ? "acc" : ""]), ["Одобрение ≠ принятие", t("Одобрить") - 0.1, "acc"]]);
// итог: разные действия и разные люди
T.card({ x: 96, y: 260, w: 800, hgt: 250, tone: "acc", html: '<div class="tm-kick">Этап 02</div><h3>Одобрить требования</h3><p>Одобряет <b>владелец продукта</b>. Аналитик и техлид комментируют.</p>' }, t("Одобрить") + 0.1);
T.card({ x: 1024, y: 260, w: 800, hgt: 250, tone: "ok", html: '<div class="tm-kick">Этап 04</div><h3>Принять код</h3><p>Принимает <b>техлид</b>. Назначенный ревьюер и автопроверки смотрят.</p>' }, t("принять") - 0.1);
const eq = el("tm-arrow", "≠"); eq.style.left = "910px"; eq.style.top = "340px"; eq.style.fontSize = "80px"; eq.style.width = "100px"; eq.style.textAlign = "center"; T.show(eq, t("разные действия") - 0.1, 960);
const m = T.card({ x: 96, y: 560, w: 1728, hgt: 150, tone: "ok", html: '<h3 style="margin:0">Агент помогает на каждом этапе. <span style="color:var(--k-accent-soft)">Решения не принимает</span></h3>' }, t("разные люди") - 0.2);
m.style.display = "flex"; m.style.alignItems = "center";
const d = T.card({ x: 96, y: 740, w: 1728, hgt: 130, html: '<p style="font-size:38px;color:var(--k-text)">Семь этапов — не семь документов: <b style="color:var(--k-ok)">глубина зависит от задачи</b></p>' }, t("Семь этапов —") - 0.1);
d.style.display = "flex"; d.style.alignItems = "center";
