#!/usr/bin/env python3
# Производные записи сцены 12 (пакет «темп»): нажатия приходятся на фразы медленной озвучки (assets/vo-slow). Исходники не меняются.
# Якоря: (время записи, время сцены[, режим]). Моменты сцены берутся из alignment озвучки функцией T(фраза, n, сдвиг).
# Между якорями запись идёт 1x; лишнее время сцены закрывает стоп-кадр (hold) или замедление ("slow"; ввод текста). Быстрее 1x запись не идёт:
# если времени сцены меньше, чем в записи, вырезается середина (допустимо только на неподвижном участке; скрипт предупреждает).
# Запуск: python3 retime-scene-12.py [имя ...]; печатает data-start, длительность и клики во времени производной записи.
import json, os, subprocess, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ENC = ["-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"]
AL = json.load(open("../vo-slow/scene-12.alignment.json"))
TXT = "".join(AL["characters"]); ST = AL["character_start_times_seconds"]; EN = AL["character_end_times_seconds"]

def T(phrase, n=1, off=0.0):
    i = -1
    for _ in range(n):
        i = TXT.find(phrase, i + 1)
        if i < 0:
            raise SystemExit(f"фраза «{phrase}» ({n}) не найдена")
    return round(ST[i] + off, 2)

# имя: (источник, начало записи, конец записи, якоря)  режим "slow" относится к интервалу ПЕРЕД якорем
SPECS = {
    "scene-12-fix": ("scene-12-fix.mp4", 0.0, 15.7,
        [(1.3, 5.6), (3.96, 7.6), (6.83, 8.9), (8.39, 10.46), (10.66, 12.73), (13.19, 15.26)]),
    # синхрон 11.10: запись идёт по речи «Откройте его, проверьте новую строку и ответьте на замечание»; паузы между событиями (неподвижные участки) сжаты
    "scene-12-mr-updated": ("scene-12-mr-updated.mp4", 0.0, 12.6,
        [(1.02, 23.2), (1.7, 23.9), (4.08, 25.2), (6.2, 25.9), (7.75, 26.8), (8.8, 27.85), (10.05, 29.1), (11.8, 30.85)]),
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
