import { readFileSync, writeFileSync } from "node:fs";
const film = process.argv[2];
const scenes = JSON.parse(readFileSync(`${film}/scenes.json`, "utf8"));
const terms = JSON.parse(readFileSync(`${film}/terms.json`, "utf8"));
let t = 0;
const placed = scenes.map((s) => {
  const p = { ...s, start: t.toFixed(2).replace(/\.?0+$/, "") };
  t += s.duration;
  return p;
});
const total = t.toFixed(1);
const clips = placed.map((s, i) => {
  const nn = String(s.n).padStart(2, "0");
  return `      <div id="scene-${nn}" class="clip" data-composition-id="scene-${nn}" data-composition-src="compositions/scene-${nn}.html" data-start="${s.start}" data-duration="${s.duration}" data-track-index="${i + 1}"></div>`;
});
const audios = placed.filter((s) => s.audio).map((s, i) => {
  const nn = String(s.n).padStart(2, "0");
  return `      <audio id="vo-${nn}" src="${s.audio}" data-start="${s.start}" data-duration="${s.audioDuration}" data-track-index="${clips.length + i + 1}" data-volume="1"></audio>`;
});
const aligns = scenes.map((s) => `    <script src="assets/vo/scene-${String(s.n).padStart(2, "0")}.alignment.js"></script>`).join("\n");
const html = `<!doctype html>
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <link rel="stylesheet" href="kit/tokens.css" />
    <link rel="stylesheet" href="kit/components.css" />
    <link rel="stylesheet" href="kit/sketch.css" />
    <link rel="stylesheet" href="kit/long.css" />
    <link rel="stylesheet" href="kit/pagewin.css" />
    <script src="assets/gsap.min.js"></script>
${aligns}
    <script>window.KIT_TERMS = ${JSON.stringify(terms)};</script>
    <script src="kit/kit.js"></script>
    <script src="kit/sketch.js"></script>
    <script src="kit/sketches.js"></script>
    <script src="kit/people.js"></script>
    <script src="kit/long.js"></script>
    <script src="kit/pagewin.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--k-bg); }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--k-bg); }
      #bg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
      #grid { position: absolute; left: -128px; top: -128px; width: 2176px; height: 1336px; background-image: linear-gradient(var(--k-grid) 1px, transparent 1px), linear-gradient(90deg, var(--k-grid) 1px, transparent 1px); background-size: 64px 64px; }
      #glow { position: absolute; left: 1100px; top: -380px; width: 1100px; height: 1100px; border-radius: 50%; background: radial-gradient(closest-side, var(--k-glow), transparent); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
      <!-- #grid и #glow намеренно выходят за #bg: это фоновая сетка и свечение, обрезка не нужна -->
      <div id="bg"><div id="grid" data-layout-allow-overflow></div><div id="glow" data-layout-allow-overflow></div></div>
${clips.join("\n")}
${audios.join("\n")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#grid", { x: 0, y: 0 }, { x: -64, y: -64, duration: ${total}, ease: "none" }, 0);
      tl.fromTo("#glow", { x: 0, y: 0 }, { x: -120, y: 80, duration: ${total}, ease: "none" }, 0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
writeFileSync(`${film}/index.html`, html);
console.log(`${film}: index.html, ${scenes.length} сцен, ${total} с`);
