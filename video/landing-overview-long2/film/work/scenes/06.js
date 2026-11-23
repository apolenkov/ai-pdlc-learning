const g1 = el("s6-g"), g2 = el("s6-g");
gsap.set(g2, { autoAlpha: 0 });
const h1 = L.head("Карта этапов на <span>главной</span>");
const h2 = L.head("Курс <span>анализа</span>", t("Подготовка") - 0.1);
tl.to(h1, { autoAlpha: 0, duration: 0.35 }, t("Подготовка") - 0.6);
// --- часть 1: карта ---
const names = ["Намерение и план", "Анализ требований", "Архитектура и дизайн", "Реализация", "Тестирование", "Выпуск", "Наблюдение"];
const agents = ["Собирает сигналы и план", "Сценарии", "Варианты и ADR", "Код, Tests, доки", "Тест-модель и автотесты", "Сборка и диагностика", "Обращение ↔ логи ↔ код"];
const verbs = ["Решает", "Подтверждает", "Утверждает", "Принимает", "Проверяет", "Допускает", "Наблюдает"];
const RT = 200;
const rb = L.ribbon({ top: RT, names, cls: "ok", reveal: (i) => 0.5 + i * 0.15 });
g1.appendChild(rb.rail);
const vAt = t("что делает человек"), aAt = t("что готовит агент");
const rows = names.map((_, i) => {
  const x = rb.cx(i) - 114;
  const r = el("s6-rl", "<span>" + verbs[i] + "</span>", g1); F.setPos(r, x, RT + 308); show(r, vAt + i * 0.13, 8);
  const a = el("s6-ag", People.robotIcon(26) + agents[i], g1); F.setPos(a, x, RT + 190); show(a, aAt + i * 0.13, 8);
  const c = el("s6-cta" + (i === 1 ? "" : ""), i === 1 ? "Курс в работе" : "Курс в работе", g1); F.setPos(c, x, RT + 372); gsap.set(c, { autoAlpha: 0 });
  return { r, a, c };
});
// курсор: нажимает на этап 02
const clAt = t("Нажмите");
const cur = el("s6-cur", '<svg width="56" height="56" viewBox="0 0 24 24"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="#eef0f3" stroke="#0f1115" stroke-width="1.4" stroke-linejoin="round"/></svg>', g1);
cur.setAttribute("data-layout-allow-overlap", "");
const tx = rb.cx(1) - 10, ty = RT + 50;
gsap.set(cur, { x: 1400, y: 760, autoAlpha: 0 });
tl.set(cur, { autoAlpha: 1 }, clAt - 0.1);
tl.to(cur, { x: tx, y: ty, duration: 1.0, ease: "power2.inOut" }, clAt);
const ring = el("s6-ring", "", g1); F.setPos(ring, rb.cx(1) - 45, RT - 5); gsap.set(ring, { autoAlpha: 0 }); ring.setAttribute("data-layout-allow-overlap", "");
tl.fromTo(ring, { autoAlpha: 1, scale: 0.4 }, { autoAlpha: 0, scale: 1.5, duration: 0.6, ease: "power2.out", immediateRender: false }, clAt + 1.0);
tl.to(rb.nodes[1], { borderColor: F.C.acc, color: F.C.accS, boxShadow: "0 0 0 8px rgba(255,122,89,.18)", duration: 0.3 }, clAt + 1.0);
tl.to(cur, { autoAlpha: 0, duration: 0.4 }, clAt + 2.2);
const page = el("s6-page", "<h3>Страница этапа · Анализ требований</h3><div class='row'></div>", g1);
const prow = page.querySelector(".row");
["Обзор", "Карта маршрута", "Уровень, к которому идти"].forEach((tx2, i) => { const c = el("lg-tag", tx2, prow); c.style.fontSize = "30px"; gsap.set(c, { autoAlpha: 0 }); show(c, t("откроется") + 0.5 + i * 0.35, 8); });
show(page, t("откроется"), 14);
// «Курс в работе» на карте; у анализа — «Курс →»
const sAt = t("Сегодня") + 0.2;
rows.forEach((o, i) => tl.fromTo(o.c, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, immediateRender: false }, sAt));
const c2 = el("s6-cta on", "Курс →", g1); F.setPos(c2, rb.cx(1) - 114, RT + 372); gsap.set(c2, { autoAlpha: 0 });
tl.to(rows[1].c, { autoAlpha: 0, duration: 0.2 }, t("есть") + 0.1);
tl.fromTo(c2, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false }, t("есть") + 0.15);
tl.to(rb.nodes[1], { borderColor: F.C.ok, color: F.C.ok, boxShadow: "0 0 0 0 rgba(0,0,0,0)", duration: 0.3 }, t("есть") + 0.1);
// --- часть 2: полоса курса ---
const swAt = t("Подготовка") - 0.55;
tl.to(g1, { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, swAt);
tl.set(g2, { autoAlpha: 1 }, swAt + 0.45);
const sv = F.layer(g2);
const ICON = ["bulb", "branch", "doc", "sitemap"];
const nodes = [], px = [150, 300, 450, 600], qx = [800, 917, 1033, 1150, 1267, 1383, 1500], dx = 1740, NY = 238;
const mk = (cx, txt, i) => { const d = el("s6-sn", txt, g2); F.setPos(d, cx - 38, NY); nodes.push(d); return d; };
px.forEach((x, i) => mk(x, F.icon(ICON[i], 38, F.C.t2), i));
qx.forEach((x, i) => mk(x, i < 5 ? String(i + 1) : i === 5 ? "6а" : "6б", i));
mk(dx, "7");
const gl = [["Подготовка", 96, ""], ["Практика", 770, "<small>кредитный калькулятор</small>"], ["Разработка", 1624, ""]].map(([tx2, x, sm]) => { const d = el("s6-gl", tx2 + sm, g2); d.style.left = x + "px"; return d; });
const cxs = [...px, ...qx, dx];
const segs = [];
cxs.forEach((x, i) => { if (i < cxs.length - 1) segs.push(F.path(sv, `M ${x + 42} ${NY + 38} L ${cxs[i + 1] - 42} ${NY + 38}`, F.C.line, 5)); });
// показ: эстафета слева направо
const stripAt = t("Подготовка") - 0.3;
nodes.forEach((d, i) => { gsap.set(d, { autoAlpha: 0 }); tl.fromTo(d, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false }, stripAt + i * 0.07); });
segs.forEach((p, i) => { gsap.set(p, { strokeDashoffset: 0, autoAlpha: 0 }); tl.fromTo(p, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, stripAt + i * 0.07 + 0.1); });
gl.forEach((d, i) => show(d, stripAt + [0, 0.4, 0.8][i], 8));
const lit = (i, at) => tl.to(nodes[i], { borderColor: F.C.ok, color: F.C.ok, backgroundColor: "rgba(60,207,145,.14)", duration: 0.3 }, at);
const caps = [["Зачем меняем процесс", t("Подготовка"), 0], ["Markdown и Git", t("маркдаун"), 1], ["SDD и OpenSpec", t("эс-ди-ди"), 2], ["Мета-репозиторий", t("мета-репозиторий"), 3]];
caps.forEach(([txt, at0, ni], i) => {
  const d = el("s6-cap", "Подготовка · <em>" + txt + "</em>", g2); show(d, at0, 8); lit(ni, at0);
  tl.to(d, { autoAlpha: 0, duration: 0.25 }, (i < 3 ? caps[i + 1][1] : t("Затем")) - 0.05);
});
// мета-репозиторий: схема
const mAt = t("мета-репозиторий");
const meta = el("s6-meta", "<b>" + F.icon("sitemap", 44, F.C.ok) + "Мета-репозиторий<br>продукта</b><span>точка входа с нужным контекстом</span>", g2); show(meta, mAt + 0.3, 12);
const mlines = [];
const lks = [["link", "ссылки на репозитории продукта", 450], ["commit", "версии", 546], ["doc", "спецификации", 642]];
lks.forEach(([ic, txt, y], i) => {
  const d = el("s6-lk", F.icon(ic, 38, F.C.ok) + txt, g2); d.style.top = y + "px"; show(d, mAt + 1.0 + i * 0.4, 10);
  const p = F.path(sv, `M 716 ${y > 540 ? 560 : 520} C 840 ${y > 540 ? 560 : 520}, 860 ${y + 33}, 960 ${y + 33}`, F.C.ok, 4); F.draw(tl, p, mAt + 0.9 + i * 0.4, 0.5); mlines.push(p);
});
const who = el("s6-who", F.person(60, F.C.accS, 5) + "<span style='color:var(--k-text-2)'>+</span>" + People.robotIcon(48) + "<span>начать задачу с нужным контекстом</span>", g2); show(who, t("помогает"), 8);
const metaOut = t("Затем") - 0.35;
tl.to([meta, who, ...mlines, ...g2.querySelectorAll(".s6-lk")], { autoAlpha: 0, duration: 0.35 }, metaOut);
// практика и разработка
const pr = t("практика") - 0.1;
const cap2 = el("s6-cap", "Практика · <em>кредитный калькулятор</em>", g2); show(cap2, pr + 0.1, 8);
qx.forEach((_, i) => lit(4 + i, t("практика") + 0.1 + i * 0.28));
const dv = t("разработка");
tl.to(cap2, { autoAlpha: 0, duration: 0.25 }, dv - 0.05);
const cap3 = el("s6-cap", "Разработка · <em>практикум</em>", g2); show(cap3, dv, 8); lit(11, dv);
// в каждом шаге: ролик, образец, результат
const stAt = t("В каждом");
tl.to(cap3, { autoAlpha: 0, duration: 0.25 }, stAt - 0.1);
const st = el("s6-step", "<h3>В каждом шаге</h3>", g2); show(st, stAt, 14);
[["play", "ролик", t("ролик,")], ["doc", "учебный образец", t("учебный")], ["box", "проверяемый результат", t("проверяемый")]].forEach(([ic, tx2, at0]) => {
  const r = el("s6-sr", F.icon(ic, 44, F.C.ok) + "<span>" + tx2 + "</span>", st); gsap.set(r, { autoAlpha: 0 }); show(r, at0, 8);
});
