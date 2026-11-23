#!/usr/bin/env node
// Offline preparation contract: no ElevenLabs call, media decode or file generation.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseBlocks, stitchingContext, SPEED, MODEL, VOICE } from "./voice-p4.mjs";

const text = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const blocks = parseBlocks(text("../../storyboard.md"));
const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

test("approved p4 speech stays within ten percent and keeps the exact pull warning", () => {
  assert.equal(words(blocks[3]), 125);
  assert.equal(words(blocks[5]), 47);
  for (const [id, previous] of [[3, 129], [5, 48]]) assert(Math.abs(words(blocks[id]) / previous - 1) <= 0.1);
  assert(blocks[3].endsWith("Синхронизации нет — перед работой забирайте изменения через git pull."));
  assert.equal((blocks[3].match(/бете/g) || []).length, 1);
  assert(blocks[5].includes("статусы задач — отдельным запросом в store"));
  assert(blocks[5].includes("Архив — после слияния кода и статусов"));
  assert.equal(SPEED, 0.95);
  assert.equal(MODEL, "eleven_v4");
  assert.equal(VOICE, "zWSsRd3J6WyZFl12aGMB");
});

test("real neighbours of 3 and 5 are preserved even in a sparse request", () => {
  assert.deepEqual(stitchingContext(blocks, "3", null, null), { previous_text: blocks[2].slice(-400), next_text: blocks[4].slice(0, 400) });
  assert.deepEqual(stitchingContext(blocks, "5", "3", "synthetic-request-3"), { previous_text: blocks[4].slice(-400), next_text: blocks[6].slice(0, 400) });
  assert.deepEqual(stitchingContext(blocks, "5", "4", "synthetic-request-4"), { previous_request_ids: ["synthetic-request-4"], next_text: blocks[6].slice(0, 400) });
  assert.throws(() => stitchingContext(blocks, "99", null, null));
});

test("t5 producer and generated source agree; historical two-second reading conflict stays explicit", () => {
  const lead = "Планирование · код и статусы · архив";
  assert(text("./build-titles.mjs").includes(`5: "${lead}"`));
  assert(text("../compositions/scene-t5.html").includes(`text: "${lead}"`));
  const meta = JSON.parse(text("../compositions/scene-t5.meta.json"));
  assert.equal(meta.duration, 2);
  assert.equal(meta.overlay, true);
  assert.equal(words(lead), 5);
  assert(words(lead) / 3 + 1 > meta.duration);
  assert(text("../briefs/voice-685.md").includes("Это STOP для выпуска"));
});
