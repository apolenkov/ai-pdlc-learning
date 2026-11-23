// сцена 3 · Как встроить ИИ · камера Y 611 → 969, левая карточка #enabling
const { R } = PageWin;
const W = PageWin.begin(L, { cam: { Y: 611, s: 1.15 }, spot: R.sdlc });
W.moveCam(0, 0.9, { Y: 969 });
W.hopSpot(R.enL, 0.05, 0.75);
const ZONE = [610, 1478];                          // свободное место внизу постера левой карточки
const k = t("«Как");
W.ring({ x: 278, y: 1012, w: 620, h: 36 }, k - 0.15, t("где") - 0.2);
W.call("Как встроить ИИ", { to: ZONE, side: "center", at: k - 0.1, until: t("где") - 0.3 });
const h = t("место человека");
W.ring({ x: 276, y: 1060, w: 566, h: 22 }, h - 0.1, t("почему") - 0.2);
W.call("Человек и агент", { to: ZONE, side: "center", at: h, until: t("почему") - 0.3 });
const p = t("почему");
W.ring({ x: 276, y: 1092, w: 566, h: 26 }, p - 0.1, t("с чего") - 0.2);
W.call("Репозиторий", { to: ZONE, side: "center", at: p, until: t("с чего") - 0.3 });
const s = t("с чего");
W.ring({ x: 276, y: 1125, w: 566, h: 26 }, s - 0.1, t("Подробно") - 0.2);
W.call("С чего начать", { to: ZONE, side: "center", at: s, until: t("Подробно") - 0.3 });
const g = t("гайде");
W.ring({ x: 672, y: 1538, w: 237, h: 44 }, g - 0.2, DUR - 0.6);
W.call("Гайд «Проблемы и цель»", { to: [790, 1538], side: "above", gap: 22, at: g - 0.1, until: DUR - 0.6 });
