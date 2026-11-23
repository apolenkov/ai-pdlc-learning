#!/usr/bin/env node
// Проверяет реальную сборку v4 на короткой синтетической записи; исходную озвучку не меняет.
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
test("v4 build normalizes derived audio, preserves sources and puts chapter titles on silent tails", () => {
  mkdirSync(`${root}/work`, { recursive: true });
  const dir = mkdtempSync(`${root}/work/test-vo-build-`);
  try {
    mkdirSync(`${dir}/tools`);
    mkdirSync(`${dir}/assets/vo-v4`, { recursive: true });
    for (const tool of ["build-vo", "vo-normalize", "vo-gaps", "json2js", "build-captions", "build-titles"]) {
      copyFileSync(`${root}/tools/${tool}.mjs`, `${dir}/tools/${tool}.mjs`);
    }
    const audio = `${dir}/assets/vo-v4/block-0m.mp3`;
    execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-af", "volume=0:enable='between(t,1,2)'", "-b:a", "192k", audio]);
    const text = "Привет. Мир.";
    const alignment = JSON.stringify({
      characters: [...text],
      character_start_times_seconds: [...text].map((_, i) => i < 7 ? i / 10 : 2 + (i - 7) / 10),
      character_end_times_seconds: [...text].map((_, i) => i < 7 ? (i + 1) / 10 : 2 + (i - 6) / 10),
    });
    const originalAudio = readFileSync(audio);
    for (const n of ["0m", 0, 1, 2, 3, 4, 5, 6]) {
      if (n !== "0m") copyFileSync(audio, `${dir}/assets/vo-v4/block-${n}.mp3`);
      writeFileSync(`${dir}/assets/vo-v4/block-${n}.alignment.json`, alignment);
    }
    writeFileSync(`${dir}/terms.json`, JSON.stringify([["Привет", "CustomDev"]]));
    const run = (tool) => {
      const result = spawnSync(process.execPath, [`${dir}/tools/${tool}.mjs`], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    };
    run("build-vo");
    const manifest = JSON.parse(readFileSync(`${dir}/scenes.json`, "utf8"));
    assert.deepEqual(manifest.filter((s) => s.kind !== "title").map((s) => s.n), ["0m", 0, 1, 2, 3, 4, 5, 6]);
    assert.deepEqual(readFileSync(audio), originalAudio);
    assert.equal(readFileSync(`${dir}/assets/vo-v4/block-0m.alignment.json`, "utf8"), alignment);
    const normalized = JSON.parse(readFileSync(`${dir}/assets/vo/scene-0m.alignment.json`, "utf8"));
    assert.ok(normalized.character_end_times_seconds.at(-1) < 2.5, "alignment follows the removed pause");
    assert.ok(manifest[0].audioDuration < 2.5, "audio follows the removed pause");
    const titles = manifest.filter((s) => s.kind === "title");
    assert.equal(titles.length, 5);
    for (const title of titles) {
      assert.equal(title.overlay, true);
      assert.equal(title.tail, true);
      const previous = manifest[manifest.indexOf(title) - 1];
      assert.ok(previous.duration - previous.audioDuration >= title.duration - 1e-8, "title cannot cover previous audio");
    }
    const saved = readFileSync(`${dir}/scenes.json`, "utf8");
    run("build-vo");
    assert.equal(readFileSync(`${dir}/scenes.json`, "utf8"), saved, "rebuild preserves normalized timings and tail placement");
    run("build-captions");
    const chapters = JSON.parse(readFileSync(`${dir}/renders/block-map.chapters.json`, "utf8"));
    assert.equal(chapters.length, 6);
    assert.equal(chapters[0].title, "Вступление");
    assert.equal(chapters[0].start, 0);
    const introDuration = manifest[0].duration + manifest[1].duration;
    assert.equal(chapters[1].start, +(introDuration - 2).toFixed(2));
    assert.equal(chapters[0].end, chapters[1].start);
    for (const chapter of chapters.slice(1)) assert.ok(Math.abs(chapter.speechStart - chapter.start - 2) < 1e-8);
    for (let i = 1; i < chapters.length; i++) assert.equal(chapters[i - 1].end, chapters[i].start, "chapters cannot overlap on title tails");
    assert.equal(chapters.at(-1).end, +manifest.filter((s) => !s.overlay).reduce((sum, s) => sum + s.duration, 0).toFixed(2));
    const vtt = readFileSync(`${dir}/renders/block-map.vtt`, "utf8");
    assert.match(vtt, /CustomDev/);
    assert.doesNotMatch(vtt, /Привет/);
    run("build-titles");
    assert.match(readFileSync(`${dir}/compositions/scene-t3.html`, "utf8"), /Ветки после шага 5/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
