#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { MODEL, SPEED, VOICE, blockOrder, generateVoice, parseBlocks, requestBody, selectIds } from "./voice.mjs";

const tools = dirname(fileURLToPath(import.meta.url));
const blocks = { "0m": "Карта.", "0": "Интро.", "0b": "Контекст.", "1": "Один.", "2": "Два.", "3": "Три.", "4": "Четыре.", "5": "Пять.", "6": "Шесть." };
const fixture = (t) => {
  const directory = mkdtempSync(join(tools, ".test-voice-"));
  t.after(() => {
    assert.equal(dirname(directory), tools);
    assert.ok(directory.startsWith(join(tools, ".test-voice-")));
    rmSync(directory, { recursive: true, force: true });
  });
  const storyboardPath = join(directory, "storyboard.md"), outDir = join(directory, "out");
  writeFileSync(storyboardPath, Object.entries(blocks).map(([id, text]) => `**${id.replace("b", "б").replace("m", "м")}. Блок** ${text}`).join("\n"));
  return { directory, storyboardPath, outDir };
};
const response = (text, requestId = "request-test") => ({ json: { audio_base64: Buffer.from("test audio").toString("base64"), alignment: { characters: [...text] } }, requestId });

test("storyboard parser handles map/context and rejects duplicate IDs", () => {
  assert.deepEqual(parseBlocks("**0м. Карта** Карта.\n**0б. Контекст** Контекст.\n## Оценка\n**5. Не речь** Нет."), { "0m": "Карта.", "0b": "Контекст." });
  assert.throws(() => parseBlocks("**0б. A** Один.\n**0b. B** Два."));
  assert.throws(() => parseBlocks("**5. A** \n"));
  assert.deepEqual(blockOrder(["10", "1", "0b", "0", "0m", "6"]), ["0m", "0", "0b", "1", "6", "10"]);
});

for (const value of [undefined, "", [], "all", "5,5", "0б,0b", "5,99", "5,", " 5", [5]]) {
  test(`selection ${JSON.stringify(value)} fails before request or output writes`, (t) => {
    const f = fixture(t);
    let calls = 0;
    assert.throws(() => generateVoice({ ...f, selectedIds: value, request: () => { calls++; }, log: () => {} }));
    assert.equal(calls, 0);
    assert.equal(existsSync(f.outDir), false);
  });
}

test("selected Cyrillic aliases normalize, never silently deduplicate", () => {
  assert.deepEqual(selectIds("0м,0б,2", Object.keys(blocks)), ["0m", "0b", "2"]);
});

test("pilot 5 uses actual 4/6 text and fixed voice settings", (t) => {
  const f = fixture(t), bodies = [];
  const ids = generateVoice({ ...f, selectedIds: "5", request: (body, tmp) => {
    bodies.push(body);
    assert.equal(dirname(tmp), f.outDir);
    assert.ok(existsSync(tmp));
    return response(body.text);
  }, log: () => {} });
  assert.deepEqual(ids, ["5"]);
  assert.equal(VOICE, "zWSsRd3J6WyZFl12aGMB");
  assert.equal(MODEL, "eleven_v4");
  assert.equal(SPEED, 0.85);
  assert.deepEqual(bodies, [{ text: blocks["5"], model_id: MODEL, language_code: "ru", voice_settings: { speed: SPEED }, previous_text: blocks["4"], next_text: blocks["6"] }]);
  assert.deepEqual(readdirSync(f.outDir).sort(), ["block-5.alignment.json", "block-5.mp3", "block-5.request-id"]);
  assert.equal(readFileSync(join(f.outDir, "block-5.mp3"), "utf8"), "test audio");
});

for (const ids of [["0b", "2", "3", "6"], ["2", "3"], ["3", "2"], ["5", "3"]]) {
  test(`stitching ${ids.join(",")} uses request ID only for actual full-order predecessor`, (t) => {
    const f = fixture(t), bodies = [];
    generateVoice({ ...f, selectedIds: ids, request: (body) => { bodies.push(body); return response(body.text, `request-${bodies.length}`); }, log: () => {} });
    const order = blockOrder(Object.keys(blocks));
    ids.forEach((id, i) => {
      const prev = order[order.indexOf(id) - 1];
      if (i && ids[i - 1] === prev) {
        assert.deepEqual(bodies[i].previous_request_ids, [`request-${i}`]);
        assert.equal(bodies[i].previous_text, undefined);
      } else {
        assert.equal(bodies[i].previous_request_ids, undefined);
        assert.equal(bodies[i].previous_text, blocks[prev]);
      }
    });
  });
}

test("first/last block boundaries and missing previous request ID fall back correctly", () => {
  assert.equal(requestBody(blocks, "0m").previous_text, undefined);
  assert.equal(requestBody(blocks, "0m").previous_request_ids, undefined);
  assert.equal(requestBody(blocks, "6").next_text, undefined);
  assert.equal(requestBody(blocks, "3", { id: "2", requestId: null }).previous_text, blocks["2"]);
  const long = { "1": "a".repeat(450), "2": "middle", "3": "b".repeat(450) };
  assert.equal(requestBody(long, "2").previous_text.length, 400);
  assert.equal(requestBody(long, "2").next_text.length, 400);
});

for (const fault of ["throw", "missing ID", "wrong alignment"]) {
  test(`request ${fault} cleans repo-local work directory without output`, (t) => {
    const f = fixture(t);
    assert.throws(() => generateVoice({ ...f, selectedIds: "5", request: (body) => {
      if (fault === "throw") throw new Error("offline failure");
      return response(fault === "wrong alignment" ? "Wrong." : body.text, fault === "missing ID" ? null : "request-test");
    }, log: () => {} }));
    assert.deepEqual(readdirSync(f.outDir), []);
  });
}

test("import does not selftest, read files, obtain key or generate even with --selftest argv", (t) => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `process.argv[2] = '--selftest'; await import(${JSON.stringify(new URL("./voice.mjs", import.meta.url).href)});`], { cwd: f.directory, env: { ...process.env, STORYBOARD: join(f.directory, "missing.md"), PATH: "" }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.deepEqual(readdirSync(f.directory), ["storyboard.md"]);
});

test("CLI missing selection fails without filesystem writes or external tools", (t) => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, [join(tools, "voice.mjs"), f.outDir], { cwd: f.directory, env: { ...process.env, PATH: "" }, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(f.outDir), false);
});
