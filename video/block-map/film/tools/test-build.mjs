#!/usr/bin/env node
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
test("index reserves planned scenes, omits absent audio and fails for an unplanned missing scene", () => {
  mkdirSync(`${root}/work`, { recursive: true });
  const dir = mkdtempSync(`${root}/work/test-build-`);
  try {
    mkdirSync(`${dir}/tools`);
    writeFileSync(`${dir}/terms.json`, "{}\n");
    mkdirSync(`${dir}/compositions`);
    writeFileSync(`${dir}/terms.json`, "[]");
    copyFileSync(`${root}/tools/build-index.mjs`, `${dir}/tools/build-index.mjs`);
    const scenes = [
      { id: "t1", kind: "title", overlay: true, duration: 2, audio: null },
      { n: 1, planned: true, duration: 49, audio: null },
      { id: "10", kind: "title", duration: 8, audio: null },
    ];
    for (const id of ["t1", "10"]) writeFileSync(`${dir}/compositions/scene-${id}.html`, "<template></template>");
    const save = () => writeFileSync(`${dir}/scenes.json`, JSON.stringify(scenes));
    const run = (...args) => spawnSync(process.execPath, [`${dir}/tools/build-index.mjs`, ...args], { encoding: "utf8" });
    save();
    assert.equal(run().status, 0);
    const html = readFileSync(`${dir}/index.html`, "utf8");
    assert.match(html, /id="root"[^>]*data-duration="57"/);
    assert.match(html, /id="scene-10"[^>]*data-start="49"/);
    assert.match(html, /id="scene-t1"[^>]*data-start="0"[^>]*data-duration="2"[^>]*z-index:55/); // заставка-наложение начинается вместе со сценой и времени не добавляет
    assert.doesNotMatch(html, /<audio|alignment\.js|compositions\/scene-01/);
    assert.equal(run("--only", "10").status, 0);
    assert.match(readFileSync(`${dir}/index.html`, "utf8"), /id="scene-10"[^>]*data-start="0"/);
    const pending = run("--only", "1");
    assert.notEqual(pending.status, 0);
    assert.match(pending.stderr, /пока запланирована/);
    scenes[1].planned = false;
    save();
    const missing = run();
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /Нет файла .*scene-01\.html/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
