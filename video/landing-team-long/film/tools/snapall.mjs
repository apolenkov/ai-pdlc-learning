#!/usr/bin/env node
// Кадры всех сцен: node tools/snapall.mjs "1:3,10,20;2:5,30" → snapshots/all/ (имя: sNN-tt.png по порядку времени)
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync, readdirSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
const starts = scenes.reduce((a, s) => (a.push(a.at(-1) + s.duration), a), [0]);
const want = process.argv[2].split(";").flatMap((g) => { const [n, l] = g.split(":"); return l.split(",").map((x) => ({ n: Number(n), t: Number(x), g: starts[Number(n) - 1] + Number(x) })); });
const out = `${root}/snapshots/all`;
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
execFileSync("npx", ["--yes", "hyperframes@0.8.166", "snapshot", "--at", want.map((w) => w.g.toFixed(2)).join(","), "--no-end", "-o", out, "--describe", "false"], { cwd: root, stdio: "inherit", env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_SKIP_SKILLS: "1" } });
console.log(want.map((w) => `${w.n}@${w.t}=${w.g.toFixed(2)}`).join(" "));
console.log(readdirSync(out).join(" "));
