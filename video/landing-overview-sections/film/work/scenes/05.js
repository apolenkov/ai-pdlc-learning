// сцена 5 · Разделы страницы · камера проходит по секциям: намерение → анализ → справка
const { R } = PageWin;
const W = PageWin.begin(L, { cam: { Y: 969, s: 1.15 }, spot: R.enR });
const S1 = { Y: 1640, s: 1.1 }, S2 = { Y: 2043, s: 1.1 }, S5 = { Y: 2538, s: 1.1 };
W.moveCam(0, 1.0, S1);
W.hopSpot(R.intent, 0.05, 1.0);
const na = t("Намерение");
W.call("Намерение и план", { to: [1150, 1718], side: "center", cam: S1, at: na - 0.05, until: t("Анализ") - 0.25 });
const an = t("Анализ");
W.moveCam(an - 0.7, 0.7, S2);
W.hopSpot(R.analysis, an - 0.7, an);
W.call("Анализ", { to: [1150, 2160], side: "center", cam: S2, at: an, until: t("гайды") - 0.3 });
const hp = t("Внизу");
W.call("Гайды и курсы", { to: [1150, 2160], side: "center", cam: S2, at: t("гайды"), until: hp - 0.9 });
W.moveCam(hp - 0.7, 0.7, S5);
W.hopSpot(R.help, hp - 0.7, hp);
W.call("Справка", { to: [1150, 2623], side: "center", cam: S5, at: hp, until: t("всех") - 0.3 });
W.call("Для всех ролей", { to: [1150, 2623], side: "center", cam: S5, at: t("всех"), until: t("Где") - 0.2 });
W.call("В работе", { to: [1450, 3147], side: "center", cam: S5, notail: true, at: t("Где") + 0.1, until: DUR - 0.8 });
