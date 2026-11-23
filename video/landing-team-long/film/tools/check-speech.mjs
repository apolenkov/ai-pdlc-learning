#!/usr/bin/env node
// Сверка речи готового ролика с текстом озвучки (whisper large-v3-turbo, ru): LCS по словам, расхождения списком.
//   node tools/check-speech.mjs <ролик.mp4> [выход-каталог]
// Эталон — work/vo-input.md (то, что уходило в озвучку). Пишет <каталог>/whisper.txt и diff.txt; печатает итог и слова гейта v3.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = resolve(process.argv[2]);
const out = resolve(process.argv[3] ?? `${root}/renders/check`);
mkdirSync(out, { recursive: true });
// Распознавание по сценам (границы — scenes.json): whisper на целом ролике пропускает длинные куски, по сценам — нет.
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
let t0 = 0; const asrScenes = [];
for (const sc of scenes) {
  const nn = String(sc.n).padStart(2, "0"), wav = `${out}/scene-${nn}.wav`;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", t0.toFixed(3), "-t", sc.duration.toFixed(3), "-i", file, "-vn", "-ar", "16000", "-ac", "1", wav]);
  asrScenes.push(spawnSync("whisper-cli", ["-m", `${homedir()}/.cache/whisper/ggml-large-v3-turbo.bin`, "-l", "ru", "-f", wav, "-nt", "-np", "-bs", "5", "-mc", "0"], { encoding: "utf8", maxBuffer: 1 << 28 }).stdout);
  t0 += sc.duration;
}
const asr = asrScenes.map((x, i) => `[${i + 1}] ${x.trim()}`).join("\n");
writeFileSync(`${out}/whisper.txt`, asr);
// Латиница и цифры в распознанном приводятся к русской записи эталона (озвучка записана по-русски, whisper пишет как на страницах).
const BACK = [[/\bai pdlc\b/g, "эй ай пи ди эл си"], [/\bpdlc\b/g, "пи ди эл си"], [/\badr\b/g, "эй ди ар"], [/\bdesign md\b/g, "дизайн точка эм ди"], [/\bsdd\b/g, "эс ди ди"], [/\bqa\b/g, "кью эй"], [/\bci\b/g, "си ай"], [/\bai\b/g, "эй ай"], [/\bgit\b/g, "гит"], [/\bopenspec\b/g, "опенспек"], [/\bmarkdown\b/g, "маркдаун"], [/\bconfluence\b/g, "конфлюенс"], [/\bkilo\b/g, "кило"], [/\bdora\b/g, "дора"], [/кьюэй/g, "кью эй"], [/мета ?репозитори/g, "мета репозитори"]];
const NUM = { 1: "один", 2: "два", 3: "три", 4: "четыре", 5: "пять", 6: "шесть", 7: "семь", 8: "восемь", 9: "девять" };
const base = (s) => s.toLowerCase().replaceAll("ё", "е").replace(/[-‑–—]/g, " ").replace(/[^a-zа-я0-9 \n.,!?;:]/g, " ");
const fix = (s, isGot) => { let x = base(s); if (isGot) x = x.replace(/\b[1-9]\b/g, (d) => NUM[d]); for (const [re, to] of BACK) x = x.replace(re, to); return x.match(/[a-zа-я0-9]+/g) ?? []; };
const body = readFileSync(`${root}/work/vo-input.md`, "utf8");
const ref = fix(body.slice(body.search(/\*\*1\./)).replace(/\*\*\d+\.[^*]*\*\*/g, " "), false);
const got = fix(asr.replace(/^\[\d+\]/gm, " "), true);
const n = ref.length, m = got.length;
const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = ref[i] === got[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
let i = 0, j = 0; const lines = []; let miss = [], extra = [], at = 0;
const flush = () => { if (miss.length || extra.length) lines.push(`ref#${at}: ожидали «${miss.join(" ")}» → услышали «${extra.join(" ")}»`); miss = []; extra = []; };
while (i < n || j < m) {
  if (i < n && j < m && ref[i] === got[j]) { flush(); i++; j++; at = i; }
  else if (j >= m || (i < n && dp[i + 1][j] >= dp[i][j + 1])) { if (!miss.length && !extra.length) at = i; miss.push(ref[i++]); }
  else { if (!miss.length && !extra.length) at = i; extra.push(got[j++]); }
}
flush();
writeFileSync(`${out}/diff.txt`, lines.join("\n") + "\n");
console.log(`whisper: слов в тексте ${n}, распознано ${m}, совпало ${dp[0][0]} (${((100 * dp[0][0]) / n).toFixed(1)} %), расхождений ${lines.length}`);
const gate = asr.match(/[Оо]тм[еёЕ]т\S*|[Оо]тм[еЕ]ч\S*|[Мм]ен[еёЕ]джер\S*(?:\s+\S+)?/g) ?? [];
console.log(`слова гейта в распознанном: ${gate.length ? gate.join("; ") : "нет"}`);
