#!/usr/bin/env node
// Единый источник общих файлов роликов: video/_shared/{tools,kit} → video/block-*/film/{tools,kit}.
//   node video/_shared/sync.mjs          копирует эталон во все ролики, кроме исключений
//   node video/_shared/sync.mjs --check  только сверяет (ничего не пишет), код возврата 1 при расхождении
// kit.js этим скриптом не копируется: его части лежат в kit/parts/, а копии роликов собирает video/_shared/build-kit.mjs.
// terms.json — словарь «озвучка по-русски → написание на экране» (субтитры); у block-0a, block-r4 (6а/6б и «шага 5» в субтитрах концовки), block-r4new (числа цифрами в субтитрах С4а) , block-map (CustomDev, 9а/9б), block-r4legacy (9б словами в озвучке) и block-r2 («эй-ди-ар» → ADR, сцена 6) свой.
// Исключения — старые варианты, которые нельзя заменить без пересъёмки: block-0a (словарь terms.json), block-0 (test-sketch), block-map (test-build: фикстура с пустым terms.json, свой словарь ломает эталонный вывод).
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const video = resolve(here, "..");
export const EXCEPT = {
  "tools/scene.mjs": ["block-0a"],
  "tools/build-index.mjs": ["block-0a", "block-p4", "block-r2"], // block-p4 и block-r2: авторская голова фильма 0,1 с (TASK-685, TASK-686, vo-tail-plan.json headSeconds)
  "tools/test-kit.mjs": ["block-0a"],
  "tools/test-sketch.mjs": ["block-0a", "block-0"],
  "tools/test-build.mjs": ["block-map"],
  "tools/build-map.mjs": ["block-0", "block-0a"], // P4 sources are held at the delivered revision
  "tools/build-poster.mjs": ["block-0a"],
  "terms.json": ["block-0", "block-0a", "block-r4", "block-r4new", "block-map", "block-r4legacy", "block-i1", "block-i2", "block-i3", "block-i4", "block-dark-factory", "block-r2"], // held P4 sources keep their vocabulary; r2: «эй-ди-ар» → ADR; r4: «шесть-а/шесть-бэ» → 6а/6б, «шага пять» → «шага 5» в концовке
};
export const films = () => readdirSync(video).filter((d) => (d.startsWith("block-") || d === "landing-pdlc") && existsSync(`${video}/${d}/film`)).sort();
// Shared audio production tools run from the repository root, not from per-film copies.
export const CROSS_FILM = /^tools\/(?:sfx-.*\.ts|bed-loop\.ts|mix-v35\.ts|voice-only(?:-plan|-p6)?\.ts|duck\.py)$/;
// Подкаталоги kit/ (сейчас kit/parts/ — исходники kit.js для сборки) не копируются: shared() берёт
// только обычные файлы верхнего уровня, а копии kit.js собирает build-kit.mjs.
export const shared = () => [...["tools", "kit"].flatMap((dir) => readdirSync(`${here}/${dir}`).filter((f) => !f.endsWith(".d.mts") && statSync(`${here}/${dir}/${f}`).isFile()).map((f) => `${dir}/${f}`)), "terms.json"].filter((rel) => !CROSS_FILM.test(rel));

export const drift = () => {
  const out = [];
  for (const rel of shared()) for (const film of films()) {
    if (EXCEPT[rel]?.includes(film)) continue;
    const target = `${video}/${film}/film/${rel}`;
    if (!existsSync(target)) { if (!rel.startsWith("tools/test-")) out.push(`${film}: нет ${rel}`); continue; }
    if (!readFileSync(target).equals(readFileSync(`${here}/${rel}`))) out.push(`${film}: ${rel} отличается от эталона`);
  }
  return out;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const found = drift();
  if (process.argv.includes("--check")) {
    for (const line of found) console.error(line);
    process.exit(found.length ? 1 : 0);
  }
  for (const line of found) {
    const [film, rest] = line.split(": ");
    const rel = rest.replace(/^нет /, "").replace(/ отличается.*$/, "");
    copyFileSync(`${here}/${rel}`, `${video}/${film}/film/${rel}`);
    console.log(`обновлено ${film}/film/${rel}`);
  }
}
