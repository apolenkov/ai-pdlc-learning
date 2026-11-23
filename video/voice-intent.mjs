#!/usr/bin/env node
// Пакет озвучки курса «Намерение и план» (шаги 1–4, block-i1…i4): одна команда на все ролики.
// Что делает: предполётная проверка прокси ElevenLabs, затем на каждый ролик подряд —
// генерация work/vo-input.md из storyboard.md, tools/voice.mjs (озвучка блоками),
// tools/vo-normalize.mjs, tools/build-vo.mjs, tools/sync-dur.mjs, tools/build-captions.mjs,
// tools/build-titles.mjs, tools/build-index.mjs. Остановка при первой ошибке.
// Как запускать: node video/voice-intent.mjs [--only i2,i3] [--force] [--dry]
// Что нужно: выключенный VPN (прокси владельца режет порт 9165), команда elevenlabs-key
// (ключ и прокси берутся у неё и в логи, аргументы и вывод не печатаются).
// Как оценить расход: node video/voice-intent.mjs --dry — печатает число знаков по роликам
// и итог без сети; умножьте итог на тариф модели eleven_v4 в кабинете ElevenLabs.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blockOrder, parseBlocks } from "./block-i1/film/tools/voice.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FILMS = ["i1", "i2", "i3", "i4"];
const MODELS_URL = "https://api.elevenlabs.io/v1/models";
const STEPS = ["vo-input", "voice", "vo-normalize", "build-vo", "sync-dur", "build-captions", "build-titles", "build-index"];

/** Блоки речи из раскадровки: [{ id, title, text }]; речь — абзацы после шапки до «На экране:». */
export const extractSpeech = (md) => {
  const lines = md.split("\n"), out = [];
  let cur = null;
  const flush = () => { if (cur) { cur.text = cur.parts.join(" "); delete cur.parts; out.push(cur); cur = null; } };
  for (const line of lines) {
    const h = /^\*\*(\d+[бм]?)\. ([^*]+)\*\*.*$/.exec(line);
    if (h) { flush(); cur = { id: h[1].replace("б", "b").replace("м", "m"), title: h[2], parts: [] }; continue; }
    if (/^## /.test(line)) { flush(); continue; }
    if (!cur) continue;
    if (/^На экране:/.test(line)) { cur.closed = true; continue; }
    if (cur.closed) continue;
    if (line.trim()) cur.parts.push(line.trim());
  }
  flush();
  return out.map(({ closed, ...b }) => b);
};

export const voInputText = (step, blocks) =>
  `# Вход озвучки шага ${step} (сгенерировано из storyboard.md, не править руками)\n\n` +
  blocks.map((b) => `**${b.id}. ${b.title}** ${b.text}`).join("\n\n") + "\n";

const filmDir = (film) => resolve(here, `block-${film}/film`);
const logFile = (film) => resolve(filmDir(film), "work/voice-run.log");
const log = (film, msg) => {
  mkdirSync(resolve(filmDir(film), "work"), { recursive: true });
  appendFileSync(logFile(film), `${new Date().toISOString()} ${msg}\n`);
};

const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status ?? "signal"}${r.stderr ? ` — ${r.stderr.trim().slice(0, 200)}` : ""}`);
  return r;
};

/** Предполёт: прокси отвечает на GET моделей за 15 с. Иначе — сообщение и exit 2 до любых трат. */
export const preflight = () => {
  try {
    const proxy = spawnSync("elevenlabs-key", ["proxy"], { encoding: "utf8", timeout: 15000 }).stdout?.trim();
    const key = spawnSync("elevenlabs-key", ["get"], { encoding: "utf8", timeout: 15000 }).stdout?.trim();
    if (!proxy || !key) throw new Error("пустой ответ elevenlabs-key");
    const cfg = `proxy = "${proxy}"\nheader = "xi-api-key: ${key}"\n`;
    const r = spawnSync("curl", ["-sS", "-K", "-", "-m", "15", "-o", "/dev/null", "-w", "%{http_code}", MODELS_URL], { input: cfg, encoding: "utf8", timeout: 20000 });
    if (r.status !== 0 || r.stdout.trim() !== "200") throw new Error(`curl: ${r.stdout.trim() || "нет ответа"}`);
  } catch {
    console.error("прокси недоступен: отключите VPN на время озвучки");
    process.exit(2);
  }
};

const pairOk = (mp3, alignment) => {
  try { return existsSync(mp3) && existsSync(alignment) && readFileSync(mp3).length > 0 && readFileSync(alignment).length > 0; } catch { return false; }
};

const runFilm = (film, force) => {
  const dir = filmDir(film), step = film.slice(1);
  const blocks = extractSpeech(readFileSync(resolve(here, `block-${film}/storyboard.md`), "utf8"));
  const voInput = resolve(dir, "work/vo-input.md");
  mkdirSync(resolve(dir, "work"), { recursive: true });
  writeFileSync(voInput, voInputText(step, blocks));
  const raw = resolve(dir, "assets/vo-v3/raw"), v3 = resolve(dir, "assets/vo-v3");
  mkdirSync(raw, { recursive: true });
  const missing = blocks.filter((b) => force || !pairOk(resolve(raw, `block-${b.id}.mp3`), resolve(raw, `block-${b.id}.alignment.json`)));
  const stepRun = (name, cmd, args, env) => {
    try {
      sh(cmd, args, { cwd: dir, stdio: "inherit", env: { ...process.env, ...env } });
      log(film, `${name}: ok`);
    } catch (e) {
      log(film, `${name}: ОШИБКА ${e.message}`);
      throw new Error(`${film}: шаг ${name} не выполнен: ${e.message}`);
    }
  };
  if (missing.length) {
    stepRun("voice", "node", [`${dir}/tools/voice.mjs`, raw, missing.map((b) => b.id).join(",")], { STORYBOARD: voInput });
  } else log(film, "voice: пропуск (блоки готовы)");
  for (const b of blocks) {
    const out = [resolve(v3, `block-${b.id}.mp3`), resolve(v3, `block-${b.id}.alignment.json`)];
    if (!force && missing.every((m) => m.id !== b.id) && pairOk(...out)) { log(film, `vo-normalize ${b.id}: пропуск`); continue; }
    stepRun(`vo-normalize ${b.id}`, "node", [`${dir}/tools/vo-normalize.mjs`, resolve(raw, `block-${b.id}.mp3`), resolve(raw, `block-${b.id}.alignment.json`), ...out]);
  }
  for (const name of ["build-vo", "sync-dur", "build-captions", "build-titles", "build-index"]) stepRun(name, "node", [`${dir}/tools/${name}.mjs`]);
  const scenes = JSON.parse(readFileSync(resolve(dir, "scenes.json"), "utf8")).filter((s) => s.kind !== "title");
  const speech = scenes.reduce((a, s) => a + (s.audioDuration ?? 0), 0);
  const chars = blocks.reduce((a, b) => a + b.text.length, 0);
  return { film, blocks: blocks.length, chars, speech };
};

const usage = () => console.log("Использование: node video/voice-intent.mjs [--only i2,i3] [--force] [--dry]");

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) { usage(); process.exit(0); }
  const onlyArg = args.find((a) => a.startsWith("--only"));
  const only = onlyArg ? onlyArg.split("=")[1]?.split(",") ?? [] : [...FILMS];
  const bad = only.filter((f) => !FILMS.includes(f));
  if (bad.length || !only.length) { console.error(`неизвестный ролик: ${bad.join(",") || "—"} (есть ${FILMS.join(",")})`); process.exit(1); }
  const force = args.includes("--force"), dry = args.includes("--dry");
  if (dry) {
    console.log("voice-intent --dry: план озвучки (без сети)");
    let tb = 0, tc = 0;
    for (const film of only) {
      const blocks = extractSpeech(readFileSync(resolve(here, `block-${film}/storyboard.md`), "utf8"));
      const chars = blocks.reduce((a, b) => a + b.text.length, 0);
      // Сверка с parseBlocks voice.mjs: vo-input однострочный, блоки те же.
      const ids = blockOrder(Object.keys(parseBlocks(voInputText(film.slice(1), blocks))));
      console.log(`${film}: блоков ${blocks.length} (${ids.join(",")}), знаков ${chars}`);
      tb += blocks.length; tc += chars;
    }
    console.log(`шаги: ${STEPS.join(" → ")}`);
    console.log(`итого: блоков ${tb}, знаков ${tc}`);
  } else {
    preflight();
    const results = [];
    for (const film of only) {
      log(film, `старт${force ? " (--force)" : ""}`);
      try {
        results.push(runFilm(film, force));
      } catch (e) { console.error(e.message); process.exit(1); }
    }
    console.log("ролик | блоков | знаков | речь, с");
    for (const r of results) {
      const line = `${r.film} | ${r.blocks} | ${r.chars} | ${r.speech ? r.speech.toFixed(1) : "—"}`;
      console.log(line);
      log(r.film, `итог: ${line}`);
    }
    console.log(`итого знаков: ${results.reduce((a, r) => a + r.chars, 0)}`);
  }
}
