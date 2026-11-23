#!/usr/bin/env node
// Самопроверка скетчей: node tools/test-sketch.mjs
// У каждого SVG: viewBox 640x480, нет <text>, ≥6 path с pathLength="1" и class="s", цвета только из kit/tokens.css,
// не больше одного акцентного цвета; kit/sketches.js соответствует SVG.
import { readdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sketchesJs } from "./build-sketches.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = readFileSync(`${root}/kit/tokens.css`, "utf8");
const palette = new Set([...tokens.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase()));
const accents = new Set(["accent", "accent-soft", "ok", "info"].map((k) => tokens.match(new RegExp(`--k-${k}:\\s*(#[0-9a-f]{6})`, "i"))[1].toLowerCase()));
const expected = ["ch-computer", "ch-gitlab", "intro-idea", "merge", "team-done", "thinking-folder", "thinking", "was-apart", "was-bridge", "was-chat", "was-error", "was-guess"];

const files = readdirSync(`${root}/assets/sketches`).filter((f) => f.endsWith(".svg")).sort();
assert.deepEqual(files.map((f) => f.slice(0, -4)), expected, "набор скетчей");
for (const f of files) {
  const svg = readFileSync(`${root}/assets/sketches/${f}`, "utf8");
  const bad = (m) => assert.fail(`${f}: ${m}`);
  if (!svg.includes('viewBox="0 0 640 480"')) bad("viewBox не 0 0 640 480");
  if (/<(text|tspan|style|script|image|foreignObject)\b/i.test(svg)) bad("запрещённый тег (text/style/script/image/foreignObject)");
  const paths = svg.match(/<path\b[^>]*>/g) || [];
  if (paths.length < 6) bad(`path меньше 6 (${paths.length})`);
  paths.forEach((p, i) => { if (!/\bclass="s"/.test(p) || !/\bpathLength="1"/.test(p)) bad(`path #${i + 1} без class="s" pathLength="1"`); });
  const used = new Set();
  for (const [, , , v] of svg.matchAll(/\b(stroke|fill)=("|')([^"']*)\2/g)) {
    if (v === "none") continue;
    if (!palette.has(v.toLowerCase())) bad(`цвет ${v} не из kit/tokens.css`);
    used.add(v.toLowerCase());
  }
  if (!paths.every((p) => /\bstroke="#/.test(p))) bad("у path нет явного stroke");
  const acc = [...used].filter((c) => accents.has(c));
  if (acc.length > 1) bad(`акцентов больше одного: ${acc}`);
  console.log(`ok ${f}: ${paths.length} path, акцент ${acc[0] || "-"}`);
}
assert.equal(readFileSync(`${root}/kit/sketches.js`, "utf8"), sketchesJs(), "kit/sketches.js устарел: node tools/build-sketches.mjs");
console.log("ok: kit/sketches.js актуален");
