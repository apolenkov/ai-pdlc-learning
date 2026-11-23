#!/usr/bin/env node
// Текст диктора для озвучки: реплики «>» из сценария T-long.md (источник правды) → work/vo-input.md.
// Латиница заменяется русской записью (озвучка читает по-русски; в VTT термины возвращает terms.json).
//   node tools/make-vo-input.mjs <T-long.md>
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(process.argv[2], "utf8");
const SUBS = [
  [/AI PDLC/g, "эй-ай пи-ди-эл-си"], [/PDLC/g, "пи-ди-эл-си"], [/ADR/g, "эй-ди-ар"], [/design\.md/g, "дизайн точка эм-ди"],
  [/\bCI\b/g, "си-ай"], [/\bQA\b/g, "кью-эй"], [/DORA/g, "дора"], [/\bИБ\b/g, "и-бэ"], [/AI-сервис/g, "эй-ай сервис"],
  [/Kilo/g, "Кило"], [/OpenSpec/g, "опенспек"], [/Confluence/g, "конфлюенс"], [/Markdown/g, "маркдаун"], [/\bGit\b/g, "гит"], [/SDD/g, "эс-ди-ди"],
];
const blocks = [];
let cur = null;
for (const line of src.split("\n")) {
  const h = /^### (\d+)\. (.+)$/.exec(line);
  if (h) { cur = { n: Number(h[1]), title: h[2], text: [] }; blocks.push(cur); continue; }
  if (/^## /.test(line)) cur = null;
  if (cur && line.startsWith("> ")) cur.text.push(line.slice(2).trim());
}
const cap = (s) => s.replace(/(^|[.!?] )([а-яё])/g, (_, a, c) => a + c.toUpperCase()); // подстановка в начале предложения
const out = blocks.map((b) => `**${b.n}. ${b.title}** ${cap(SUBS.reduce((s, [re, to]) => s.replace(re, to), b.text.join(" ")))}`);
const joined = out.join("\n");
const latin = joined.match(/[A-Za-z]+/g);
if (latin) throw new Error(`латиница осталась в тексте диктора: ${[...new Set(latin)].join(", ")}`);
writeFileSync(`${root}/work/vo-input.md`, `# Озвучка ролика «Команда развития» (подробно, R11-T-long)\n\nГолос Allan, eleven_v4, speed 0,85 (voice.mjs). Источник текста — pack11/T-long.md; латиница записана по-русски.\n\n## Текст диктора\n\n${joined}\n`);
console.log(`work/vo-input.md: ${blocks.length} блоков, ${joined.split(/\s+/).length} слов`);
