#!/usr/bin/env node
// Самопроверка чистых функций набора: timeOf и деление субтитров. Запуск: node tools/test-kit.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {}, document: { createElement: () => ({
  style: {}, appendChild() {}, setAttribute() {},
}) }, getComputedStyle: () => ({ getPropertyValue: () => "0.5" }) };
ctx.window.gsap = { set() {} }; ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(readFileSync(`${root}/kit/kit.js`, "utf8"), ctx);
const Kit = ctx.window.Kit;
const text = "Откройте файл. Нажмите кнопку. Затем нажмите ещё раз. Решение принимает человек.";
const align = {
  characters: [...text],
  character_start_times_seconds: [...text].map((_, i) => i / 10),
  character_end_times_seconds: [...text].map((_, i) => (i + 1) / 10),
};
assert.equal(Kit.timeOf(align, "Откройте"), 0);
assert.equal(Kit.timeOf(align, "Нажмите", 2), 3.7);
assert.throws(() => Kit.timeOf(align, "нет такой фразы"));
assert.equal(Kit.endOf(align, "человек."), 8);
assert.equal(Kit.speechEnd(align), 8);

const spans = Kit.sentenceSpans(text);
assert.equal(spans.length, 4, "четыре предложения");
const cues = spans.flatMap(([a, b]) => Kit.splitSpan(text, a, b, 62)).map(([a, b]) => text.slice(a, b + 1));
cues.forEach((c) => assert.ok(c.length <= 62, "реплика длиннее 62 знаков: " + c));
const q = "Он спросил «Что?» Потом ответил. Конец";
const qs = Kit.sentenceSpans(q).map(([a, b]) => q.slice(a, b + 1));
assert.equal(JSON.stringify(qs), JSON.stringify(["Он спросил «Что?»", "Потом ответил.", "Конец"]), "закрывающая кавычка входит в предложение");
console.log(cues.map((c) => "• " + c).join("\n"));
console.log("ok:", cues.length, "реплик");

// Exercise the public screen boundary: real camera geometry, without a browser.
const S = { root: { appendChild() {} }, tl: { to() {} } };
const screen = (camera) => Kit.screen(S, {
  natural: { w: 1920, h: 1080 }, w: 1840, h: 634, src: "fixture.png", camera,
});
const protect = [{ x: 85, y: 645, w: 295, h: 25 }, { x: 1150, y: 605, w: 470, h: 90 }];
assert.doesNotThrow(() => screen([{ t: 0, cx: 865, cy: 560, scale: 1.18, protect }]));
for (const rect of [
  { x: 50, y: 500, w: 30, h: 20 }, // left
  { x: 1660, y: 500, w: 30, h: 20 }, // right
  { x: 100, y: 280, w: 30, h: 40 }, // top of the short viewport
  { x: 100, y: 810, w: 30, h: 40 }, // bottom of the short viewport
]) {
  assert.throws(() => screen([{ t: 2, cx: 865, cy: 560, scale: 1.18, protect: [rect] }]), /Kit.screen: camera.*protect/);
}
assert.throws(() => screen([{ t: 2, cx: 835, cy: 560, scale: 1.25, protect }]), /Kit.screen: camera.*protect/);
assert.doesNotThrow(() => screen([{ t: 2, cx: 470, cy: 606, scale: 2,
  protect: [{ x: 85, y: 690, w: 755, h: 70 }, { x: 520, y: 500, w: 325, h: 85 }] }]));
const scr = screen([]);
assert.throws(() => scr.camera(3, { cx: 835, cy: 560, scale: 1.25, protect }), /Kit.screen: camera.*protect/);
console.log("ok: protected camera rectangles, including short viewport and imperative camera");
