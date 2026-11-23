L.head("Два примера");
const DA = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a3a9b4" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>';

const card = (left, tag, title, at0) => {
  const c = el("lg-card s4-card", "<h3><span class='lg-tag'>" + tag + "</span>" + title + "</h3>"); c.style.left = left + "px"; show(c, at0, 14); return c;
};
const kid = (cls, html, par, x, y, w, when, dy) => { const e = el(cls, html, par); F.setPos(e, x, y, w); show(e, when, dy == null ? 10 : dy); return e; };
// --- карточка 02 · Анализ требований ---
const A = card(96, "02", "Анализ требований", 0.9);
const docs = [[24, 130, -10], [130, 150, 8], [64, 232, -4]].map(([x, y, r], i) => { const d = kid("s4-in", F.icon("doc", 88, F.C.t2, 1.8), A, x, y, null, 1.4 + i * 0.2); d.style.transform = "rotate(" + r + "deg)"; return d; });
const capDocs = kid("s4-cap", "разрозненные<br>документы", A, 10, 342, 250, 1.9);
const sv = F.layer(S.root);
const arrA = F.path(sv, "M 296 280 L 366 280", F.C.t2, 5); const ahA = F.arrowHead(sv, 368, 280, 0, F.C.t2, 14);
F.draw(tl, arrA, t("собирает") - 0.2, 0.4); tl.to(ahA, { opacity: 1, duration: 0.15 }, t("собирает") + 0.1);
const file = el("s4-file", "<code>scenarios.md</code><div class='s4-ln'><i>✓</i>сценарии</div><div class='s4-ln'><i>✓</i>критерии приёмки</div><div class='s4-ln'><i>✓</i>условия проверки</div><div class='s4-ln s4-l4'></div>", A);
F.setPos(file, 372, 132, 440); show(file, t("собирает"), 14);
const l4 = file.querySelector(".s4-l4");
l4.innerHTML = "<span class='s4-red'>⚠ противоречие</span><span class='s4-grn'><i>✓</i>без противоречий</span>";
const red = l4.querySelector(".s4-red"), grn = l4.querySelector(".s4-grn");
gsap.set([red, grn], { autoAlpha: 0 });
tl.fromTo(red, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.3, immediateRender: false }, t("противоречия"));
tl.to(red, { autoAlpha: 0, duration: 0.3 }, t("ещё до") + 0.9);
tl.fromTo(grn, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, immediateRender: false }, t("ещё до") + 1.1);
kid("s4-who", People.robotIcon(44) + "<span>агент собирает первую версию</span>", A, 30, 464, 760, t("агент"), 8);
const wa1 = kid("s4-who", F.person(64, F.C.accS, 5) + "<span>аналитик доводит смысл</span>", A, 30, 542, 760, t("Аналитик"), 8);
const wa2 = kid("s4-who", F.person(64, F.C.accS, 5) + "<span>владелец подтверждает</span>", A, 30, 620, 760, t("владелец"), 8);
// --- карточка 07 · Наблюдение ---
const B = card(996, "07", "Наблюдение", t("На", 2) - 0.2);
const chips = [["обращение", 30, 136, "обращение"], ["логи", 318, 136, "логами"], ["код", 482, 136, "кодом"], ["история изменений", 30, 230, "историей"]].map(([txt, x, y, k]) => kid("s4-chip", txt, B, x, y, null, t(k), 10));
const link = el("s4-in", ""+DA+"", B); F.setPos(link, 262, 138); show(link, t("логами"), 4);
const link2 = el("s4-in", ""+DA+"", B); F.setPos(link2, 426, 138); show(link2, t("кодом"), 4);
const down = el("s4-in", "<span style='font-size:48px;color:var(--k-ok);font-weight:800'>↓</span>", B); F.setPos(down, 220, 300); show(down, t("готовит"), 6);
kid("s4-res", "вывод о причине", B, 30, 372, null, t("вывод"), 12);
kid("s4-who", People.robotIcon(44) + "<span>агент связывает и готовит вывод</span>", B, 30, 486, 760, t("агент", 2), 8);
kid("s4-who", F.person(64, F.C.accS, 5) + "<span>владелец сверяет эффект с намерением</span>", B, 30, 566, 760, t("Владелец сверяет"), 8);
// круг продолжается: от 07 обратно к 02
const lp = F.path(sv, "M 1410 168 C 1410 112, 1260 100, 960 100 C 660 100, 510 112, 510 166", F.C.acc, 5);
const lh = F.arrowHead(sv, 510, 168, 90, F.C.acc, 15);
const lpAt = t("намерением") + 0.3;
F.draw(tl, lp, lpAt, 1.4); tl.to(lh, { opacity: 1, duration: 0.2 }, lpAt + 1.3);
const lt = el("s4-loop", "новый круг", S.root); show(lt, lpAt + 0.8, 6);
