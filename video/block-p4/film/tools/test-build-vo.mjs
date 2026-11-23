#!/usr/bin/env node
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseBlocks } from "./voice-p4.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ids = ["0m", "0", "0b", "1", "2", "3", "4", "5", "6"];
const storyboard = readFileSync(`${root}/../storyboard.md`, "utf8");
const accepted = parseBlocks(storyboard);


// W3b (TASK-685): accepted speech ends (alignment of the re-voiced blocks) for the synthetic alignment clocks.
const approvedSpeechEnd = { "0m": 8.682, 0: 16.6272, "0b": 12.6648, 1: 25.2132, 2: 29.4929, 3: 59.3864, 4: 19.3958, 5: 24.7693, 6: 10.8783 };
// W3b: real ffprobe format-duration of assets/vo-v3 (blocks 1/3 agree with the t2/t4 plan clock within 0.005 s).
const approvedFfprobeDuration = { "0m": 8.681973, 0: 16.547211, "0b": 12.664807, 1: 25.213243, 2: 29.493311, 3: 59.306417, 4: 19.315805, 5: 24.769252, 6: 10.798254 };

function fixture() {
  mkdirSync(`${root}/work`, { recursive: true });
  const dir = mkdtempSync(`${root}/work/test-build-vo-`);
  const film = join(dir, "film");
  for (const folder of ["tools", "assets/vo-v3", "assets/vo"]) mkdirSync(join(film, folder), { recursive: true });
  for (const tool of ["build-vo.mjs", "voice-p4.mjs", "json2js.mjs", "vo-tail-plan.json"]) copyFileSync(`${root}/tools/${tool}`, join(film, "tools", tool));
  writeFileSync(join(dir, "storyboard.md"), storyboard);
  // TASK-685: selective build — unselected scenes are kept by value from the accepted scenes.json.
  copyFileSync(`${root}/scenes.json`, join(film, "scenes.json"));
  for (const id of ids) {
    const characters = [...accepted[id]];
    const end = approvedSpeechEnd[id];
    const align = { characters, character_start_times_seconds: characters.map((_, i) => (i * end) / characters.length), character_end_times_seconds: characters.map((_, i) => ((i + 1) * end) / characters.length) };
    writeFileSync(join(film, `assets/vo-v3/block-${id}.alignment.json`), JSON.stringify(align));
    // Synthetic payloads: positive test stubs duration probing, without invoking audio tools.
    writeFileSync(join(film, `assets/vo-v3/block-${id}.mp3`), `new audio ${id}`);
    // W3b: active 0m is kept as is (loudness-levelled copy of the same take); the other eight are replaced.
    writeFileSync(join(film, `assets/vo/scene-${id}.mp3`), `active audio ${id}`);
    writeFileSync(join(film, `assets/vo/scene-${id}.alignment.json`), `active alignment ${id}`);
  }
  return { dir, film };
}

function snapshot(dir) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? [[entry.name, snapshot(path)]] : [[entry.name, readFileSync(path).toString("base64")]];
  });
}

function ffprobeFixture(dir) {
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  const cases = ids.map((id) => ["3", "5"].includes(id) ? `  *scene-${id}.mp3*) printf '${approvedFfprobeDuration[id]}\\n' ;;` : `  *block-${id}.mp3*) printf '${approvedFfprobeDuration[id]}\\n' ;;`).join("\n");
  writeFileSync(join(bin, "ffprobe"), `#!/bin/sh\ncase "$*" in\n${cases}\n  *) exit 9 ;;\nesac\n`, { mode: 0o755 });
}

function noWritesGuard(dir) {
  const guard = join(dir, "no-writes.mjs");
  writeFileSync(guard, `import fs from 'node:fs';\nimport { syncBuiltinESMExports } from 'node:module';\nfor (const name of ['mkdirSync','writeFileSync','copyFileSync','appendFileSync','renameSync','unlinkSync','rmSync']) fs[name] = () => { throw new Error('UNEXPECTED_FS_WRITE:' + name); };\nsyncBuiltinESMExports();\n`);
  return guard;
}

for (const failure of ["old final block", "missing final block after interrupted TTS"]) {
  test(`build-vo rejects ${failure} before ANY filesystem write`, () => {
    const { dir, film } = fixture();
    try {
      const last = join(film, "assets/vo-v3/block-6.alignment.json");
      if (failure === "old final block") {
        // Keep this stale revision independent of the mutable active media promoted by build-vo.
        const characters = [..."Теперь вы знаете, где вход в задачу и как закрепить версию кода."];
        writeFileSync(last, JSON.stringify({ characters, character_start_times_seconds: characters.map((_, i) => i / 100), character_end_times_seconds: characters.map((_, i) => (i + 1) / 100) }));
      }
      else rmSync(last);
      // All eight earlier blocks are valid: an incremental validation/write loop would fail this test.
      const guard = noWritesGuard(dir);
      const before = snapshot(dir);
      const run = spawnSync(process.execPath, ["--import", guard, join(film, "tools/build-vo.mjs"), "3,5"], { encoding: "utf8" });
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, failure === "old final block" ? /alignment блока 6 не совпадает/ : /ENOENT.*block-6\.alignment\.json/);
      assert.doesNotMatch(run.stderr, /UNEXPECTED_FS_WRITE/);
      assert.deepEqual(snapshot(dir), before);
      assert.deepEqual(JSON.parse(readFileSync(join(film, "scenes.json"))), JSON.parse(readFileSync(`${root}/scenes.json`)));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

for (const [name, mutate, pattern] of [
  ["missing active 0m audio", (film) => rmSync(join(film, "assets/vo/scene-0m.mp3")), /scene-0m\.mp3/],
  ["tail-plan drift of the previous speech end", (film) => {
    const p = join(film, "assets/vo-v3/block-1.alignment.json");
    const a = JSON.parse(readFileSync(p, "utf8"));
    // Keep the 27.3 s ceil slot unchanged, so this isolates the speech-end guard.
    a.character_end_times_seconds[a.character_end_times_seconds.length - 1] += 0.001;
    writeFileSync(p, JSON.stringify(a));
  }, /визуальн|дрейф|озвучк|tail/],
]) {
  test(`build-vo rejects ${name} before ANY filesystem write`, () => {
    const { dir, film } = fixture();
    try {
      ffprobeFixture(dir);
      mutate(film);
      const guard = noWritesGuard(dir);
      const before = snapshot(dir);
      const run = spawnSync(process.execPath, ["--import", guard, join(film, "tools/build-vo.mjs"), "3,5"], { encoding: "utf8", env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` } });
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, pattern);
      assert.doesNotMatch(run.stderr, /UNEXPECTED_FS_WRITE/);
      assert.deepEqual(snapshot(dir), before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("build-vo rejects a missing tail plan before ANY filesystem write", () => {
  const { dir, film } = fixture();
  try {
    ffprobeFixture(dir);
    rmSync(join(film, "tools/vo-tail-plan.json"));
    const guard = noWritesGuard(dir);
    const before = snapshot(dir);
    const run = spawnSync(process.execPath, ["--import", guard, join(film, "tools/build-vo.mjs"), "3,5"], { encoding: "utf8", env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` } });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /vo-tail-plan\.json/);
    assert.doesNotMatch(run.stderr, /UNEXPECTED_FS_WRITE/);
    assert.deepEqual(snapshot(dir), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("build-vo promotes only the selected blocks 3 and 5 and keeps every other scene by value", () => {
  const { dir, film } = fixture();
  try {
    ffprobeFixture(dir);
    const before = JSON.parse(readFileSync(join(film, "scenes.json")));
    const run = spawnSync(process.execPath, [join(film, "tools/build-vo.mjs"), "3,5"], { encoding: "utf8", env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` } });
    assert.equal(run.status, 0, run.stderr);
    const scenes = JSON.parse(readFileSync(join(film, "scenes.json")));
    assert.equal(scenes.filter((s) => s.kind !== "title").length, 9);
    assert.equal(scenes.filter((s) => s.kind === "title").length, 5);
    assert.equal(scenes.filter((s) => s.tail === true).map((s) => s.id).join(","), "t2,t4");
    const total = scenes.filter((s) => s.kind !== "title").reduce((a, s) => a + s.duration, 0);
    assert.equal(Math.round(total * 10) / 10, 224.9);
    for (const id of ids.filter((n) => !["3", "5"].includes(n))) assert.deepEqual(scenes.find((s) => s.kind !== "title" && String(s.n) === id), before.find((s) => s.kind !== "title" && String(s.n) === id));
    assert.equal(scenes.find((s) => String(s.n) === "3").duration, 61.6);
    assert.equal(scenes.find((s) => String(s.n) === "5").duration, 26.6);
    // Selected blocks get the accepted alignment; the others (and every active mp3) stay byte for byte.
    for (const id of ids) {
      assert.equal(readFileSync(join(film, `assets/vo/scene-${id}.mp3`), "utf8"), `active audio ${id}`);
      if (["3", "5"].includes(id)) {
        assert.equal(JSON.parse(readFileSync(join(film, `assets/vo/scene-${id}.alignment.json`))).characters.join(""), accepted[id]);
        assert.match(readFileSync(join(film, `assets/vo/scene-${id.padStart(2, "0")}.alignment.js`), "utf8"), /window\.ALIGN/);
      } else assert.equal(readFileSync(join(film, `assets/vo/scene-${id}.alignment.json`), "utf8"), `active alignment ${id}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("build-vo refuses a missing or unknown block selection before ANY write", () => {
  const { dir, film } = fixture();
  try {
    ffprobeFixture(dir);
    const before = snapshot(dir);
    for (const args of [[], ["all"], ["0m"], ["3,3"], ["9"]]) {
      const run = spawnSync(process.execPath, [join(film, "tools/build-vo.mjs"), ...args], { encoding: "utf8", env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` } });
      assert.notEqual(run.status, 0, args.join(","));
      assert.match(run.stderr, /нужен явный список блоков/);
    }
    assert.deepEqual(snapshot(dir), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Captions use the accepted local alignment data, never audio/provider calls.
// A fresh fixture deliberately has no renders directory, so early mkdir is observable.
function captionFixture() {
  const { dir, film } = fixture();
  for (const tool of ["build-captions.mjs"]) copyFileSync(`${root}/tools/${tool}`, join(film, "tools", tool));
  copyFileSync(`${root}/terms.json`, join(film, "terms.json"));
  copyFileSync(`${root}/scenes.json`, join(film, "scenes.json"));
  for (const id of ids) copyFileSync(`${root}/assets/vo/scene-${id}.alignment.json`, join(film, `assets/vo/scene-${id}.alignment.json`));
  return { dir, film };
}

const requiredFacts = [
  ["clock", ["tails", 0, "previousHtmlAudioDuration"], "tails[0].previousHtmlAudioDuration"],
  ["deadline", ["tails", 0, "previousReadDeadline"], "tails[0].previousReadDeadline"],
  ["trimmedEnd", ["tails", 0, "previousCue", "trimmedEnd"], "tails[0].previousCue.trimmedEnd"],
  ["chapterStart", ["chaptersVoiceStarts", 0], "chaptersVoiceStarts[0]"],
];
for (const producer of ["build-vo", "build-captions"]) {
  for (const [name, path, field] of requiredFacts) {
    for (const mutation of ["missing", "numeric string"]) {
      test(`${producer} rejects ${mutation} ${name} before ANY write or new directory`, () => {
        const { dir, film } = producer === "build-captions" ? captionFixture() : fixture();
        try {
          ffprobeFixture(dir);
          const planFile = join(film, "tools/vo-tail-plan.json");
          const plan = JSON.parse(readFileSync(planFile));
          const parent = path.slice(0, -1).reduce((value, key) => value[key], plan);
          const key = path.at(-1);
          if (mutation === "missing") delete parent[key];
          else parent[key] = String(parent[key]);
          writeFileSync(planFile, JSON.stringify(plan));
          const guard = noWritesGuard(dir), before = snapshot(dir);
          assert.equal(existsSync(join(film, "renders")), false);
          const run = spawnSync(process.execPath, ["--import", guard, join(film, `tools/${producer}.mjs`)], { encoding: "utf8", env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` } });
          assert.notEqual(run.status, 0);
          assert(run.stderr.includes(`${field}: требуется конечное число (number)`), run.stderr);
          assert.doesNotMatch(run.stderr, /UNEXPECTED_FS_WRITE/);
          assert.deepEqual(snapshot(dir), before);
          assert.equal(existsSync(join(film, "renders")), false);
        } finally { rmSync(dir, { recursive: true, force: true }); }
      });
    }
  }
}

test("build-captions accepts the approved plan and emits 57 finite cues with only approved tail boundaries", () => {
  const { dir, film } = captionFixture();
  try {
    const run = spawnSync(process.execPath, [join(film, "tools/build-captions.mjs")], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const vtt = readFileSync(join(film, "renders/block-p4.vtt"), "utf8");
    const srt = readFileSync(join(film, "renders/block-p4.srt"), "utf8");
    assert.equal((vtt.match(/ --> /g) || []).length, 57);
    assert.doesNotMatch(vtt + srt, /NaN|undefined|Infinity/);
    assert(vtt.includes("00:01:02.599 --> 00:01:08.000"));
    assert(vtt.includes("00:02:36.460 --> 00:02:41.100"));
    assert(srt.includes("00:01:02,599 --> 00:01:08,000"));
    assert(srt.includes("00:02:36,460 --> 00:02:41,100"));
    const chapters = JSON.parse(readFileSync(join(film, "renders/block-p4.chapters.json")));
    assert.equal(chapters.find((s) => s.n === 2).start, 70);
    assert.equal(chapters.find((s) => s.n === 4).start, 163.1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("voice-only plan: nine voice blocks on scene starts, 225.0 s bus (with the 0.1 s head), 10 ms fade-in only on blocks 3 and 4", () => {
  const run = spawnSync(process.execPath, [fileURLToPath(new URL("./voice-only.mjs", import.meta.url)), "--selftest"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /voice-only: ok, сцен 9, 10800000 сэмплов \(225 с\), фейд: 3, 4/);
});
