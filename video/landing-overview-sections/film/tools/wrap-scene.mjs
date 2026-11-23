#!/usr/bin/env node
// Собирает compositions/scene-NN.html из work/scenes/NN.{css,js}: шаблон и длительность берутся из scenes.json.
//   node tools/wrap-scene.mjs [NN …]   (без аргументов — все, у кого есть work/scenes/NN.js)
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const only = process.argv.slice(2);
const ids = (only.length ? only : readdirSync(`${root}/work/scenes`).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, 2)));
for (const nn of ids) {
  const s = scenes.find((x) => String(x.n).padStart(2, "0") === nn);
  if (!s) throw new Error(`нет сцены ${nn}`);
  const css = existsSync(`${root}/work/scenes/${nn}.css`) ? readFileSync(`${root}/work/scenes/${nn}.css`, "utf8").trim().split("\n").map((l) => "      " + l).join("\n") : "";
  const js = readFileSync(`${root}/work/scenes/${nn}.js`, "utf8").trim().split("\n").map((l) => "        " + l).join("\n");
  writeFileSync(`${root}/compositions/scene-${nn}.html`, `<template id="scene-${nn}-template">
  <div data-composition-id="scene-${nn}" data-width="1920" data-height="1080" data-duration="${s.duration}">${css ? `\n    <style>\n${css}\n    </style>` : ""}
    <script>
      (function () {
        const L = Long.begin("${nn}"), { S, tl, el, show, hide, at, t, DUR } = L;
${js}
        L.fin();
      })();
    </script>
  </div>
</template>
`);
  console.log(`scene-${nn}.html ${s.duration} с`);
}
