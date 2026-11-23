// Самопроверка vo-gaps.mjs на синтетическом звуке: тон + тишина известной длины и выравнивание к нему.
//   node tools/test-vo-gaps.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findGaps } from "./vo-gaps.mjs";

const dir = mkdtempSync(join(tmpdir(), "vo-gaps-"));
/** parts: [секунды, звук?] подряд → wav */
const wav = (name, parts) => {
  const args = ["-v", "error", "-y"];
  parts.forEach(([d, tone]) => args.push("-f", "lavfi", "-i", tone ? `sine=f=440:d=${d}` : `anullsrc=r=44100:cl=mono:d=${d}`));
  const f = join(dir, name);
  execFileSync("ffmpeg", [...args, "-filter_complex", `${parts.map((_, i) => `[${i}:a]aresample=44100,aformat=channel_layouts=mono[a${i}]`).join(";")};${parts.map((_, i) => `[a${i}]`).join("")}concat=n=${parts.length}:v=0:a=1`, f]);
  return f;
};
/** symbols: [символ, начало, конец] */
const align = (symbols) => ({ characters: symbols.map((s) => s[0]), character_start_times_seconds: symbols.map((s) => s[1]), character_end_times_seconds: symbols.map((s) => s[2]) });

try {
  // «аб вг. де»: 180 мс между словами (разрыв), 300 мс после точки (пауза на знаке).
  const a = findGaps(wav("a.wav", [[0.4, 1], [0.18, 0], [0.4, 1], [0.3, 0], [0.4, 1]]), align([["а", 0, 0.2], ["б", 0.2, 0.4], [" ", 0.4, 0.58], ["в", 0.58, 0.7], ["г", 0.7, 0.88], [".", 0.88, 0.98], [" ", 0.98, 1.28], ["д", 1.28, 1.48], ["е", 1.48, 1.68]]));
  assert.equal(a.findings.length, 1, JSON.stringify(a));
  assert.equal(a.findings[0].kind, "off");
  assert.ok(Math.abs(a.findings[0].ms - 180) < 25, String(a.findings[0].ms));
  assert.equal(a.punct.length, 1);
  assert.equal(a.punct[0].sentence, true);
  assert.ok(Math.abs(a.punct[0].ms - 300) < 25);

  // 150 мс внутри слова «аб», знаков рядом нет: находка.
  const b = findGaps(wav("b.wav", [[0.2, 1], [0.15, 0], [0.3, 1]]), align([["а", 0, 0.2], ["б", 0.35, 0.65]]));
  assert.equal(b.findings.length, 1, JSON.stringify(b));
  assert.equal(b.findings[0].kind, "off");

  // Межсловная 90 мс — естественная, не находка.
  const w = findGaps(wav("w.wav", [[0.3, 1], [0.09, 0], [0.3, 1]]), align([["а", 0, 0.3], [" ", 0.3, 0.39], ["б", 0.39, 0.69]]));
  assert.deepEqual(w, { findings: [], punct: [] });

  // Запятая 130 мс — не находка, а пауза на знаке; сплошная речь без тишины — пусто.
  const c = findGaps(wav("c.wav", [[0.3, 1], [0.13, 0], [0.3, 1]]), align([["а", 0, 0.3], [",", 0.3, 0.33], [" ", 0.33, 0.43], ["б", 0.43, 0.73]]));
  assert.equal(c.findings.length, 0, JSON.stringify(c));
  assert.equal(c.punct.length, 1);
  assert.equal(c.punct[0].sentence, false);
  assert.deepEqual(findGaps(wav("d.wav", [[1, 1]]), align([["а", 0, 0.5], ["б", 0.5, 1]])), { findings: [], punct: [] });
  console.log("vo-gaps: ok");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
