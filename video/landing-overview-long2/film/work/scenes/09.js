const g1 = el("s7-g"), g2 = el("s7-g"), g3 = el("s7-g");
gsap.set([g2, g3], { autoAlpha: 0 });
const TEAM = "Команда развития процессов AI PDLC"; // course-names.json › teamName
// --- 1: имя команды и путь по кольцу ---
const tt = el("s7-title", "<b>" + TEAM.replace("Команда развития", "<em>Команда развития</em>").replace("процессов ", "процессов<br>") + "</b>", g1);
show(tt, t("команда"), 16);
const sub = el("s7-sub", "<span class='f-tag now' style='font-size:34px;padding:8px 24px'>коротко — команда развития</span>", g1); show(sub, t("коротко"), 10);
const svg = F.layer(g1);
const CX = 1330, CY = 560, R = 200;
const ang = [-90, 0, 90, 180];
const pos = ang.map((a) => [CX + R * Math.cos(a * Math.PI / 180), CY + R * Math.sin(a * Math.PI / 180)]);
const sAt = [t("аудит"), t("план", 1), t("обучение"), t("метрики")];
const info = [["search", "аудит"], ["doc", "план изменений"], ["users", "обучение по ролям"], ["chart", "метрики до и после"]];
// дуги между шагами
const arcs = pos.map((p, i) => { const q = pos[(i + 1) % 4]; return F.path(svg, `M ${p[0] + (i === 3 ? -2 : 0)} ${p[1]} A ${R} ${R} 0 0 1 ${q[0]} ${q[1]}`, "#a3a9b4", 5); });
const st = pos.map((p, i) => { const n = el("s7-st", F.icon(info[i][0], 48, F.C.t2, 2), g1); F.setPos(n, p[0] - 48, p[1] - 48); return n; });
const lb = pos.map((p, i) => {
  const l = el("s7-sl", info[i][1].replace(" ", "<br>").replace("<br>до", " до"), g1);
  if (i === 0) F.setPos(l, p[0] - 200, p[1] - 150, 400);
  if (i === 1) F.setPos(l, p[0] + 68, p[1] - 36, 330);
  if (i === 2) F.setPos(l, p[0] - 200, p[1] + 64, 400);
  if (i === 3) F.setPos(l, p[0] - 400, p[1] - 36, 332);
  if (i === 0 || i === 2) l.style.textAlign = "center"; if (i === 3) l.style.textAlign = "right";
  return l;
});
const ringBase = F.path(svg, `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R}`, "#2a2f3a", 4, "2 14");
tl.fromTo(ringBase, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: "none", immediateRender: false }, t("Путь") - 0.2);
const ringIn = (e, at) => { gsap.set(e, { autoAlpha: 0 }); tl.fromTo(e, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false }, at); };
st.forEach((n, i) => { ringIn(n, sAt[i] - 0.25); gsap.set(lb[i], { autoAlpha: 0 }); tl.fromTo(lb[i], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, immediateRender: false }, sAt[i] - 0.1); });
arcs.forEach((a, i) => { const at = i < 3 ? sAt[i] + 0.2 : sAt[3] + 0.9; F.draw(tl, a, at, i < 3 ? 0.6 : 0.9, "power1.inOut"); });
st.forEach((n, i) => tl.to(n, { borderColor: F.C.acc, boxShadow: "0 0 0 8px rgba(255,122,89,.16)", duration: 0.3 }, sAt[i]));
st.forEach((n, i) => { n.querySelector("svg").setAttribute("data-i", i); tl.to(n.querySelector("svg"), { stroke: F.C.accS, duration: 0.3 }, sAt[i]); });
// --- 2: аудит — шаблон из трёх частей ---
const aAt = t("Аудит");
tl.to(g1, { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, aAt - 0.5);
tl.set(g2, { autoAlpha: 1 }, aAt - 0.05);
const h2 = el("lg-h", "Аудит · <span>шаблон из трёх частей</span>", g2); show(h2, aAt, 14);
const c = (x, no, ttl, body, when) => { const d = el("lg-card ok s7-card", "<div class='no'>" + no + "</div><h3>" + ttl + "</h3>" + body, g2); d.style.left = x + "px"; show(d, when, 16); return d; };
const dots = "<div class='s7-dots'>" + "<i></i>".repeat(7) + "</div>";
c(96, "1", "Беседа с командой", "<p>по семи этапам</p>" + dots, t("беседа") - 0.2);
c(680, "2", "Проблема → цель", "<div class='s7-cols'><div>проблема</div><div class='n'>цель</div></div>", t("проблема") - 0.5);
c(1264, "3", "План изменений", "<p>с метриками «до»</p><div class='s7-cols'><div class='n'>метрики до</div></div>", t("план", 2) - 0.2);
const plate = el("s7-plate", "Заполняет команда продукта — проверяет команда развития", g2); show(plate, t("с метриками") + 1.0, 14);
// --- 3: наставник остаётся, коуч уходит ---
const nAt = t("Наставник");
tl.to(g2, { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, nAt - 0.55);
tl.set(g3, { autoAlpha: 1 }, nAt - 0.1);
const sv3 = F.layer(g3);
const h3 = el("lg-h", "Наставник остаётся <span>внутри продукта</span>", g3); show(h3, nAt, 14);
const tiers = [["users", "Команда развития", "ведёт путь по этапам", 200, "lg-card acc"], ["star", "Наставник", "доброволец из вашей команды", 410, "lg-card ok"], ["folder", "Продуктовая команда", "работает с агентами сама", 620, "lg-card"]];
tiers.forEach(([ic, a, b, y, cls], i) => {
  const d = el(cls + " s7-tier", F.icon(ic, 64, i === 0 ? F.C.accS : i === 1 ? F.C.ok : F.C.t2) + "<div><b>" + a + "</b><span>" + b + "</span></div>", g3); d.style.top = y + "px";
  show(d, nAt + 0.3 + i * 0.45, 14);
  if (i < 2) { const p = F.path(sv3, `M 606 ${y + 140} L 606 ${y + 208}`, F.C.t2, 5); F.draw(tl, p, nAt + 0.7 + i * 0.45, 0.35); const ah = F.arrowHead(sv3, 606, y + 210, 90, F.C.t2, 14); tl.to(ah, { opacity: 1, duration: 0.15 }, nAt + 1.0 + i * 0.45); }
});
const coach = el("s7-coach", F.person(190, F.C.accS, 5) + "<div class='f-lab' style='color:" + F.C.accS + "'>коуч</div>", g3); show(coach, t("вашей"), 14);
const ment = el("s7-coach", F.person(190, F.C.ok, 5) + "<div class='f-lab' style='color:" + F.C.ok + "'>наставник</div>", g3); ment.style.left = "1250px"; ment.style.top = "380px"; coach.style.left = "1520px"; coach.style.top = "380px"; show(ment, t("остаётся"), 14);
const lk = t("уходит");
tl.to(coach, { x: 560, autoAlpha: 0, duration: 1.3, ease: "power2.in" }, t("коуч") + 0.15);
tl.to(ment.querySelector("svg"), { scale: 1.12, duration: 0.5, ease: "back.out(2)", transformOrigin: "50% 100%" }, t("коуч") + 0.8);
