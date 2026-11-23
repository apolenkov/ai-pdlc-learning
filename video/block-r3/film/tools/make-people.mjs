#!/usr/bin/env node
// Зарисовки людей и робота-агента для лендинговых роликов (TASK-577), в стиле курсовых фильмов.
// node video/_shared/tools/make-people.mjs <каталог film> → <film>/assets/sketches/*.svg (затем: node tools/build-sketches.mjs в film).
// Люди берутся из готовых курсовых зарисовок block-0 (штрихи class="s" pathLength="1"), робот и пары собираются из них.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../block-0/film/assets/sketches");
const out = resolve(process.argv[2] || ".", "assets/sketches");
mkdirSync(out, { recursive: true });

const WHITE = "#eef0f3", GREY = "#a3a9b4", OK = "#3ccf91", ACC = "#ff7a59";
const r1 = (n) => Math.round(n * 10) / 10;
const stroke = (d, color = WHITE, w = 4) => `<path class="s" pathLength="1" stroke="${color}" stroke-width="${w}" d="${d}"/>`;
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`;

// штрихи готовой зарисовки курса: массив строк <path …/> в исходном порядке
const paths = (name) => [...readFileSync(`${src}/${name}.svg`, "utf8").matchAll(/<path class="s"[^>]*\/>/g)].map((m) => m[0]);
const pick = (all, ...ranges) => ranges.flatMap(([a, b]) => all.slice(a, b + 1));
// сдвиг и масштаб: ширину штриха пересчитываем, чтобы на кадре она не менялась
const place = (tags, tx, ty, s = 1, mirror = false) =>
  `<g transform="translate(${r1(tx)} ${r1(ty)}) scale(${mirror ? -s : s} ${s})">` +
  tags.map((t) => t.replace(/stroke-width="([\d.]+)"/, (_, w) => `stroke-width="${r1(w / s)}"`)).join("") + "</g>";
const recolor = (tags, from, to) => tags.map((t) => t.replace(`stroke="${from}"`, `stroke="${to}"`));

const rrect = (x, y, w, h, r) => `M ${r1(x + r)} ${r1(y)} H ${r1(x + w - r)} Q ${r1(x + w)} ${r1(y)} ${r1(x + w)} ${r1(y + r)} V ${r1(y + h - r)} Q ${r1(x + w)} ${r1(y + h)} ${r1(x + w - r)} ${r1(y + h)} H ${r1(x + r)} Q ${r1(x)} ${r1(y + h)} ${r1(x)} ${r1(y + h - r)} V ${r1(y + r)} Q ${r1(x)} ${r1(y)} ${r1(x + r)} ${r1(y)} Z`;
const circle = (x, y, r) => `M ${r1(x - r)} ${r1(y)} A ${r} ${r} 0 1 0 ${r1(x + r)} ${r1(y)} A ${r} ${r} 0 1 0 ${r1(x - r)} ${r1(y)} Z`;

// агент = окно терминала (решение владельца 17.10 21:15): одна линия, без лица; рамка, строка заголовка с двумя точками, зелёные «>_».
// (x,y) — левый верх, k — масштаб (окно 96×100 при k=1); толщину штриха держим постоянной на кадре
function terminal(x, y, k = 1, w = 4) {
  const W = 96 * k, H = 100 * k, t = (n) => r1(n * k);
  return stroke(rrect(x, y, W, H, 12 * k), WHITE, w) + stroke(`M ${x} ${r1(y + 24 * k)} H ${r1(x + W)}`, GREY, w * 0.75) +
    stroke(circle(x + t(14), y + t(12), 2.5 * k), GREY, w * 0.75) + stroke(circle(x + t(26), y + t(12), 2.5 * k), GREY, w * 0.75) +
    stroke(`M ${r1(x + 18 * k)} ${r1(y + 48 * k)} L ${r1(x + 34 * k)} ${r1(y + 62 * k)} L ${r1(x + 18 * k)} ${r1(y + 76 * k)}`, OK, w * 1.2) +
    stroke(`M ${r1(x + 44 * k)} ${r1(y + 78 * k)} H ${r1(x + 68 * k)}`, OK, w * 1.2);
}

// --- робот за столом (справа, смотрит влево); мебель из ch-gitlab, система координат рисунка 640×480
const gl = paths("ch-gitlab");
const furnitureRight = pick(gl, [29, 34]); // кресло, стол, ноутбук
const robotAtDesk = () => terminal(506, 196); // окно парит над креслом на месте сидящего

const floor = pick(gl, [35, 35]);
const docs = pick(gl, [41, 47]);

// пара «аналитик + агент»: слева человек (курс), справа робот, между ними черновик перелетает по дуге
const person = pick(gl, [0, 16]);
const owner = pick(gl, [17, 34]);
const pairAnalyst = place(person, 0, 0) + place(furnitureRight, 0, 0) + place(floor, 0, 0) + robotAtDesk() + place(docs, 0, 0);
// пара «владелец + агент»: слева робот (зеркально), справа человек; над человеком оранжевая «галочка» решения
const check = recolor(pick(gl, [36, 37]), "#7cc4ff", ACC);
const pairOwner = `<g transform="translate(640 0) scale(-1 1)">${furnitureRight.join("")}</g>` + terminal(38, 196) + place(owner, 0, 0) + place(floor, 0, 0) +
  place(check, 440, 0) + place(docs, 0, 0);

// человек у компьютера (курс, ch-computer) и робот за левым краем стола читает те же файлы
const cc = paths("ch-computer");
const pairStart = place(pick(cc, [0, 24]), 0, 0) + stroke("M 24 434 H 616", GREY, 3) + terminal(44, 172) + stroke("M 56 274 H 128 M 66 274 V 434", GREY, 3);

// --- ряды: линейные фигуры из team-done (три стоящих человека)
const td = paths("team-done");
const stand = [pick(td, [0, 8]), pick(td, [9, 18]), pick(td, [19, 30])]; // x 42–97 / 146–205 / 259–317, y 99–440
const FW = 1728, FH = 150, FS = 0.4, FX = [69.5, 175.5, 288]; // центр каждой фигуры в исходных координатах
const figure = (kind, cx, top, s = FS) => place(stand[kind], cx - FX[kind] * s, top - 100 * s, s);
const ground = (cx, y, w = 108) => stroke(`M ${r1(cx - w / 2)} ${y} H ${r1(cx + w / 2)}`, GREY, 3);
const cxAt = (i, n) => r1((FW / n) * (i + 0.5));
const rowFigures = (n) => svg(FW, FH, [...Array(n)].map((_, i) => figure(i % 3, cxAt(i, n), 4) + ground(cxAt(i, n), r1(4 + 336 * FS))).join(""));

const files = {
  "pair-analyst": svg(640, 480, pairAnalyst),
  "pair-owner": svg(640, 480, pairOwner),
  "pair-start": svg(640, 480, pairStart),
  "row-people": rowFigures(7),
  "roles-6": rowFigures(6),
  "roles-8": rowFigures(8),
  // ряд агентов над людьми: по роботу над каждым этапом
  "row-robots": svg(FW, 100, [...Array(7)].map((_, i) => terminal(cxAt(i, 7) - 24, 40, 0.5, 3)).join("")),
};
for (const [n, body] of Object.entries(files)) writeFileSync(`${out}/${n}.svg`, body);
// готовые курсовые зарисовки, нужные в сценах (копируем в каталог ролика)
for (const n of ["intro-idea", "thinking", "ch-computer", "ch-gitlab", "merge", "team-done", "was-apart"]) copyFileSync(`${src}/${n}.svg`, `${out}/${n}.svg`);
console.log(`${Object.keys(files).length} новых + 7 курсовых → ${out}`);
