#!/usr/bin/env python3
"""TASK-911 (v6): remove «Среда и контуры» from the overview film sources (scene 5 and the page image).

Run once on a fresh copy of the v5b film directory (argv[1]), then: tools/make-sfx.mjs, wrap-scene.mjs, build-index.mjs,
make-vtt.mjs, make-chapters.mjs, `scene.mjs 5|6 check|render`, and work/v6/assemble.sh (expects pub.mp4 = the v5b web
cut 8045d033 and film/ next to it). The sources in Git are already the result; the script records how they were made.
"""
import json, re, subprocess, sys
from pathlib import Path
from PIL import Image, JpegImagePlugin

film = Path(sys.argv[1])
CUT_A, CUT_B = 6.80, 11.70          # seconds inside scene 5 voice: mid-pauses around the removed sentence
CUT = round(CUT_B - CUT_A, 3)       # 4.9 s = 147 frames at 30 fps
XF = 0.01                           # 10 ms crossfade at the join: the joined voice is CUT + XF shorter
Y0, Y1 = 2520, 3229                 # page units (1 unit = 2 image px): analysis bottom .. env bottom
DY = Y1 - Y0                        # 709

# 1. Page image without the section.
img_path = film / "assets/page/page.jpg"
im = Image.open(img_path)
assert im.size == (3328, 8220), im.size
top = im.crop((0, 0, 3328, Y0 * 2)); bottom = im.crop((0, Y1 * 2, 3328, 8220))
out = Image.new("RGB", (3328, 8220 - DY * 2)); out.paste(top, (0, 0)); out.paste(bottom, (0, Y0 * 2))
out.save(img_path, qtables=im.quantization, subsampling=JpegImagePlugin.get_sampling(im), optimize=True)

# 1b. The page layer has the image height in CSS units: 4110 → 3401.
css = film / "kit/pagewin.css"; s = css.read_text()
H = (8220 - DY * 2) // 2
s2 = s.replace("height: 4110px", f"height: {H}px")
assert s2.count(f"height: {H}px") == 2, "expected layer and image heights"; css.write_text(s2)

# 2. Rectangles of the page template.
pw = film / "kit/pagewin.js"; s = pw.read_text()
s2 = re.sub(r"\n    env(?:TL|TR|BL|BR)?: \{[^}]*\},", "", s)
s2 = s2.replace("help: { x: 256, y: 3277,", f"help: {{ x: 256, y: {3277 - DY},")
assert s2 != s and "env" not in re.findall(r"const R = \{.*?\n  \};", s2, re.S)[0]
pw.write_text(s2)

# 3. Scene 5: no env stop; help stop moves up by DY.
p5 = film / "work/scenes/05.js"
p5.write_text(f"""// сцена 5 · Разделы страницы · камера проходит по секциям: намерение → анализ → справка
const {{ R }} = PageWin;
const W = PageWin.begin(L, {{ cam: {{ Y: 969, s: 1.15 }}, spot: R.enR }});
const S1 = {{ Y: 1640, s: 1.1 }}, S2 = {{ Y: 2043, s: 1.1 }}, S5 = {{ Y: {3247 - DY}, s: 1.1 }};
W.moveCam(0, 1.0, S1);
W.hopSpot(R.intent, 0.05, 1.0);
const na = t("Намерение");
W.call("Намерение и план", {{ to: [1150, 1718], side: "center", cam: S1, at: na - 0.05, until: t("Анализ") - 0.25 }});
const an = t("Анализ");
W.moveCam(an - 0.7, 0.7, S2);
W.hopSpot(R.analysis, an - 0.7, an);
W.call("Анализ", {{ to: [1150, 2160], side: "center", cam: S2, at: an, until: t("гайды") - 0.3 }});
const hp = t("Внизу");
W.call("Гайды и курсы", {{ to: [1150, 2160], side: "center", cam: S2, at: t("гайды"), until: hp - 0.9 }});
W.moveCam(hp - 0.7, 0.7, S5);
W.hopSpot(R.help, hp - 0.7, hp);
W.call("Справка", {{ to: [1150, {3332 - DY}], side: "center", cam: S5, at: hp, until: t("всех") - 0.3 }});
W.call("Для всех ролей", {{ to: [1150, {3332 - DY}], side: "center", cam: S5, at: t("всех"), until: t("Где") - 0.2 }});
W.call("В работе", {{ to: [1450, {3856 - DY}], side: "center", cam: S5, notail: true, at: t("Где") + 0.1, until: DUR - 0.8 }});
""")

# 4. Scene 6 starts where scene 5 ends.
p6 = film / "work/scenes/06.js"; s = p6.read_text()
s2 = s.replace("камера Y 3247", f"камера Y {3247 - DY}").replace("cam: { Y: 3247, s: 1.1 }", f"cam: {{ Y: {3247 - DY}, s: 1.1 }}")
assert s2.count(str(3247 - DY)) == 2; p6.write_text(s2)

# 5. Voice of scene 5 without the sentence; alignment shifted by the same cut.
vo = film / "assets/vo"
src = vo / "scene-05.mp3"; tmp = vo / "scene-05.new.mp3"
v3 = film / "assets/vo-v3"
orig_mp3 = src.read_bytes(); orig_align = (vo / "scene-05.alignment.json").read_bytes()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-filter_complex",
                f"[0]atrim=0:{CUT_A},asetpts=N/SR/TB[a];[0]atrim={CUT_B},asetpts=N/SR/TB[b];[a][b]acrossfade=d={XF}:c1=tri:c2=tri[o]",
                "-map", "[o]", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", str(tmp)], check=True)
tmp.replace(src)
aj = vo / "scene-05.alignment.json"; a = json.loads(aj.read_text())
chars, st, en = a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]
text = "".join(chars)
i0 = text.index("«Среда"); i1 = text.index("Внизу")
assert text[i0:i1].endswith("границы среды. ")
keep = [k for k in range(len(chars)) if not (i0 <= k < i1)]
def shift(x):  # chars after the cut move back by everything the join removed (the cut ends before «Внизу» starts)
    return round(x - CUT - XF, 4) if x >= CUT_B else x
a = {"characters": [chars[k] for k in keep],
     "character_start_times_seconds": [shift(st[k]) for k in keep],
     "character_end_times_seconds": [shift(en[k]) for k in keep]}
new_text = "".join(a["characters"])
assert "Среда" not in new_text and "курсы. Внизу" in new_text, new_text
aj.write_text(json.dumps(a, ensure_ascii=False))
(vo / "scene-05.alignment.js").write_text('window.ALIGN = window.ALIGN || {};\nwindow.ALIGN["05"] = ' + json.dumps(a, ensure_ascii=False) + ";\n")
# The voice tool (video/voice-landing.mjs) copies assets/vo-v3/block-5.* over scene-05.*: the block source gets the same cut.
assert (v3 / "block-5.mp3").read_bytes() == orig_mp3 and (v3 / "block-5.alignment.json").read_bytes() == orig_align, "vo-v3 block 5 is not the v5b scene 5"
(v3 / "block-5.mp3").write_bytes(src.read_bytes()); (v3 / "block-5.alignment.json").write_bytes(aj.read_bytes())
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)],
                           capture_output=True, text=True, check=True).stdout)

# 6. Scene list: scene 5 shorter by the cut, frame-aligned.
sj = film / "scenes.json"; scenes = json.loads(sj.read_text())
s5 = next(x for x in scenes if x["n"] == 5)
s5["duration"] = round(s5["duration"] - CUT, 2); s5["audioDuration"] = round(dur, 2)
sj.write_text(json.dumps(scenes, ensure_ascii=False, indent=2) + "\n")

# 7. Voice text.
vi = film / "work/vo-input.md"; s = vi.read_text()
s2 = s.replace(" «Среда и контуры» — в чём работает команда и где проходят границы среды.", "")
assert s2 != s; vi.write_text(s2)
# 8. Sound plan: no events for the removed callouts.
ms = film / "tools/make-sfx.mjs"; s = ms.read_text()
for key in ('t(5, "Среда") - 0.7', 't(5, "Среда"), "pop"', 't(5, "границы")'):
    s2 = "".join(l for l in s.splitlines(keepends=True) if key not in l); assert s2 != s, key; s = s2
ms.write_text(s)
print(json.dumps({"cut": CUT, "scene5": s5, "voice": round(dur, 3), "page": out.size, "text": new_text}, ensure_ascii=False))
