#!/usr/bin/env python3
# Производные записи block-0a (сцены 5-14): нажатия приходятся на фразы диктора. Исходники не меняются.
# Для каждой записи задан список якорей (время записи -> время сцены). Между якорями: если в сцене больше времени, чем в записи,
# последний кадр держится (hold) или кусок замедляется (slow); если меньше, середина вырезается.
# Запуск: python3 retime-scenes-05-14.py [имя ...]; печатает data-start, длительность и клики во времени производной записи.
import json, os, subprocess, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ENC = ["-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"]

# имя: (источник, начало записи, конец записи, якоря [(t записи, t сцены, "hold"|"slow")])  режим относится к интервалу ПЕРЕД якорем
SPECS = {
    "scene-05-ignore": ("scene-05-ignore.mp4", 1.0, 15.9,
        [(1.8, 4.0), (5.44, 7.5), (7.65, 11.3), (8.92, 12.5), (11.26, 13.9), (15.62, 16.0)]),
    "scene-06-branch": ("scene-06-branch.mp4", 0.0, 15.0,
        [(1.13, 5.7), (2.76, 7.35), (3.95, 9.8), (5.68, 12.9), (5.85, 13.5), (7.72, 15.4), (11.46, 16.2), (14.12, 17.0)]),
    "scene-07-merge": ("scene-07-merge.mp4", 0.0, 4.5,
        [(0.9, 9.8), (2.55, 14.3), (2.85, 14.6)]),
    "scene-09-push": ("scene-09-push.mp4", 0.0, 11.3,
        [(1.14, 8.1), (1.4, 9.7), (3.18, 11.4), (5.48, 12.0), (8.84, 13.0), (11.2, 14.9)]),
    "scene-09-gitlab-branch": ("scene-09-gitlab-branch.mp4", 4.6, 9.0,
        [(5.4, 20.6), (6.24, 21.4), (8.0, 22.3)]),
    "scene-10-new-mr": ("scene-10-new-mr.mp4", 6.0, 18.75,
        [(6.9, 9.2), (11.07, 14.6), (12.06, 15.4), (14.01, 17.3), (17.25, 18.9)]),
    "scene-11-comment": ("scene-11-comment.mp4", 5.4, 9.9,
        [(6.2, 4.8), (7.3, 5.9), (7.7, 7.1, "slow"), (8.77, 11.4)]),
    "scene-12-fix": ("scene-12-fix.mp4", 0.0, 13.6,
        [(1.3, 4.0), (1.7, 5.2), (2.25, 6.6, "slow"), (3.96, 9.9), (6.83, 10.4), (10.66, 11.3), (13.19, 12.2)]),
    "scene-12-mr-updated": ("scene-12-mr-updated.mp4", 0.0, 8.6,
        [(1.02, 17.4), (4.08, 18.7), (7.75, 19.55)]),
    "scene-13-merge": ("scene-13-merge.mp4", 0.3, 15.6,
        [(2.63, 10.1), (6.8, 11.9), (9.6, 12.4), (11.11, 13.4), (14.47, 14.6), (14.9, 15.0)]),
    "scene-14-pull": ("scene-14-pull.mp4", 7.0, 15.56,
        [(8.19, 6.9)]),
}

def plan(rec_start, rec_end, anchors):
    segs = []  # (a, b, factor, hold)
    a0 = anchors[0]
    segs.append((rec_start, a0[0], 1.0, 0.0))
    for i in range(len(anchors) - 1):
        a, b = anchors[i][0], anchors[i + 1][0]
        mode = anchors[i + 1][2] if len(anchors[i + 1]) > 2 else "hold"
        L, R = anchors[i + 1][1] - anchors[i][1], b - a
        if abs(L - R) < 0.05:
            segs.append((a, b, 1.0, 0.0))
        elif L > R and mode == "slow":
            segs.append((a, b, L / R, 0.0))
        elif L > R:
            segs.append((a, b, 1.0, L - R))
        else:
            p = L * 0.55; q = L - p
            segs.append((a, a + p, 1.0, 0.0)); segs.append((b - q, b, 1.0, 0.0))
    segs.append((anchors[-1][0], rec_end, 1.0, 0.0))
    return [s for s in segs if s[1] - s[0] > 0.02]

def starts(segs):
    out, cur = [], 0.0
    for a, b, f, h in segs:
        out.append(cur); cur += (b - a) * f + h
    return out, cur

def derived(segs, t):
    st, _ = starts(segs)
    for (a, b, f, h), s in reversed(list(zip(segs, st))):   # на границе берём следующий кусок (после hold)
        if a - 1e-6 <= t <= b + 1e-6:
            return s + (t - a) * f
    for (a, b, f, h), s in zip(segs, st):   # попал в вырезанный участок: ближайший следующий кусок
        if t < a:
            return s
    return st[-1]

def build(name):
    src, rs, re_, anchors = SPECS[name]
    segs = plan(rs, re_, anchors)
    st, total = starts(segs)
    parts, labels = [], ""
    for i, (a, b, f, h) in enumerate(segs):
        flt = f"[0:v]fps=30,trim=start={a:.3f}:end={b:.3f},setpts=(PTS-STARTPTS)*{f:.4f}"
        if h > 0:
            flt += f",tpad=stop_mode=clone:stop_duration={h:.3f}"
        parts.append(flt + f"[v{i}]"); labels += f"[v{i}]"
    fc = ";".join(parts) + f";{labels}concat=n={len(segs)}:v=1:a=0[v]"
    out = name + ".retimed.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[v]"] + ENC + [out], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", out, "-frames:v", "1", name + ".retimed.first.png"], check=True)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).decode())
    a0 = anchors[0]
    data_start = a0[1] - derived(segs, a0[0])
    print(f"{name}: data-start={data_start:.2f} длительность={dur:.2f} (расчёт {total:.2f})")
    try:
        clicks = json.load(open(name + ".clicks.json"))
    except FileNotFoundError:
        clicks = []
    print("  клики (время производной записи):", json.dumps([{"t": round(derived(segs, c["t"]), 2), "x": c["x"], "y": c["y"], "label": c.get("label", "")} for c in clicks], ensure_ascii=False))
    print("  якоря в производной:", [(r, round(derived(segs, r) + data_start, 2)) for r, *_ in anchors])

for n in (sys.argv[1:] or SPECS):
    build(n)
