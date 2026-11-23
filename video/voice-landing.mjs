#!/usr/bin/env node
// Пакет озвучки трёх роликов главной (Allan, eleven_v4, 0,85): один запуск на все фильмы.
//   node video/voice-landing.mjs [--only landing-overview,landing-enabling] [--force] [--dry]
// Порядок: preflight прокси → voice → vo-normalize → build-vo → sync-dur → build-index.
// Голос обзора переиспользуется в «было → стало» без повторного синтеза: карта `reuse`
// и сверка текста (совпал текст — копия, не совпал — синтез заново).
// cfg.tempo — ускорение готовой озвучки ffmpeg atempo (у eleven_v4 параметр speed длину речи не меняет). Ключ и прокси берутся у `elevenlabs-key`, не печатаются.
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blockOrder, parseBlocks } from "./_shared/tools/voice.mjs";
import { normalize } from "./_shared/tools/vo-normalize.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FILMS = [
  { name: "landing-overview", blocks: 7, sharedFrom: null },
  // v2 — 6 сцен, 70 с. Блок 4 — голос обзора 3 (общий текст «требования в Git … человек решает»).
  { name: "landing-before-after", blocks: 6, sharedFrom: "landing-overview", reuse: { 4: { film: "landing-overview", block: "3" } } },
  { name: "landing-enabling", blocks: 7, sharedFrom: null },
  // TASK-577: длинные ролики A (14 сцен) и B (13 сцен), сценарии Fable. Сцена появляется в scenes.json — блок озвучивается.
  { name: "landing-team-long", blocks: 13, sharedFrom: null, tempo: 1.2 },
  { name: "landing-hero", blocks: 6, sharedFrom: null, tempo: 1.2, tail: 1.0, finalTail: 2.0 }, // ролик-ориентир главной (586): 45–60 с
  // 586 v3 — обзорный ролик главной (4 фразы, 25–35 с), отдельный файл рядом с принятым v2; v2 не трогаем.
  { name: "landing-hero-v3", blocks: 4, sharedFrom: null, tempo: 1.2, tail: 1.0, finalTail: 2.0 },
  // TASK-577 «Один маршрут»: обзор под H1 главной, 8 сцен, ≈3,5 мин. Скорость голоса не меняем (tempo нет): длину держит текст. lead — 2 с тишины перед речью сцены 1 (светлая заставка).
  { name: "landing-overview-long2", blocks: 8, sharedFrom: null, lead: { 1: 2.0 } },
  // Обзор главной v4 (20.10): 6 сцен по тексту владельца, голос Allan без tempo, lead — светлая заставка.
  { name: "landing-overview-sections", blocks: 6, sharedFrom: null, lead: { 1: 2.0 } },
  // TASK-561 «Что делает команда развития»: ролик страницы команды, 8 сцен, ≈3,5 мин; голос без ускорения, lead — светлая заставка.
  { name: "et-film-long", blocks: 8, sharedFrom: null, lead: { 1: 2.0 } },
  // Обзорный ролик курса «Намерение и план» (intent-overview): 5 фраз, 30–45 с, на приёмку Fable.
  { name: "intent-overview", blocks: 5, sharedFrom: null, tempo: 1.2, tail: 1.0, finalTail: 2.0 },
];
const STEPS = ["voice", "vo-normalize", "build-vo", "sync-dur", "build-captions", "build-titles", "build-index"];
const MODELS_URL = "https://api.elevenlabs.io/v1/models";
const TAIL = 1.5;
const FINAL_TAIL = 2.5;

const filmDir = (name) => resolve(here, name, "film");
const voInput = (name) => resolve(filmDir(name), "work/vo-input.md");
const rawDir = (name) => resolve(filmDir(name), "assets/vo-v3/raw");
const v3Dir = (name) => resolve(filmDir(name), "assets/vo-v3");
const voDir = (name) => resolve(filmDir(name), "assets/vo");
const scenesPath = (name) => resolve(filmDir(name), "scenes.json");

const sharedV3 = (fromName, id) => ({
  mp3: resolve(v3Dir(fromName), `block-${id}.mp3`),
  align: resolve(v3Dir(fromName), `block-${id}.alignment.json`),
});

const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", stdio: "inherit", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status ?? "signal"}${r.stderr ? ` — ${r.stderr.trim().slice(0, 200)}` : ""}`);
  return r;
};

const shOut = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status ?? "signal"}${r.stderr ? ` — ${r.stderr.trim().slice(0, 200)}` : ""}`);
  return r.stdout;
};

const preflight = () => {
  try {
    const proxy = shOut("elevenlabs-key", ["proxy"], { timeout: 15000 }).trim();
    const key = shOut("elevenlabs-key", ["get"], { timeout: 15000 }).trim();
    if (!proxy || !key) throw new Error("пустой ответ elevenlabs-key");
    const cfg = `proxy = "${proxy}"\nheader = "xi-api-key: ${key}"\n`;
    const r = spawnSync("curl", ["-sS", "-K", "-", "-m", "15", "-o", "/dev/null", "-w", "%{http_code}", MODELS_URL], { input: cfg, encoding: "utf8", timeout: 20000 });
    if (r.status !== 0 || r.stdout.trim() !== "200") throw new Error(`curl: ${r.stdout.trim() || "нет ответа"}`);
  } catch {
    console.error("прокси недоступен: отключите VPN на время озвучки");
    process.exit(2);
  }
};

const pairOk = (mp3, align) => {
  try { return existsSync(mp3) && existsSync(align) && readFileSync(mp3).length > 0 && readFileSync(align).length > 0; } catch { return false; }
};

const flat = (t) => t.toLowerCase().replace(/ё/g, "е").replace(/[—–-]/g, " ").replace(/[.,!?;:«»()"]/g, "").replace(/\s+/g, " ").trim();

const alignText = (alignPath) => {
  try { return flat(JSON.parse(readFileSync(alignPath, "utf8")).characters.join("")); } catch { return ""; }
};

// Озвучиваются только блоки, для которых есть сцена в scenes.json: ролик собирают сцена за сценой (пилот), vo-input.md полный.
const readBlocks = (name) => {
  const blocks = parseBlocks(readFileSync(voInput(name), "utf8"));
  const built = new Set(JSON.parse(readFileSync(scenesPath(name), "utf8")).map((s) => String(s.n)));
  return { blocks, ids: blockOrder(Object.keys(blocks)).filter((id) => built.has(id)) };
};

// ускорение речи: mp3 через atempo, времена символов делятся на коэффициент
const retime = (mp3, align, k) => {
  const tmp = `${mp3}.tmp.mp3`;
  sh("ffmpeg", ["-v", "error", "-y", "-i", mp3, "-filter:a", `atempo=${k}`, "-codec:a", "libmp3lame", "-q:a", "2", tmp]);
  renameSync(tmp, mp3);
  for (const key of ["character_start_times_seconds", "character_end_times_seconds"]) align[key] = align[key].map((x) => Math.round((x / k) * 10000) / 10000);
};

// тишина перед речью блока (заставка): mp3 сдвигается на s секунд, времена символов тоже
const lead = (mp3, align, s) => {
  const tmp = `${mp3}.tmp.mp3`;
  sh("ffmpeg", ["-v", "error", "-y", "-i", mp3, "-af", `adelay=${Math.round(s * 1000)}:all=1`, "-codec:a", "libmp3lame", "-q:a", "2", tmp]);
  renameSync(tmp, mp3);
  for (const key of ["character_start_times_seconds", "character_end_times_seconds"]) align[key] = align[key].map((x) => Math.round((x + s) * 10000) / 10000);
};

const ensureV3 = (name, cfg, force) => {
  const { blocks, ids } = readBlocks(name);
  mkdirSync(v3Dir(name), { recursive: true });
  const missing = ids.filter((id) => force || !pairOk(resolve(v3Dir(name), `block-${id}.mp3`), resolve(v3Dir(name), `block-${id}.alignment.json`)));
  if (!missing.length) return { blocks, ids, generated: [] };

  // Переиспользуем уже нормализованные блоки из другого фильма — только если текст совпал.
  const copied = [];
  const rejected = [];
  for (const id of [...missing]) {
    const map = cfg.reuse?.[id] ?? (cfg.sharedFrom && Number(id) <= 3 ? { film: cfg.sharedFrom, block: id } : null);
    if (!map) continue;
    const src = sharedV3(map.film, map.block);
    if (!pairOk(src.mp3, src.align)) continue;
    if (alignText(src.align) !== flat(blocks[id])) {
      rejected.push(`${id}←${map.film}:${map.block}`);
      continue;
    }
    copyFileSync(src.mp3, resolve(v3Dir(name), `block-${id}.mp3`));
    copyFileSync(src.align, resolve(v3Dir(name), `block-${id}.alignment.json`));
    copied.push(id);
  }
  if (rejected.length) console.log(`  ${name}: чужой голос не подошёл по тексту (${rejected.join(", ")}) — синтезируем заново`);
  const toVoice = missing.filter((id) => !copied.includes(id));

  if (toVoice.length) {
    mkdirSync(rawDir(name), { recursive: true });
    const synth = toVoice.filter((id) => force || !pairOk(resolve(rawDir(name), `block-${id}.mp3`), resolve(rawDir(name), `block-${id}.alignment.json`)));
    if (synth.length) sh("node", [resolve(here, "_shared/tools/voice.mjs"), rawDir(name), synth.join(",")], { cwd: filmDir(name), env: { ...process.env, STORYBOARD: voInput(name) } });
    for (const id of toVoice) {
      const outMp3 = resolve(v3Dir(name), `block-${id}.mp3`);
      const outAlign = resolve(v3Dir(name), `block-${id}.alignment.json`);
      const r = normalize(resolve(rawDir(name), `block-${id}.mp3`), JSON.parse(readFileSync(resolve(rawDir(name), `block-${id}.alignment.json`), "utf8")), outMp3);
      if (cfg.tempo) retime(outMp3, r.align, cfg.tempo);
      if (cfg.lead?.[id]) lead(outMp3, r.align, cfg.lead[id]);
      writeFileSync(outAlign, JSON.stringify(r.align));
      const cut = r.ops.reduce((n, o) => n + (o.end - o.start) - o.len, 0);
      console.log(`  ${name} block-${id}: нормализация ${(-cut).toFixed(2)} с`);
    }
  }
  return { blocks, ids, generated: missing };
};

const ffprobeDuration = (mp3) => {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], { encoding: "utf8" }).trim();
  return Number(out);
};

const buildVo = (name, cfg = {}) => {
  const { ids } = readBlocks(name);
  const scenes = JSON.parse(readFileSync(scenesPath(name), "utf8"));
  const lastId = String(Math.max(...scenes.map((s) => Number(s.n))));
  mkdirSync(voDir(name), { recursive: true });
  for (const id of ids) {
    const nn = String(id).padStart(2, "0");
    const mp3 = resolve(v3Dir(name), `block-${id}.mp3`);
    const align = resolve(v3Dir(name), `block-${id}.alignment.json`);
    if (!pairOk(mp3, align)) throw new Error(`${name}: нет озвучки для блока ${id}`);
    const alignData = JSON.parse(readFileSync(align, "utf8"));
    copyFileSync(mp3, resolve(voDir(name), `scene-${nn}.mp3`));
    copyFileSync(align, resolve(voDir(name), `scene-${nn}.alignment.json`));
    execFileSync("node", [resolve(here, "_shared/tools/json2js.mjs"), "align", resolve(voDir(name), `scene-${nn}.alignment.json`), nn]);
    const audioDuration = ffprobeDuration(resolve(voDir(name), `scene-${nn}.mp3`));
    const speechEnd = alignData.character_end_times_seconds.at(-1);
    const tail = id === lastId ? (cfg.finalTail ?? FINAL_TAIL) : (cfg.tail ?? TAIL);
    const duration = Math.ceil((Math.max(audioDuration, speechEnd) + tail) * 10) / 10;
    const scene = scenes.find((s) => String(s.n) === String(id));
    if (!scene) throw new Error(`${name}: сцена ${id} не найдена в scenes.json`);
    scene.audio = `assets/vo/scene-${nn}.mp3`;
    scene.audioDuration = Number(audioDuration.toFixed(2));
    scene.duration = duration;
  }
  writeFileSync(scenesPath(name), JSON.stringify(scenes, null, 2) + "\n");
  const total = scenes.reduce((a, s) => a + s.duration, 0);
  console.log(`  ${name} build-vo: ${ids.length} сцен, ${total.toFixed(1)} с`);
};

const syncDur = (name) => {
  const scenes = JSON.parse(readFileSync(scenesPath(name), "utf8"));
  for (const s of scenes) {
    const nn = String(s.n).padStart(2, "0");
    const file = resolve(filmDir(name), `compositions/scene-${nn}.html`);
    let src = readFileSync(file, "utf8");
    const next = src
      .replace(new RegExp(`(<div data-composition-id="scene-${nn}"[^>]*data-duration=")[^"]+(")`), `$1${s.duration}$2`)
      .replace(new RegExp(`(const S = Kit\\.scene\\("${nn}"\\), DUR = )[\\d.]+`), `$1${s.duration}`);
    if (next !== src) { writeFileSync(file, next); console.log(`  ${name} scene-${nn}: ${s.duration} с`); }
  }
};

const runStep = (name, step) => {
  const dir = filmDir(name);
  const tool = resolve(dir, `tools/${step}.mjs`);
  if (!existsSync(tool)) { console.log(`  ${name} ${step}: пропуск (нет инструмента)`); return; }
  const args = step === "build-index" ? [tool, "."] : [tool];
  sh("node", args, { cwd: dir });
};

const runFilm = (name, cfg, force) => {
  console.log(`\n${name}`);
  const { blocks, ids, generated } = ensureV3(name, cfg, force);
  if (generated.length) console.log(`  синтезировано/скопировано блоков: ${generated.join(",")}`);
  buildVo(name, cfg);
  syncDur(name);
  for (const step of ["build-captions", "build-titles", "build-index"]) runStep(name, step);
  const scenes = JSON.parse(readFileSync(scenesPath(name), "utf8"));
  const speech = scenes.reduce((a, s) => a + (s.audioDuration ?? 0), 0);
  const chars = ids.reduce((a, id) => a + blocks[id].length, 0);
  return { name, blocks: ids.length, chars, speech };
};

const dry = (only) => {
  console.log("voice-landing --dry: план озвучки (без сети)");
  let totalBlocks = 0;
  const seen = new Set();
  const rows = [];
  for (const cfg of FILMS.filter((f) => only.includes(f.name))) {
    const { blocks, ids } = readBlocks(cfg.name);
    const chars = ids.reduce((a, id) => a + blocks[id].length, 0);
    ids.forEach((id) => seen.add(blocks[id]));
    rows.push({ name: cfg.name, blocks: ids.length, chars, ids: ids.join(",") });
    totalBlocks += ids.length;
  }
  for (const r of rows) console.log(`${r.name}: блоков ${r.blocks} (${r.ids}), знаков ${r.chars}`);
  const uniqueChars = [...seen].reduce((a, t) => a + t.length, 0);
  console.log(`шаги: ${STEPS.join(" → ")}`);
  console.log(`итого: блоков ${totalBlocks}, знаков ${uniqueChars} (уникальных)`);
  if (uniqueChars > 3500) {
    console.error(`STOP: ${uniqueChars} знаков уникальных — больше 3500, нужно согласование`);
    process.exit(0);
  }
};

const usage = () => console.log("Использование: node video/voice-landing.mjs [--only landing-overview,landing-before-after,landing-enabling] [--force] [--dry]");

if (process.argv[2] === "--selftest") {
  const { blocks, ids } = readBlocks("landing-overview");
  if (!ids.includes("1") || !blocks["2"].includes("человек")) throw new Error("selftest: парсинг не совпадает");
  const unique = new Set(Object.values(blocks));
  if (unique.size !== ids.length) throw new Error("selftest: unique mismatch");
  console.log("voice-landing: ok");
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) { usage(); process.exit(0); }
const onlyArg = args.find((a) => a.startsWith("--only"));
const only = onlyArg ? onlyArg.split("=")[1]?.split(",") ?? [] : FILMS.filter((f) => existsSync(scenesPath(f.name))).map((f) => f.name);
const bad = only.filter((f) => !FILMS.some((x) => x.name === f));
if (bad.length || !only.length) { console.error(`неизвестный ролик: ${bad.join(",") || "—"} (есть ${FILMS.map((f) => f.name).join(",")})`); process.exit(1); }
const force = args.includes("--force");

if (args.includes("--dry")) {
  dry(only);
} else {
  preflight();
  const results = [];
  for (const cfg of FILMS.filter((f) => only.includes(f.name))) {
    try {
      results.push(runFilm(cfg.name, cfg, force));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  }
  console.log("\nролик | блоков | знаков | речь, с");
  for (const r of results) {
    console.log(`${r.name} | ${r.blocks} | ${r.chars} | ${r.speech ? r.speech.toFixed(1) : "—"}`);
  }
}
