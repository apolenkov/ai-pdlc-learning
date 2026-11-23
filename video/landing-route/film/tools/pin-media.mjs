#!/usr/bin/env node
// Пины ролика по готовым файлам: ../video-manifest.json и ../MEDIA.sha256 (пути — как на диске, `shasum -c` проходит из video/landing-route).
//   node tools/pin-media.mjs              после tools/assemble.sh, make-vtt и make-chapters; постер копируется в ../landing-route-poster.webp
// Плеер главной (TASK-923) берёт из манифеста url mp4, постер, субтитры и главы; у каждого файла — sha256 и размер.
import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const film = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(film, "..");
const MEDIA_RELEASE = "https://github.com/apolenkov/ai-pdlc-learning/releases/download/media-v1"; // как scripts/media-release.ts
const sha = (rel) => createHash("sha256").update(readFileSync(resolve(dir, rel))).digest("hex");
const pin = (rel) => ({ file: rel.split("/").pop(), sha256: sha(rel), size: statSync(resolve(dir, rel)).size });
const cues = (rel) => (readFileSync(resolve(dir, rel), "utf8").match(/-->/g) ?? []).length;

copyFileSync(resolve(film, "renders/final/landing-route-poster.webp"), resolve(dir, "landing-route-poster.webp"));
const scenes = JSON.parse(readFileSync(resolve(film, "scenes.json"), "utf8"));
const duration = Number(scenes.reduce((a, s) => a + s.duration, 0).toFixed(3));
const WEB = "film/renders/final/landing-route-720p.mp4", MASTER = "film/renders/final/landing-route-1080p.mp4";
const web = pin(WEB), master = pin(MASTER);
const old = JSON.parse(readFileSync(resolve(dir, "video-manifest.json"), "utf8"));

const manifest = {
  file: "landing-route.mp4",
  sha256: web.sha256,
  size: web.size,
  url: `${MEDIA_RELEASE}/${web.sha256.slice(0, 12)}-landing-route.mp4`,
  version: web.sha256.slice(0, 12),
  audio: "voice-only",
  master: { file: "landing-route-1080p.mp4", sha256: master.sha256, size: master.size, version: master.sha256.slice(0, 12), note: "мастер 1080p в релиз не выкладывается; веб-версию собирает из него tools/assemble.sh" },
  poster: pin("landing-route-poster.webp"),
  tracks: {
    captions: { ...pin("landing-route.vtt"), kind: "captions", srclang: "ru" },
    chapters: { ...pin("landing-route.chapters.vtt"), kind: "chapters", srclang: "ru" },
    chaptersJson: pin("landing-route.chapters.json"),
  },
  duration,
  captions: cues("landing-route.vtt"),
  chapters: cues("landing-route.chapters.vtt"),
  note: old.note,
};
writeFileSync(resolve(dir, "video-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const lines = [];
for (const s of scenes) {
  const nn = String(s.n).padStart(2, "0");
  for (const ext of ["mp3", "alignment.json"]) lines.push(`film/assets/vo/scene-${nn}.${ext}`);
}
lines.push(WEB, MASTER, "landing-route-poster.webp", "landing-route.vtt", "landing-route.chapters.vtt", "landing-route.chapters.json");
writeFileSync(resolve(dir, "MEDIA.sha256"), lines.map((rel) => `${sha(rel)}  ./${rel}`).join("\n") + "\n");
console.log(`pin-media: ${manifest.version}, ${duration} с, ${manifest.captions} реплик, ${manifest.chapters} глав`);
