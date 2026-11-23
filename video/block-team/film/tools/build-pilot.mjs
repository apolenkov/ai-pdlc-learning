#!/usr/bin/env node
// TASK-685: reproducible pilot entry point including BOTH scene 05 and overlay t5.
// node tools/build-pilot.mjs [--out-dir <absolute-or-relative-dir>]
// The canonical root helper --only 5 intentionally excludes titles; never use it for this pilot.
import assert from "node:assert/strict";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === "--out-dir"), "Usage: build-pilot.mjs [--out-dir DIR]");
const out = resolve(root, args[1] || "work/team-pilot");
// Authored 3-frame visual preroll, declared BEFORE rendering; never infer delta from correlation.
// The legacy frozen position validator requires speech lag strictly inside (0,N-L).
const HEAD = 0.1;
assert(out !== root && !root.startsWith(`${out}/`), "Pilot must not overwrite film root or its ancestors");
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const scene = scenes.find((s) => s.n === 5);
const title = scenes.find((s) => s.id === "t5");
assert(scene?.audio && Number.isFinite(scene.duration), "Missing scene 5");
assert(title?.overlay === true && title.duration === 2 && title.of === 5, "Missing two-second overlay t5");
mkdirSync(out, { recursive: true });
for (const dir of ["assets", "kit"]) cpSync(`${root}/${dir}`, `${out}/${dir}`, { recursive: true });
mkdirSync(`${out}/compositions`, { recursive: true });
for (const file of ["scene-05.html", "scene-t5.html", "scene-t5.meta.json"]) cpSync(`${root}/compositions/${file}`, `${out}/compositions/${file}`);
for (const file of ["hyperframes.json", "meta.json", "package.json", "terms.json"]) cpSync(`${root}/${file}`, `${out}/${file}`);
const terms = readFileSync(`${root}/terms.json`, "utf8");
const J = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
const html = `<!doctype html>
<html lang="ru" data-resolution="landscape"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920,height=1080">
<link rel="stylesheet" href="kit/tokens.css"><link rel="stylesheet" href="kit/components.css"><link rel="stylesheet" href="kit/sketch.css">
<script src="assets/gsap.min.js"></script><script src="assets/vo/scene-05.alignment.js"></script>
<script>window.KIT_TERMS=${terms};window.KIT_SCENES=${J({ "05": scene, t5: title })};</script>
<script src="kit/kit.js"></script><script src="kit/sketches.js"></script><script src="kit/sketch.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden;background:var(--k-bg)}#pilot{position:relative;overflow:hidden;background:var(--k-bg)}</style></head>
<body><div id="pilot" data-composition-id="team-pilot" data-start="0" data-duration="${scene.duration + HEAD}" data-width="1920" data-height="1080">
<div id="scene-05" class="clip" data-composition-id="scene-05" data-composition-src="compositions/scene-05.html" data-start="${HEAD}" data-duration="${scene.duration}" data-track-index="1"></div>
<div id="scene-t5" class="clip" data-composition-id="scene-t5" data-composition-src="compositions/scene-t5.html" data-start="0" data-duration="2" data-track-index="2" style="z-index:55"></div>
<audio id="vo-05" src="assets/vo/scene-5.mp3" data-start="${HEAD}" data-duration="${scene.audioDuration}" data-volume="1" data-track-index="3"></audio>
</div><script>window.__timelines=window.__timelines||{};window.__timelines["team-pilot"]=gsap.timeline({paused:true});</script></body></html>\n`;
writeFileSync(`${out}/index.html`, html);
writeFileSync(`${out}/scenes.json`, `${JSON.stringify([{ n: "head", duration: HEAD, audio: null, chapter: scene.chapter, title: "Visual preroll" }, title, scene], null, 2)}\n`);
console.log(`${out}/index.html: scene05 starts ${HEAD}s + t5 overlay0..2, duration ${scene.duration + HEAD}s; predicted lag16=1600, delta=0`);
