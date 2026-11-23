L.head("Главное условие — <span>репозиторий</span>");
const g1 = el("s5-g"), g2 = el("s5-g");
gsap.set(g2, { autoAlpha: 0 });
const sv = F.layer(g1);
// слева: письма и чаты, агент на ощупь
const chips = [["mail", "Письма", 200, -2], ["link", "Чаты", 316, 1.5], ["doc", "Страницы", 432, -1]].map(([ic, txt, top, rot], i) => {
  const c = el("s5-chip", F.icon(ic, 40, F.C.t2) + txt, g1); c.style.top = top + "px"; c.style.transform = "rotate(" + rot + "deg)"; show(c, 0.5 + i * 0.25, 12); return c;
});
const cap = el("s5-cap", "агент на ощупь:<br>зацепиться не за что", g1); show(cap, 1.3);
const wob = [226, 342, 458].map((y) => F.path(sv, `M 616 ${y} C 690 ${y}, 700 456, 740 456`, "#a3a9b4", 3, "10 12"));
wob.forEach((p, i) => { gsap.set(p, { strokeDashoffset: 0, autoAlpha: 0 }); tl.to(p, { autoAlpha: 1, duration: 0.3 }, 0.9 + i * 0.15); });
tl.to(wob, { strokeDashoffset: -88, duration: 5, ease: "none" }, 0.9);
const ag = el("s5-ag", People.robotIcon(64), g1); show(ag, 0.8);
const q = el("s5-q", "?", g1); show(q, 1.3, 6);
// справа: репозиторий — файлы рядом с кодом
const repo = el("s5-repo", "<div class='s5-rh'>" + F.icon("folder", 44, F.C.ok) + "<span>product</span><em>репозиторий</em><i class='s5-base' style='opacity:0'>ОСНОВА</i></div>", g1);
show(repo, t("репозиторий") - 0.1, 18);
const files = [["intent.md", "намерение", "намерение,"], ["spec.md", "спецификация", "спецификация,"], ["adr/", "решения", "решения,"], ["tests/", "тесты", "тесты"], ["AGENTS.md", "правила для агента", "правила"], ["src/", "код", "кодом"]];
const fe = files.map(([nm, role, key]) => { const f = el("s5-file", F.icon("doc", 34, F.C.t2) + "<code>" + nm + "</code><span class='rl'>" + role + "</span>", repo); gsap.set(f, { autoAlpha: 0 }); return f; });
const solid = F.path(sv, "M 868 456 L 960 456", F.C.ok, 6); gsap.set(solid, { autoAlpha: 0 });
const aAt = t("зацепиться");
tl.fromTo(solid, { autoAlpha: 0 }, { autoAlpha: 1, strokeDashoffset: 0, duration: 0.4, immediateRender: false }, aAt - 0.8);
tl.to([...chips, cap], { opacity: 0.22, duration: 0.5 }, aAt);
tl.to(wob, { autoAlpha: 0, duration: 0.5 }, aAt);
tl.to(q, { autoAlpha: 0, duration: 0.3 }, aAt);
tl.to(repo, { borderColor: F.C.ok, duration: 0.4 }, aAt);
const fAt = [t("намерение,"), t("спецификация,"), t("решения,"), t("тесты"), t("правила"), t("рядом с кодом")];
fe.forEach((f, i) => {
  tl.fromTo(f, { autoAlpha: 0, x: -18 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, fAt[i] - 0.1);
  tl.to(f, { borderColor: F.C.ok, color: F.C.text, duration: 0.25 }, fAt[i]);
  if (i < 5) tl.to(f, { borderColor: "transparent", duration: 0.3 }, fAt[i] + 1.1);
});
// внешние системы — подключаются; основа — файлы
const mAt = t("Внешние системы");
tl.to([...chips, cap], { autoAlpha: 0, duration: 0.4 }, mAt - 0.3);
const ext = el("s5-ext", "<b>Внешние системы</b><span>подключаются, когда нужно</span>", g1); show(ext, mAt, 12);
const mline = F.path(sv, "M 656 380 C 700 380, 700 440, 740 450", "#a3a9b4", 3, "10 12"); gsap.set(mline, { strokeDashoffset: 0, autoAlpha: 0 });
tl.fromTo(mline, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, t("подключить") - 0.2);
tl.to(mline, { strokeDashoffset: -88, duration: 4, ease: "none" }, t("подключить") - 0.2);
const bAt = t("основа");
const base = repo.querySelector(".s5-base");
tl.fromTo(base, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false }, bAt);
tl.to(ext, { opacity: 0.5, duration: 0.4 }, bAt);
tl.to(solid, { attr: { "stroke-width": 11 }, duration: 0.4 }, bAt);
fe.forEach((f) => tl.to(f, { borderColor: F.C.ok, color: F.C.text, duration: 0.25 }, bAt + 0.4));
// --- вторая часть: одна спецификация видна везде ---
const hAt = t("Одна");
tl.to(g1, { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, hAt - 0.5);
tl.set(g2, { autoAlpha: 1 }, hAt - 0.05);
const sv2 = F.layer(g2);
const spec = el("s5-spec", "<code>spec.md</code><span>одна спецификация</span>", g2); show(spec, hAt + 0.1, 14);
const tg = [["branch", "Запрос на слияние", "MR", 190, "запросе"], ["box", "Тесты", "проверяют то же", 330, "тестах"], ["doc", "Решение об архитектуре", "ADR", 470, "решении"]];
tg.forEach(([ic, ttl, sm, y, k], i) => {
  const c = el("s5-tgt", F.icon(ic, 50, F.C.ok) + "<span>" + ttl + "</span><small>" + sm + "</small>", g2); c.style.top = y + "px"; show(c, t(k), 12);
  const p = F.path(sv2, `M 536 360 C 650 360, 680 ${y + 59}, 790 ${y + 59}`, F.C.ok, 5); F.draw(tl, p, t(k) - 0.35, 0.6);
});
// история изменений: кто, что, почему
const LY = 740;
const base2 = F.path(sv2, `M 96 ${LY} L 1824 ${LY}`, "#a3a9b4", 5);
F.draw(tl, base2, t("Кто") - 0.2, 1.2);
const dots = [];
for (let i = 0; i < 9; i++) { const d = el("f-abs", "", g2); d.style.cssText = `position:absolute;left:${96 + 20 + i * 200}px;top:${LY - 14}px;width:28px;height:28px;border-radius:50%;background:var(--k-bg);border:5px solid var(--k-ok)`; dots.push(d); show(d, t("Кто") + 0.1 + i * 0.12, 0); }
const hist = el("s5-hist", "<span>история изменений</span> — у каждого коммита", g2); hist.style.top = "640px"; show(hist, t("истории") - 0.2);
[["кто", "Кто", 1], ["что", "что", 3], ["почему", "почему", 5]].forEach(([w, k, di]) => {
  const l = el("s5-w", w, g2); l.style.left = 96 + 20 + di * 200 - 86 + "px"; show(l, t(k, k === "что" ? 2 : 1), 8);
  tl.to(dots[di], { backgroundColor: F.C.accS, borderColor: F.C.acc, duration: 0.3 }, t(k, k === "что" ? 2 : 1));
});
const mem = el("s5-mem", F.icon("x", 30, F.C.acc, 3) + "чья-то память", g2); show(mem, t("чьей-то"), 8);
