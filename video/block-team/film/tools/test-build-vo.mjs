#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { BLOCK_IDS, CH, buildVo, parseArgs, planBuildVo, sceneDuration } from "./build-vo.mjs";

const tools = dirname(fileURLToPath(import.meta.url));
const script = join(tools, "build-vo.mjs");
const alignment = (text, end = 3.21) => ({ characters: [...text], character_start_times_seconds: [...text].map((_, i) => i * end / text.length), character_end_times_seconds: [...text].map((_, i) => (i + 1) * end / text.length) });
const snapshot = (directory) => Object.fromEntries(readdirSync(directory, { recursive: true }).sort().flatMap((name) => {
  try { return [[name, readFileSync(join(directory, name)).toString("base64")]]; } catch (error) { if (error.code === "EISDIR") return []; throw error; }
}));
const fixture = (t) => {
  const directory = mkdtempSync(join(tools, ".test-build-vo-"));
  t.after(() => {
    assert.equal(dirname(directory), tools);
    assert.ok(directory.startsWith(join(tools, ".test-build-vo-")));
    rmSync(directory, { recursive: true, force: true });
  });
  const root = join(directory, "film"), active = join(root, "assets/vo"), source = join(root, "assets/vo-v3");
  mkdirSync(active, { recursive: true });
  mkdirSync(source, { recursive: true });
  const blocks = Object.fromEntries(BLOCK_IDS.map((id) => [id, `Новый текст ${id}.`]));
  writeFileSync(join(directory, "storyboard.md"), BLOCK_IDS.map((id) => `**${id.replace("b", "б").replace("m", "м")}. Блок** ${blocks[id]}`).join("\n"));
  const scenes = BLOCK_IDS.flatMap((id, i) => {
    for (const [suffix, data] of [["mp3", `leveled old ${id}`], ["alignment.json", `old alignment bytes ${id}\n`]]) writeFileSync(join(active, `scene-${id}.${suffix}`), data);
    writeFileSync(join(active, `scene-${id.padStart(2, "0")}.alignment.js`), `old JS bytes ${id}\n`);
    const scene = { n: /^\d+$/.test(id) ? Number(id) : id, duration: i + 10.75, audioDuration: i + 8.125, chapter: `old ${id}`, title: `old ${id}`, step: i, header: { mode: "parts", total: 5, extra: "preserve" }, audio: `assets/vo/scene-${id}.mp3`, custom: { id } };
    return /^[1-5]$/.test(id) ? [{ id: `t${id}`, of: Number(id), overlay: true, kind: "title", duration: 2, chapter: `old ${id}`, title: `old ${id}`, custom: [id], header: scene.header, audio: null }, scene] : [scene];
  });
  writeFileSync(join(root, "scenes.json"), JSON.stringify(scenes, null, 2) + "\n");
  // Only pilot source exists. Other storyboard text intentionally differs from active data.
  const putSource = (id, value = alignment(blocks[id])) => {
    writeFileSync(join(source, `block-${id}.mp3`), `new mp3 ${id}`);
    writeFileSync(join(source, `block-${id}.alignment.json`), JSON.stringify(value, null, 1) + "\n");
  };
  putSource("5");
  return { directory, root, active, source, blocks, scenes, putSource, options: { root, selectedIds: ["5"], probe: () => 3.01 } };
};

test("pilot 5 preserves every unselected MP3/JSON/JS byte and all unrelated scene metadata", (t) => {
  const f = fixture(t), before = snapshot(f.active);
  const result = buildVo(f.options);
  for (const [name, bytes] of Object.entries(before)) if (!/^scene-(5|05)\./.test(name)) assert.equal(snapshot(f.active)[name], bytes, name);
  for (let i = 0; i < f.scenes.length; i++) {
    const expected = structuredClone(f.scenes[i]);
    if (String(expected.n) === "5") { expected.duration = 5.3; expected.audioDuration = 3.01; }
    if (String(expected.n) === "5" || expected.id === "t5") { expected.chapter = CH[5]; expected.title = CH[5]; }
    assert.deepEqual(result.scenes[i], expected);
  }
  assert.equal(readFileSync(join(f.active, "scene-5.mp3"), "utf8"), "new mp3 5");
  assert.deepEqual(readFileSync(join(f.active, "scene-5.alignment.json")), readFileSync(join(f.source, "block-5.alignment.json")));
  const context = { window: {} };
  runInNewContext(readFileSync(join(f.active, "scene-05.alignment.js"), "utf8"), context);
  assert.equal(context.window.ALIGN["05"].characters.join(""), f.blocks["5"]);
});

test("planning preflights without writes and ffprobe may dominate alignment", (t) => {
  const f = fixture(t), before = snapshot(f.directory), probed = [];
  const plan = planBuildVo({ ...f.options, probe: (path) => { probed.push(path); return 4.234; } });
  assert.equal(plan.updates[0].duration, 6.3);
  assert.equal(plan.updates[0].audioDuration, 4.23);
  assert.deepEqual(probed, [join(f.source, "block-5.mp3")]);
  assert.deepEqual(snapshot(f.directory), before);
});

for (const selectedIds of [undefined, "", [], "all", "5,5", "0b,0б", "99", "5,", " 5", [5]]) {
  test(`invalid selection ${JSON.stringify(selectedIds)} fails before writes`, (t) => {
    const f = fixture(t), before = snapshot(f.directory);
    assert.throws(() => buildVo({ ...f.options, selectedIds }));
    assert.deepEqual(snapshot(f.directory), before);
  });
}

for (const fault of ["missing source", "missing audio", "missing storyboard", "wrong text", "unequal arrays", "negative", "nonfinite", "backward", "empty mp3", "missing scene", "duplicate scene", "bad audio path", "bad probe"]) {
  test(`${fault} in later selected block leaves earlier selected block and all files untouched`, (t) => {
    const f = fixture(t);
    if (!["missing source", "missing audio"].includes(fault)) f.putSource("6");
    if (fault === "missing audio") writeFileSync(join(f.source, "block-6.alignment.json"), JSON.stringify(alignment(f.blocks["6"])));
    if (fault === "missing storyboard") writeFileSync(join(f.directory, "storyboard.md"), `**5. Блок** ${f.blocks["5"]}\n`);
    if (["wrong text", "unequal arrays", "negative", "nonfinite", "backward"].includes(fault)) {
      const value = alignment(f.blocks["6"]);
      if (fault === "wrong text") value.characters[0] = "X";
      if (fault === "unequal arrays") value.character_end_times_seconds.pop();
      if (fault === "negative") value.character_start_times_seconds[0] = -1;
      if (fault === "nonfinite") value.character_end_times_seconds[0] = null;
      if (fault === "backward") value.character_start_times_seconds[2] = 0;
      writeFileSync(join(f.source, "block-6.alignment.json"), JSON.stringify(value));
    }
    if (fault === "empty mp3") writeFileSync(join(f.source, "block-6.mp3"), "");
    let scenes = structuredClone(f.scenes);
    if (fault === "missing scene") scenes = scenes.filter((scene) => String(scene.n) !== "6");
    if (fault === "duplicate scene") scenes.push(scenes.find((scene) => String(scene.n) === "6"));
    if (fault === "bad audio path") scenes.find((scene) => String(scene.n) === "6").audio = "elsewhere.mp3";
    writeFileSync(join(f.root, "scenes.json"), JSON.stringify(scenes));
    const before = snapshot(f.directory);
    assert.throws(() => buildVo({ ...f.options, selectedIds: "5,6", probe: (path) => fault === "bad probe" && path.endsWith("6.mp3") ? NaN : 3.01 }));
    assert.deepEqual(snapshot(f.directory), before);
  });
}

test("selected 0b,2,3,5,6 use per-scene tails without reconstructing metadata", (t) => {
  const f = fixture(t), ids = ["0b", "2", "3", "5", "6"];
  ids.forEach((id) => f.putSource(id, alignment(f.blocks[id], 3.21)));
  const plan = buildVo({ ...f.options, selectedIds: ids });
  assert.deepEqual(plan.updates.map(({ id, duration }) => [id, duration]), [["0b", 4.8], ["2", 4.9], ["3", 5.3], ["5", 5.3], ["6", 6.3]]);
});

test("duration guard rejects non-finite, zero, negative measurements", () => {
  for (const value of [NaN, Infinity, -1, 0, "4"]) {
    assert.throws(() => sceneDuration(value, 3, "5"));
    assert.throws(() => sceneDuration(3, value, "5"));
  }
});

test("CLI requires selection and accepts explicit staging root", (t) => {
  const f = fixture(t);
  assert.deepEqual(parseArgs(["--root", f.root, "5"]), { root: f.root, selectedIds: "5" });
  assert.deepEqual(parseArgs(["5", "--root", f.root]), { root: f.root, selectedIds: "5" });
  for (const args of [[], ["--root", f.root], ["--root"], ["5", "6"], ["--root", f.root, "--root", f.root, "5"], ["--unknown", "5"]]) assert.throws(() => parseArgs(args));
  const before = snapshot(f.directory);
  const result = spawnSync(process.execPath, [script, "--root", f.root], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.deepEqual(snapshot(f.directory), before);
});

test("staging CLI probes a real repo-local MP3 without touching canonical film", (t) => {
  const f = fixture(t);
  f.putSource("5", alignment(f.blocks["5"], 0.2));
  const input = join(f.source, "block-5.mp3");
  const encoded = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", "0.4", "-c:a", "libmp3lame", input], { encoding: "utf8" });
  assert.equal(encoded.status, 0, encoded.stderr);
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input], { encoding: "utf8" });
  assert.equal(probe.status, 0, probe.stderr);
  const measured = Number(probe.stdout.trim());
  assert.ok(measured > 0.2);
  const before = snapshot(f.active);
  const built = spawnSync(process.execPath, [script, "--root", f.root, "5"], { encoding: "utf8" });
  assert.equal(built.status, 0, built.stderr);
  const scene = JSON.parse(readFileSync(join(f.root, "scenes.json"), "utf8")).find((entry) => String(entry.n) === "5");
  assert.equal(scene.duration, Math.ceil((measured + 2) * 10) / 10);
  assert.equal(scene.audioDuration, Number(measured.toFixed(2)));
  for (const [name, bytes] of Object.entries(before)) if (!/^scene-(5|05)\./.test(name)) assert.equal(snapshot(f.active)[name], bytes, name);
});

test("explicit pilot reading hold extends 34.9 to 37 without changing audioDuration or metadata", (t) => {
  const f = fixture(t);
  f.putSource("5", alignment(f.blocks["5"], 32.8637));
  const before = snapshot(f.active);
  const plan = buildVo({ ...f.options, probe: () => 32.8, minDurations: { 5: 37 }, holdReason: "Final card: 5 seconds after reveal" });
  assert.equal(plan.updates[0].formulaDuration, 34.9);
  assert.equal(plan.updates[0].duration, 37);
  assert.deepEqual(plan.updates[0].readingHold, { minimum: 37, reason: "Final card: 5 seconds after reveal" });
  assert.equal(plan.scenes.find((scene) => scene.n === 5).audioDuration, 32.8);
  for (const [name, bytes] of Object.entries(before)) if (!/^scene-(5|05)\./.test(name)) assert.equal(snapshot(f.active)[name], bytes);
});

for (const [minDurations, holdReason] of [[{ 5: 5.2 }, "too short"], [{ 5: Infinity }, "invalid"], [{ 5: NaN }, "invalid"], [{ 5: 0 }, "invalid"], [{ 5: "37" }, "invalid"], [{ 6: 37 }, "unselected"], [{ 99: 37 }, "unknown"], [{ 5: 37 }, undefined], [{ 5: 37 }, " "], [{}, "unused reason"], [null, "invalid"]]) {
  test(`invalid reading hold ${JSON.stringify(minDurations)} / ${holdReason} fails before writes`, (t) => {
    const f = fixture(t), before = snapshot(f.directory);
    assert.throws(() => buildVo({ ...f.options, minDurations, holdReason }));
    assert.deepEqual(snapshot(f.directory), before);
  });
}

test("reading-hold CLI is explicit, selected-only and rejects duplicate or malformed options", (t) => {
  const f = fixture(t);
  const options = parseArgs(["--root", f.root, "5", "--min-duration", "5=37", "--hold-reason", "Final card ≥5s"]);
  assert.deepEqual(options, { root: f.root, selectedIds: "5", minDurations: { 5: 37 }, holdReason: "Final card ≥5s" });
  for (const extras of [["--min-duration", "5=37"], ["--min-duration", "6=37", "--hold-reason", "unselected"], ["--min-duration", "5=NaN", "--hold-reason", "bad"], ["--min-duration", "5=37", "--min-duration", "5=38", "--hold-reason", "duplicate"], ["--min-duration", "5=-1", "--hold-reason", "bad"], ["--hold-reason", "unused"]]) assert.throws(() => parseArgs(["5", ...extras]));
  const plan = planBuildVo({ ...f.options, minDurations: { 5: 5.31 }, holdReason: "Round up reading deadline" });
  assert.equal(plan.updates[0].duration, 5.4);
});

test("invalid reading hold in later selected block prevalidates before any writes", (t) => {
  const f = fixture(t);
  f.putSource("6");
  const before = snapshot(f.directory);
  assert.throws(() => buildVo({ ...f.options, selectedIds: "5,6", minDurations: { 5: 37, 6: 1 }, holdReason: "reading" }));
  assert.deepEqual(snapshot(f.directory), before);
});

test("import has no producer side effects even with --selftest in argv", (t) => {
  const f = fixture(t), before = snapshot(f.directory);
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `process.argv[2] = '--selftest'; await import(${JSON.stringify(new URL("./build-vo.mjs", import.meta.url).href)});`], { cwd: f.root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.deepEqual(snapshot(f.directory), before);
});
