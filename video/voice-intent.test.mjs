import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { extractSpeech, voInputText } from "./voice-intent.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dry = (...args) => spawnSync("node", [resolve(here, "voice-intent.mjs"), "--dry", ...args], { encoding: "utf8" });

test("extractSpeech: речь без мета-строк, vo-input однострочный", () => {
  const blocks = extractSpeech("# x\n\n**0. Интро** (слов: 3)\n\nРаз. Два.\n\nТри.\n\nНа экране: скетч.\nТермины: а.\n\n**1. Тело** (слов: 1)\n\nЧетыре.\n\n## Оценка\n");
  assert.deepEqual(blocks, [{ id: "0", title: "Интро", text: "Раз. Два. Три." }, { id: "1", title: "Тело", text: "Четыре." }]);
  assert.match(voInputText("2", blocks), /^# Вход озвучки шага 2[^\n]*\n\n\*\*0\. Интро\*\* Раз\. Два\. Три\.\n\n\*\*1\. Тело\*\* Четыре\.\n$/);
});

test("--dry без сети: 4 ролика с числом знаков из раскадровок", () => {
  const r = dry();
  assert.equal(r.status, 0, r.stderr);
  let total = 0;
  for (const film of ["i1", "i2", "i3", "i4"]) {
    const blocks = extractSpeech(readFileSync(resolve(here, `block-${film}/storyboard.md`), "utf8"));
    const chars = blocks.reduce((a, b) => a + b.text.length, 0);
    total += chars;
    assert.match(r.stdout, new RegExp(`^${film}: блоков ${blocks.length} \\([^)]+\\), знаков ${chars}$`, "m"), film);
    const voInput = readFileSync(resolve(here, `block-${film}/film/work/vo-input.md`), "utf8");
    assert.equal(voInput, voInputText(film.slice(1), blocks), `${film}: vo-input из тех же блоков`);
  }
  assert.match(r.stdout, new RegExp(`^итого: блоков \\d+, знаков ${total}$`, "m"));
});

test("--only режет подмножество, мусор отклоняется", () => {
  const r = dry("--only=i2,i3");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^i2: /m);
  assert.match(r.stdout, /^i3: /m);
  assert.doesNotMatch(r.stdout, /^i1: /m);
  assert.doesNotMatch(r.stdout, /^i4: /m);
  const bad = dry("--only=i9");
  assert.equal(bad.status, 1);
});
