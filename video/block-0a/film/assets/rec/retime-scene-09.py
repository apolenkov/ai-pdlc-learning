#!/usr/bin/env python3
# Производные записи сцены 9 (пакет «темп»): нажатия приходятся на фразы медленной озвучки (assets/vo-slow). Исходники не меняются.
# Якоря: (время записи, время сцены[, режим]). Моменты сцены берутся из alignment озвучки функцией T(фраза, n, сдвиг).
# Между якорями запись идёт 1x; лишнее время сцены закрывает стоп-кадр (hold) или замедление ("slow"; ввод текста). Быстрее 1x запись не идёт:
# если времени сцены меньше, чем в записи, вырезается середина (допустимо только на неподвижном участке; скрипт предупреждает).
# Запуск: python3 retime-scene-09.py [имя ...]; печатает data-start, длительность и клики во времени производной записи.
import json, os, subprocess, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ENC = ["-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"]
AL = json.load(open("../vo-slow/scene-9.alignment.json"))
TXT = "".join(AL["characters"]); ST = AL["character_start_times_seconds"]; EN = AL["character_end_times_seconds"]

def T(phrase, n=1, off=0.0):
    i = -1
    for _ in range(n):
        i = TXT.find(phrase, i + 1)
        if i < 0:
            raise SystemExit(f"фраза «{phrase}» ({n}) не найдена")
    return round(ST[i] + off, 2)

# опорные моменты озвучки (vo-slow, шаг 9): нажатия приходятся на фразы
B = T("Добавьте пункт")   # правка строки и далее Commit / Publish Branch
C = T("Откройте проект")  # запись GitLab

# имя: (источник, начало записи, конец записи, якоря)  режим "slow" относится к интервалу ПЕРЕД якорем
SPECS = {
    "scene-09-push": ("scene-09-push.mp4", 0.0, 13.4,
        [(1.14, B + 0.3), (3.18, B + 1.7), (5.48, B + 3.0), (6.88, B + 4.3), (8.84, B + 6.26), (11.24, B + 8.7)]),
    "scene-09-gitlab-branch": ("scene-09-gitlab-branch.mp4", 5.3, 9.0,
        [(5.4, C + 1.84), (6.24, C + 4.04, "slow"), (8.0, C + 5.8)],
        [(5.4, 436, 276, "limit-rows"), (6.24, 594, 571, "intent.md")]),
}
SUFFIX = ".slow"

def plan(rec_start, rec_end, anchors, name):
    segs = []  # (a, b, factor, hold)
    segs.append((rec_start, anchors[0][0], 1.0, 0.0))
    for i in range(len(anchors) - 1):
        a, b = anchors[i][0], anchors[i + 1][0]
        mode = anchors[i + 1][2] if len(anchors[i + 1]) > 2 else "hold"
        L, R = anchors[i + 1][1] - anchors[i][1], b - a
        if L <= 0:
            raise SystemExit(f"{name}: якоря {a}->{b}: время сцены не растёт")
        if abs(L - R) < 0.05:
            segs.append((a, b, 1.0, 0.0))
        elif L > R and mode == "slow":
            segs.append((a, b, L / R, 0.0))
        elif L > R:
            segs.append((a, b, 1.0, L - R))
        else:
            print(f"  ВЫРЕЗ {name}: запись {a}-{b} ({R:.2f} с) сжата до {L:.2f} с — проверьте, что участок неподвижен")
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
    for (a, b, f, h), s in reversed(list(zip(segs, st))):
        if a - 1e-6 <= t <= b + 1e-6:
            return s + (t - a) * f
    for (a, b, f, h), s in zip(segs, st):
        if t < a:
            return s
    return st[-1]

def build(name):
    src, rs, re_, anchors, *extra = SPECS[name]
    segs = plan(rs, re_, anchors, name)
    st, total = starts(segs)
    parts, labels = [], ""
    for i, (a, b, f, h) in enumerate(segs):
        flt = f"[0:v]fps=30,trim=start={a:.3f}:end={b:.3f},setpts=(PTS-STARTPTS)*{f:.4f}"
        if h > 0:
            flt += f",tpad=stop_mode=clone:stop_duration={h:.3f}"
        parts.append(flt + f"[v{i}]"); labels += f"[v{i}]"
    fc = ";".join(parts) + f";{labels}concat=n={len(segs)}:v=1:a=0[v]"
    out = name + SUFFIX + ".retimed.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[v]"] + ENC + [out], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", out, "-frames:v", "1", name + SUFFIX + ".retimed.first.png"], check=True)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).decode())
    a0 = anchors[0]
    data_start = a0[1] - derived(segs, a0[0])
    print(f"{name}: data-start={data_start:.2f} длительность={dur:.2f} (расчёт {total:.2f}) конец записи в сцене={data_start + dur:.2f}")
    if extra:
        clicks = [{"t": t, "x": x, "y": y, "label": lb} for t, x, y, lb in extra[0]]
    else:
        try:
            clicks = json.load(open(name + ".clicks.json"))
        except FileNotFoundError:
            clicks = []
    ck = [{"t": round(derived(segs, c["t"]), 2), "x": c["x"], "y": c["y"], "label": c.get("label", ""), "scene": round(derived(segs, c["t"]) + data_start, 2)} for c in clicks if rs - 1e-6 <= c["t"] <= re_ + 1e-6]
    print("  клики (время производной записи; scene = момент в сцене):")
    for c in ck: print("   ", json.dumps(c, ensure_ascii=False))
    print("  якоря в сцене:", [(r, round(derived(segs, r) + data_start, 2)) for r, *_ in anchors])

for n in (sys.argv[1:] or SPECS):
    build(n)
