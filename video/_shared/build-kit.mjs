#!/usr/bin/env node
// Сборка kit.js из общих частей: video/_shared/kit/parts/*.js → video/<ролик>/film/kit/kit.js.
//   node video/_shared/build-kit.mjs           записывает порождаемые копии
//   node video/_shared/build-kit.mjs --check   только сверяет (код 1 при расхождении)
// Какие ролики порождаются, задают списки полос в video/_shared/kit/targets/lane-*.txt
// (по четыре-пять роликов на полосу). Вариант ролика (B/C/D/E/F/G) задаёт JSON рядом со списком:
// video/_shared/kit/targets/<ролик>.json { "variant": "B" }; без JSON вариант A = эталон.
// Варианты — построчные патчи поверх эталона в video/_shared/kit/variants/<вариант>.json, чтобы
// каждая опубликованная копия воспроизводилась побайтно. Политика и полосы — video/_shared/KIT.md
// и video/_shared/kit/targets/PLAN.md; инвентарь 30 копий — video/_shared/kit/targets/INVENTORY.md.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// Каталоги сборки и проверки; тесты подменяют их фикстурой во временном каталоге.
export const ROOT = {
  video: resolve(here, ".."),
  parts: resolve(here, "kit/parts"),
  variants: resolve(here, "kit/variants"),
  targets: resolve(here, "kit/targets"),
};
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
// Порядок частей фиксирован: это фрагменты одного замыкания kit.js, сборка — их конкатенация.
export const PARTS = ["01-core.js", "02-text.js", "03-editor.js", "04-screen.js", "05-stage.js"];
// Тело без баннера — эталонная копия kit.js, вариант A (самая частая и новейшая на 19.10: 13 из 30).
// Константу не меняем: правки вида роликов возвращаются вариантами (kit/variants), а не правкой частей.
export const REFERENCE_SHA256 = "e82edd4ba7b44f05aa3070a2047e2221ba4e980f4cb9387664b0cee98d24d181";
export const BANNER =
  "/* СГЕНЕРИРОВАНО из video/_shared/kit/parts/*.js (node video/_shared/build-kit.mjs). Руками не править. */\n";
// Порождаемый файл сам объявляет себя сгенерированным: так его видит GitLab, а полосы не делят общий .gitattributes.
export const GENERATED_ATTR = "kit.js linguist-generated=true\n";
// Строки списков полос: файл списка → ролик. Комментарии и пустые строки пропускаются.
const listEntries = (root = ROOT) =>
  readdirSync(root.targets)
    .filter((file) => file.endsWith(".txt"))
    .sort()
    .flatMap((file) =>
      readFileSync(resolve(root.targets, file), "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((film) => ({ file, film })),
    );
export const laneFiles = (root = ROOT) => readdirSync(root.targets).filter((file) => file.endsWith(".txt")).sort();
export const targets = (root = ROOT) => [...new Set(listEntries(root).map((entry) => entry.film))].sort();
export const configPath = (film, root = ROOT) => resolve(root.targets, `${film}.json`);
const filmConfig = (film, root = ROOT) =>
  existsSync(configPath(film, root)) ? JSON.parse(readFileSync(configPath(film, root), "utf8")) : {};
// Конфиг ролика: { "variant": "B", "bodySha256": "…" } — sha опубликованной копии (без баннера).
// Без JSON ролик порождается эталоном (вариант A), его sha — REFERENCE_SHA256.
export const variantOf = (film, root = ROOT) => filmConfig(film, root).variant ?? "A";
const loadVariant = (name, root = ROOT) => {
  const file = resolve(root.variants, `${name}.json`);
  if (!existsSync(file)) throw new Error(`нет варианта ${name} (${file})`);
  return JSON.parse(readFileSync(file, "utf8"));
};
export const variantNames = (root = ROOT) =>
  readdirSync(root.variants)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length))
    .sort();
export const body = (root = ROOT) => PARTS.map((part) => readFileSync(resolve(root.parts, part), "utf8")).join("");
export const bodySha256 = (root = ROOT) => sha256(body(root));
// Хунки варианта — построчная замена в теле эталона: { start (1-based), remove: [...], add: [...] }.
export const applyHunks = (text, hunks) => {
  const lines = text.split("\n");
  let offset = 0;
  hunks.forEach((hunk, i) => {
    const at = hunk.start - 1 + offset;
    const got = lines.slice(at, at + hunk.remove.length);
    if (got.length !== hunk.remove.length || got.some((line, j) => line !== hunk.remove[j]))
      throw new Error(`хунк ${i + 1} (строка ${hunk.start}) не совпал с эталоном`);
    lines.splice(at, hunk.remove.length, ...hunk.add);
    offset += hunk.add.length - hunk.remove.length;
  });
  return lines.join("\n");
};
export const bodyFor = (variant, root = ROOT) =>
  variant === "A" ? body(root) : applyHunks(body(root), loadVariant(variant, root).hunks);
export const variantBodySha = (variant, root = ROOT) =>
  variant === "A" ? REFERENCE_SHA256 : loadVariant(variant, root).bodySha256;
export const expectedBodySha = (film, root = ROOT) =>
  filmConfig(film, root).bodySha256 ?? variantBodySha(variantOf(film, root), root);
export const generatedBody = (film, root = ROOT) => bodyFor(variantOf(film, root), root);
export const generated = (film, root = ROOT) => BANNER + generatedBody(film, root);
export const targetDir = (film, root = ROOT) => resolve(root.video, film, "film/kit");
const attrDrift = (dir) =>
  !existsSync(resolve(dir, ".gitattributes")) || readFileSync(resolve(dir, ".gitattributes"), "utf8") !== GENERATED_ATTR;
// Список полос — единственное место, где у ролика появляется порождаемая копия: дубль значит двух
// хозяев и молчаливый выбор порядка, поэтому дубль — расхождение, а не повод дедуплицировать.
const listProblems = (root = ROOT) => {
  const out = [];
  const first = new Map();
  for (const { file, film } of listEntries(root)) {
    const seen = first.get(film);
    if (seen) out.push(`targets/${file}: ролик ${film} указан дважды (первый раз — targets/${seen})`);
    else first.set(film, file);
  }
  return out;
};
// Конфиг без строки в списках — сирота: ролик не порождается, а тело его варианта никто не сверяет.
const orphanConfigs = (root = ROOT) => {
  const listed = new Set(targets(root));
  return readdirSync(root.targets)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length))
    .filter((film) => !listed.has(film))
    .sort()
    .map((film) => `targets/${film}.json: ролик ${film} не указан ни в одном списке полос`);
};
// Проверка не доверяет одним спискам: копия с баннером вне списков — забытый порождаемый ролик.
const strayCopies = (root = ROOT) => {
  const listed = new Set(targets(root));
  return readdirSync(root.video)
    .filter((film) => !listed.has(film))
    .filter((film) => {
      const file = resolve(root.video, film, "film/kit/kit.js");
      return existsSync(file) && readFileSync(file, "utf8").includes(BANNER);
    })
    .sort()
    .map((film) => `${film}: film/kit/kit.js помечен сгенерированным, но ролика нет ни в одном списке полос`);
};
// fatal: правка частей, сломанный вариант или конфиг — писать копии нельзя, пока причину не разберут.
// Варианты проверяются все и всегда (A и каждый kit/variants/<X>.json), даже если роликов этого
// варианта ещё нет в списках полос: битый вариант должен ронять --check сразу, а не после перевода.
export const kitFatal = (root = ROOT) => {
  const out = [];
  for (const variant of ["A", ...variantNames(root)]) {
    const where = variant === "A" ? "video/_shared/kit/parts" : `video/_shared/kit/variants/${variant}.json`;
    try {
      const want = variantBodySha(variant, root);
      if (typeof want !== "string") {
        out.push(`${where}: нет bodySha256`);
        continue;
      }
      const got = sha256(bodyFor(variant, root));
      if (got !== want)
        out.push(variant === "A" ? `${where}: тело сборки не совпадает с эталоном (${got})` : `${where}: тело варианта не совпадает с bodySha256 (${got})`);
    } catch (error) {
      out.push(`${where}: вариант не применяется (${error.message})`);
    }
  }
  for (const film of targets(root)) {
    try {
      const variant = variantOf(film, root);
      const config = filmConfig(film, root);
      if (existsSync(configPath(film, root))) {
        // Конфиг ролика обязан закреплять sha опубликованной копии: без него тест не отличит дрейф.
        if (typeof config.bodySha256 !== "string") out.push(`${film}: в конфиге targets/${film}.json нет bodySha256`);
        else if (config.bodySha256 !== variantBodySha(variant, root)) out.push(`${film}: sha ролика в конфиге не совпадает с sha варианта ${variant}`);
      }
      const got = sha256(generatedBody(film, root));
      if (got !== expectedBodySha(film, root)) out.push(`${film}: тело варианта ${variant} не совпадает с sha ролика (${got})`);
    } catch (error) {
      out.push(`${film}: вариант ${variantOf(film, root)} не применяется (${error.message})`);
    }
  }
  return out;
};
export const kitDrift = (root = ROOT) => {
  const out = [...listProblems(root), ...orphanConfigs(root), ...strayCopies(root), ...kitFatal(root)];
  for (const film of targets(root)) {
    if (out.some((line) => line.startsWith(`${film}:`))) continue;
    const dir = targetDir(film, root);
    if (!existsSync(resolve(dir, "kit.js"))) {
      out.push(`${film}: нет film/kit/kit.js`);
      continue;
    }
    if (readFileSync(resolve(dir, "kit.js"), "utf8") !== generated(film, root)) out.push(`${film}: film/kit/kit.js отличается от сборки частей`);
    if (attrDrift(dir)) out.push(`${film}: нет метки сгенерированного film/kit/.gitattributes`);
  }
  return out;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fatal = kitFatal();
  if (fatal.length) {
    for (const line of fatal) console.error(line);
    console.error("сборка остановлена: сверьте части и варианты (video/_shared/KIT.md).");
    process.exit(1);
  }
  const found = kitDrift();
  if (process.argv.includes("--check")) {
    for (const line of found) console.error(line);
    console.log(found.length ? "порождаемые kit.js расходятся с частями" : `порождаемые kit.js совпадают с частями (${targets().length})`);
    process.exit(found.length ? 1 : 0);
  }
  for (const film of targets()) {
    const dir = targetDir(film);
    const content = generated(film);
    if (!existsSync(resolve(dir, "kit.js")) || readFileSync(resolve(dir, "kit.js"), "utf8") !== content) {
      writeFileSync(resolve(dir, "kit.js"), content);
      console.log(`обновлено ${film}/film/kit/kit.js`);
    }
    if (attrDrift(dir)) {
      writeFileSync(resolve(dir, ".gitattributes"), GENERATED_ATTR);
      console.log(`обновлено ${film}/film/kit/.gitattributes`);
    }
  }
  const left = kitDrift();
  if (left.length) {
    for (const line of left) console.error(line);
    console.error("после записи копии всё ещё расходятся с частями.");
    process.exit(1);
  }
  console.log(`порождаемые kit.js совпадают с частями (${targets().length})`);
}
