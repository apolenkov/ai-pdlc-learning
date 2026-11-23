#!/usr/bin/env node
// Собирает kit/sketches.js (window.SKETCHES = { имя: "<svg…>" }) из assets/sketches/*.svg.
//   node tools/build-sketches.mjs           -> kit/sketches.js
//   node tools/build-sketches.mjs --sheet[=имя.png]   -> ещё и лист-обзор assets/sketches/<имя> (по умолчанию contact-sheet.png; headless Chrome, путь в $CHROME)
import { readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = `${root}/assets/sketches`;
const names = () => readdirSync(dir).filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)).sort();
const minify = (s) => s.replace(/>\s+</g, "><").trim();

export const sketchesJs = () =>
  "/* ГЕНЕРИРУЕТСЯ: node tools/build-sketches.mjs из assets/sketches/*.svg. Руками не править. */\n" +
  "window.SKETCHES = {\n" +
  names().map((n) => `${JSON.stringify(n)}: ${JSON.stringify(minify(readFileSync(`${dir}/${n}.svg`, "utf8")))}`).join(",\n") +
  "\n};\n";

function sheet(file) {
  const tmp = `${dir}/.contact-sheet.html`;
  const order = ["intro-idea", "ch-computer", "ch-gitlab", "merge", "team-done", "thinking"]; // порядок листа 3×2 по сюжету
  const cells = [...order.filter((n) => names().includes(n)), ...names().filter((n) => !order.includes(n))].map((n) => `<div><img src="${n}.svg"></div>`).join("");
  writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#0f1115}body{width:1920px;height:1080px;box-sizing:border-box;padding:48px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;align-content:center}div{background:#171a21;border-radius:16px;overflow:hidden}img{display:block;width:100%;aspect-ratio:4/3}</style>${cells}`);
  const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  try {
    execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1920,1080", `--screenshot=${dir}/${file}`, pathToFileURL(tmp).href], { stdio: "ignore" });
  } finally { rmSync(tmp, { force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(`${root}/kit/sketches.js`, sketchesJs());
  console.log(`kit/sketches.js: ${names().length} скетчей`);
  const arg = process.argv.find((a) => a.startsWith("--sheet"));
  if (arg) { const file = arg.split("=")[1] || "contact-sheet.png"; sheet(file); console.log(`assets/sketches/${file}`); }
}
