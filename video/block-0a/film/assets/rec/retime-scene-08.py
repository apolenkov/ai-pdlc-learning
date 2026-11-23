#!/usr/bin/env python3
# Производные записи сцены 6 для медленной озвучки (пакет «темп»). Копия логики retime-scenes-05-14.py; общий скрипт не правится.
# Якоря: (t записи, t сцены). Между якорями запись идёт ровно 1x, лишнее время добавляется остановкой кадра (hold) в конце интервала,
# то есть перед следующим действием. Вырезать (L < R) нельзя: это было бы ускорением. Выход: <имя>.slow.retimed.mp4 и .first.png.
import json, os, subprocess, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ENC = ["-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"]

# имя: (источник, начало записи, конец записи, якоря [(t записи, t сцены)])
SPECS = {
    # сцена 8: терминал открывается на 3.83 с записи, команда git remote -v с результатом появляется на 6.43 с (на «ключом v», 39.43 в сцене);
    # результат держится до конца сцены-плана (47.5): запись дополнена остановкой кадра, чтобы клип не кончался раньше плана
    "scene-08-remote": ("scene-08-remote.mp4", 0.0, 11.3,
        [(6.43, 39.43), (11.3, 47.5)]),
}

def plan(rec_start, rec_end, anchors):
    segs = [(rec_start, anchors[0][0], 1.0, 0.0)]  # (a, b, коэффициент, hold)
    for A, B in zip(anchors, anchors[1:]):
        (a, sa), (b, sb) = A[:2], B[:2]
        cut = B[2] if len(B) > 2 else None   # вырезать можно только явно названный неподвижный участок записи
        L, R = sb - sa, b - a
        if cut:
            R -= cut[1] - cut[0]
            if L < R - 0.05:
                raise SystemExit(f"интервал {a}-{b} даже после выреза длиннее сцены")
            segs.append((a, cut[0], 1.0, 0.0)); segs.append((cut[1], b, 1.0, max(0.0, L - R)))
            continue
        if L < R - 0.05:
            raise SystemExit(f"интервал записи {a}-{b} длиннее сцены ({R:.2f} > {L:.2f}): пришлось бы вырезать или ускорять")
        segs.append((a, b, 1.0, max(0.0, L - R)))
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
    out = name + ".slow.retimed.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[v]"] + ENC + [out], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", out, "-frames:v", "1", name + ".slow.retimed.first.png"], check=True)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).decode())
    data_start = anchors[0][1] - derived(segs, anchors[0][0])
    print(f"{name}: data-start={data_start:.2f} длительность={dur:.2f} (расчёт {total:.2f})")
    clicks = json.load(open(name + ".clicks.json"))
    print("  клики (время производной записи):", json.dumps([{"t": round(derived(segs, c["t"]), 2), "x": c["x"], "y": c["y"], "label": c.get("label", "")} for c in clicks], ensure_ascii=False))
    print("  якоря в сцене:", [(a[0], round(derived(segs, a[0]) + data_start, 2)) for a in anchors])

for n in (sys.argv[1:] or SPECS):
    build(n)
