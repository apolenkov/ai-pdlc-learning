L.head("План изменений · <span>семь шагов</span>", 0.1);
const sub = el("s5-sub", "на одном выбранном потоке продукта"); show(sub, t("потоке") - 0.2, 8);
const names = ["Установочная встреча", "Подготовка по гайдам", "Аудит: беседа с командой", "План изменений", "Обучение и мета-репозиторий", "Внедрение первым потоком", "Метрики и повторный аудит"];
const TOP = 480, RISE = 180, FT = TOP - RISE; // лента стоит по центру, пока кадр пуст, и поднимается, когда приходит содержимое
const times = [t("Установочная"), t("Подготовка"), t("Аудит"), t("План изменений"), t("Обучение"), t("Внедрение"), t("повторный")].map((x) => x - 0.15);
const rb = L.ribbon({ top: TOP, names, cls: "ok" });
// лента видна с первого кадра приглушённой и зажигается шаг за шагом вместе с голосом
rb.stops.forEach((st, i) => {
  gsap.set(st, { opacity: 0.4 });
  tl.fromTo(st, { opacity: 0.4 }, { opacity: 1, duration: 0.35, ease: "power2.out", immediateRender: false }, times[i]);
  if (rb.links[i]) { gsap.set(rb.links[i], { opacity: 0.4 }); tl.fromTo(rb.links[i], { opacity: 0.4 }, { opacity: 1, duration: 0.4, immediateRender: false }, times[i]); }
});
const svg = F.layer(S.root);
// скобка «один поток» над шагами
const bx0 = rb.cx(0) - 110, bx1 = rb.cx(6) + 110;
const br = F.path(svg, `M ${bx0} ${TOP - 4} L ${bx0} ${TOP - 24} L ${bx1} ${TOP - 24} L ${bx1} ${TOP - 4}`, F.C.info, 5);
F.draw(tl, br, t("потоке") - 0.1, 1.2);
tl.to([rb.rail, br], { y: -RISE, duration: 0.8, ease: "power2.inOut" }, t("беседа") - 0.5);
// шаг 3: аудит — одна недавняя задача по семи этапам: как сейчас → что мешает → что попробуем
const aAt = t("беседа") - 0.1, aEnd = t("метрики") - 0.5; // карточка аудита держится до метрик: из аудита вырастает план
const c1 = el("lg-card ok s5-card", "<h3>Аудит · одна недавняя задача по семи этапам</h3><div class='s5-flow'><i>как работаете сейчас</i><b>→</b><i>что мешает</i><b>→</b><i class='n'>что хотите попробовать</i></div>");
show(c1, aAt, 14); hide(c1, aEnd);
[...c1.querySelectorAll(".s5-flow > *")].forEach((x, k) => { gsap.set(x, { autoAlpha: 0 }); tl.fromTo(x, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false }, t("беседа") + 0.3 + k * 0.35); });
// шаг 7: метрики до и после против исходного уровня
const mAt = t("метрики"), mEnd = t("Одни") - 0.3;
const c2 = el("lg-card ok s5-card", "<h3>Повторный аудит · метрики до и после</h3><div class='s5-mm'><div class='s5-col'><div style='height:80px;background:var(--k-panel-2);border:3px solid var(--k-line)'></div>до</div><div class='s5-col'><div style='height:150px;background:var(--k-ok-tint);border:3px solid var(--k-ok)'></div>после</div><div class='s5-col' style='flex:2;text-align:left;color:var(--k-text-2);font-weight:700;padding-bottom:50px'>сравниваем с исходным уровнем продукта</div></div>");
show(c2, mAt - 0.2, 14); // остаётся до конца сцены
// теория и практика: цветные метки под шагами
const kinds = [["th", "ТЕОРИЯ"], ["th", "ТЕОРИЯ"], ["pr", "ПРАКТИКА"], ["pr", "ПРАКТИКА"], ["bo", "ТЕОРИЯ + ПРАКТИКА"], ["pr", "ПРАКТИКА"], ["pr", "ПРАКТИКА"]];
const pr = t("практика"), tgAt = [t("теория"), t("теория") + 0.3, pr, pr + 0.25, t("задаче") - 0.1, pr + 0.5, pr + 0.75];
const tags = kinds.map(([k, tx], i) => { const g = el("s5-tag", "<span class='" + k + "'>" + tx + "</span>"); F.setPos(g, rb.cx(i) - 114, FT + 236); return g; });
tags.forEach((g, i) => show(g, tgAt[i], 8));
const tail = el("s5-sub", "на реальной задаче продукта"); tail.style.top = "616px"; show(tail, t("реальной") - 0.2, 8);
