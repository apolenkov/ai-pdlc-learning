#!/usr/bin/env python3
# Производные записи block-0a (сцены 2, 3, 4): остановка кадра, чтобы нажатия совпали с речью. Исходники не меняются.
import subprocess, os
os.chdir("video/block-0a/film/assets/rec")
ENC = ["-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"]
def run(args): subprocess.run(["ffmpeg", "-loglevel", "error", "-y"] + args, check=True)
def freeze(src, out, m, h):
    n = round(h * 30) - 1
    fc = (f"[0:v]fps=30,split=3[a][f][b];[a]trim=0:{m},setpts=PTS-STARTPTS[a1];"
          f"[f]trim=start={m}:end={m + 0.034},setpts=PTS-STARTPTS,loop=loop={n}:size=1:start=0[f1];"
          f"[b]trim=start={m},setpts=PTS-STARTPTS[b1];[a1][f1][b1]concat=n=3:v=1:a=0[v]")
    run(["-i", src, "-filter_complex", fc, "-map", "[v]"] + ENC + [out])
freeze("scene-03-init.mp4", "scene-03-init.retimed.mp4", 1.8, 1.97)
freeze("scene-03-commit.mp4", "scene-03-commit.retimed.mp4", 2.9, 5.17)
freeze("scene-04-graph.mp4", "scene-04-graph.retimed.mp4", 6.3, 2.63)
run(["-i", "scene-02-copies.mp4", "-i", "scene-02-edit.mp4", "-filter_complex",
     "[0:v]fps=30,trim=0:9.3,setpts=PTS-STARTPTS[a];[1:v]fps=30,trim=1.0:4.5,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]", "-map", "[v]"] + ENC + ["scene-02-copies.retimed.mp4"])
for f in ["scene-03-init", "scene-03-commit", "scene-04-graph", "scene-02-copies"]:
    run(["-i", f + ".retimed.mp4", "-frames:v", "1", f + ".retimed.first.png"])
    d = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f + ".retimed.mp4"]).decode().strip()
    print(f, d)
for f in ["scene-02-newfolder", "scene-04-diff"]:
    run(["-i", f + ".mp4", "-frames:v", "1", f + ".first.png"])
