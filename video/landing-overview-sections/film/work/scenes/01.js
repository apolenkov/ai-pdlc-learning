// сцена 1 · Вступление · камера Y 0 → 611 (шов со сценой 2: карта PDLC), s 1,15
const { R } = PageWin;
const W = PageWin.begin(L, { cam: { Y: 0, s: 1.1 } }); // 1,10: нижний край окна не режет строку «PDLC: 7 этапов»
// светлая заставка = кадр 0 (постер), растворяется к 1,75 с; речь начинается в 2,0 с
const poster = People.poster(S, { kicker: "Обзор · AI PDLC", title: "Один маршрут от&nbsp;намерения до&nbsp;работающего результата", sketch: { name: "intro-idea", x: 1010, y: 270, w: 760 }, until: 1.2, fade: 0.55 });
W.moveSpot(R.h1, 2.0, 0.6);
poster.querySelector(".pp-brand").setAttribute("data-layout-allow-caption-zone", ""); // подпись заставки: до 2,1 с, субтитров нет
const a = t("обзор");
W.call("Главная страница", { to: [272, 232], side: "above", align: "l", gap: 18, at: a + 0.1, until: t("маршрут") - 0.2 });
const m = t("маршрут");
W.call("Один маршрут", { to: [700, 252], side: "above", gap: 16, at: m, until: t("намерения") - 0.3 });
const n = t("намерения");
W.call("От намерения", { to: [1000, 320], side: "right", align: "l", gap: 22, at: n + 0.1, until: t("работающего") - 0.2 });
const w = t("работающего");
W.call("До результата", { to: [1000, 430], side: "right", align: "l", gap: 22, at: w, until: DUR - 1.7 });
W.moveCam(t("результата") + 0.1, DUR - 0.5 - (t("результата") + 0.1), { Y: 611, s: 1.15 }, "power1.inOut");
W.hopSpot(R.sdlc, DUR - 2.6, DUR - 1.3);
