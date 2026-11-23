#!/usr/bin/env node
// Кадры сцены по локальному времени: node tools/snap.mjs <N> <t1,t2,…> → snapshots/sNN/ (время пересчитывается в общее)
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [n, list] = process.argv.slice(2);
const scenes = JSON.parse(readFileSync(`${root}/scenes.json`, "utf8"));
let start = 0; for (const s of scenes) { if (String(s.n) === String(Number(n))) break; start += s.duration; }
const times = list.split(",").map((x) => (start + Number(x)).toFixed(2)).join(",");
const out = `${root}/snapshots/s${String(n).padStart(2, "0")}`;
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
execFileSync("npx", ["--yes", "hyperframes@0.8.166", "snapshot", "--at", times, "--no-end", "-o", out, "--describe", "false"], { cwd: root, stdio: "ignore", env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_SKIP_SKILLS: "1" } });
console.log(out);
