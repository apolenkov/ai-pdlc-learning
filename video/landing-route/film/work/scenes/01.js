// сцена 1 · Главная · камера Y 0 (s 1,1) → полоса PDLC (шов со сценой 2); прожектор: шапка → полоса
const { R } = PageWin;
const W = PageWin.begin(L, { cam: { Y: 0, s: 1.1 } });
// светлая заставка = кадр 0 (постер), растворяется к 1,75 с; речь начинается в 2,0 с
const poster = People.poster(S, { kicker: "Главная · AI PDLC", title: "Один маршрут от&nbsp;намерения до&nbsp;работающего результата", sketch: { name: "intro-idea", x: 1010, y: 270, w: 760 }, until: 1.2, fade: 0.55 });
poster.querySelector(".pp-brand").setAttribute("data-layout-allow-caption-zone", ""); // подпись заставки: до 2,1 с, субтитров нет
W.moveSpot(R.hero, 2.0, 0.6);
const H = R.h1, NAV = R.navLinks;
const a = t("главная");
W.call("Главная страница", { to: [H.x, H.y], side: "above", align: "l", gap: 14, at: a + 0.1, until: t("Один") - 0.2 });
const m = t("Один");
W.call("Один маршрут", { to: [H.x + H.w / 2, H.y], side: "above", gap: 14, at: m, until: t("работающего") - 0.25 });
const w = t("работающего");
W.call("До результата", { to: [H.x + 720, H.y + H.h * 0.75], side: "right", gap: 34, at: w, until: t("Выберите") - 0.25 });
// «выберите этап или откройте справку» — два пункта верхнего меню
const v = t("этап"), s = t("справку");
const out = Math.max(s + 0.9, DUR - 1.5);           // «справку» — последнее слово: выноски держатся ≥ 0,9 с, затем камера уходит
W.moveSpot(R.nav, t("Выберите") - 0.1, 0.6);
W.ring(NAV[0], v - 0.05, out + 0.6);
W.call("Карта PDLC", { to: [NAV[0].x, NAV[0].y + NAV[0].h], side: "below", align: "l", gap: 26, at: v, until: s - 0.2 });
W.ring(NAV[1], s - 0.05, out + 0.6);
W.call("Справка", { to: [NAV[1].x, NAV[1].y + NAV[1].h], side: "below", align: "l", gap: 26, at: s, until: out });
W.moveCam(out, DUR - out - 0.2, { Y: 200, s: 1.15 }, "power2.inOut");
W.hopSpot(R.sdlc, out - 0.1, DUR - 0.5);
