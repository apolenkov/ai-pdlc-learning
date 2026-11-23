L.head("Метод · <span>семь этапов</span>", 0.1);
const names = ["Намерение и план", "Анализ требований", "Архитектура и дизайн", "Реализация", "Тестирование", "Выпуск", "Наблюдение"];
const TOP = 270;
const rev = [t("Сам"), t("от намерения") + 0.1, t("плана") , t("до") + 0.15, t("этапов") + 0.2, t("наблюдения") - 0.1, t("эффектом") - 0.1];
const times = [t("семь") + 0.2, t("семь") + 0.4, t("семь") + 0.6, t("семь") + 0.8, t("этапов") + 0.05, t("наблюдения") - 0.15, t("наблюдения") + 0.15];
const rb = L.ribbon({ top: TOP, names, cls: "ok", reveal: (i) => times[i] });
const svg = F.layer(S.root);
// 1) у каждого этапа один решающий — человек под узлом
const hAt = t("один");
const dec = names.map((_, i) => { const p = el("s4-who", F.person(84, F.C.acc, 5)); F.setPos(p, rb.cx(i) - 114, TOP + 188); show(p, hAt + i * 0.14, 10); return p; });
const decLab = el("s4-tag", "решает один человек"); F.setPos(decLab, 96, TOP + 288, 1728); show(decLab, t("решающий") + 0.2, 6);
// 2) «делает» и «смотрит» — другие люди: пример на этапе «Реализация»
const cAt = t("делает") - 0.7;
const card = el("lg-card s4-card", "<h3>Этап «Реализация»: три роли — три разных человека</h3>"); card.style.top = "660px";
const roles = [["ДЕЛАЕТ", "разработчик с агентом по плану", "", t("делает")], ["СМОТРИТ", "техлид и автопроверки CI", "", t("смотрит")], ["РЕШАЕТ", "назначенный ревьюер", " acc", t("решающий")]];
const roleEls = roles.map(([k, v, cls, when], i) => { const r = el("s4-role" + cls, "<small>" + k + "</small><b>" + v + "</b>", card); r.style.left = 34 + i * 560 + "px"; return r; });
show(card, cAt, 14);
const rw = [t("делает") + 0.1, t("смотрит") + 0.1, t("человек") - 0.2];
roleEls.forEach((r, i) => show(r, [t("делает") - 0.1, t("смотрит") - 0.1, cAt + 0.2][i], 10));
tl.to(dec.filter((_, i) => i !== 3), { opacity: 0.35, duration: 0.4 }, cAt);
// 3) агент помогает на этапах 2–5 в границах и решений не принимает
const aAt = t("Агент");
tl.to([card, decLab], { autoAlpha: 0, duration: 0.4, ease: "power2.in" }, aAt - 0.5);
tl.to(dec, { opacity: 1, duration: 0.4 }, aAt - 0.5);
const ag = [1, 2, 3, 4].map((i, k) => { const a = el("s4-agent", People.robotIcon(34)); F.setPos(a, rb.cx(i) - 30, TOP - 76); show(a, t("второго") - 0.3 + k * 0.28, 10); return a; });
const bx0 = rb.cx(1) - 100, bx1 = rb.cx(4) + 100;
const br = F.path(svg, `M ${bx0} ${TOP - 4} L ${bx0} ${TOP - 18} L ${bx1} ${TOP - 18} L ${bx1} ${TOP - 4}`, F.C.ok, 5); F.draw(tl, br, t("этапах") - 0.1, 1.0);
const bl = el("lg-card ok s4-pnl", People.robotIcon(64) + "<div><b>Агент</b> готовит и исполняет внутри согласованных границ</div>"); bl.style.left = "96px"; show(bl, t("границах") - 1.0, 12);
const nd = el("lg-card acc s4-pnl", F.icon("users", 64, F.C.accS) + "<div><b>Решение</b> принимает человек, не агент</div>"); nd.style.left = "984px"; show(nd, t("решений") - 0.1, 12);
tl.to(dec.slice(1, 5), { scale: 1.12, duration: 0.4, ease: "back.out(2)", yoyo: true, repeat: 1 }, t("не принимает"));
// 4) не семь документов: глубина зависит от задачи
const dAt = t("Семь", 2);
tl.to([bl, nd], { autoAlpha: 0, duration: 0.4 }, dAt - 0.4);
tl.to(ag, { autoAlpha: 0, duration: 0.4 }, dAt - 0.4);
const hs = [140, 240, 190, 280, 220, 140, 100];
const bars = hs.map((h, i) => { const b = el("s4-bar", ""); b.style.height = h + "px"; F.setPos(b, rb.cx(i) - 75, 960 - h); b.style.height = h + "px"; gsap.set(b, { autoAlpha: 0 }); tl.fromTo(b, { autoAlpha: 0, scaleY: 0.1, transformOrigin: "50% 100%" }, { autoAlpha: 1, scaleY: 1, duration: 0.45, ease: "power2.out", immediateRender: false }, t("документов") - 0.2 + i * 0.1); return b; });
const dn = el("s4-note", "глубина зависит от задачи"); F.setPos(dn, 96, 590, 1728); show(dn, t("глубина") - 0.1, 8);
