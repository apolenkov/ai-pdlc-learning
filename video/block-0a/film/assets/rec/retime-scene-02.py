#!/usr/bin/env python3
# Производные записи сцены 2 для медленной озвучки (пакет «темп»). Копия логики retime-scenes-02-03-04.py; общий скрипт не правится.
# Якоря: (t записи, t сцены). Между якорями запись идёт ровно 1x, лишнее время добавляется остановкой кадра (hold) в конце интервала,
# то есть перед следующим действием. Вырезать (L < R) нельзя: это было бы ускорением. Выход: <имя>.slow.retimed.mp4 и .first.png.
import json, os, subprocess, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ENC = ["-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"]

# имя: (источник, начало записи, конец записи, якоря [(t записи, t сцены)], нажатия (время записи))
# Якорь — момент действия: до него держится кадр «до», после него идёт результат (1x). Интервал между якорями = время показа результата.
SPECS = {
    # copies = scene-02-copies.retimed.mp4 (копии 0-9,3 с + правка 1,0-4,5 с, склейка 1x). Действия: 1,03 клик intent.md, 1,74 F2, 2,68 Enter (intent-1.md),
    # 5,38 вставка копии, 7,27 клик по копии, 7,93 F2, 8,85 Enter (intent-2.md), 9,32 клик intent-2.md, 10,39 клик в строку (ввод 10,47-12,0).
    # Участок 3,2-5,2 неподвижен (нет активности): вырезается явно. Запись кончается после ввода строки (12,1 с): клик intent-1.md (12,28) не нужен.
    "scene-02-copies": ("scene-02-copies.retimed.mp4", 0.0, 12.1,
        [(1.03, 5.5), (1.74, 6.4), (2.68, 7.9), (5.38, 8.8, (3.2, 5.2)), (7.27, 10.7), (7.93, 11.4), (8.85, 12.3),
         (9.32, 13.3), (10.39, 14.5)],
        [{"t": 1.03, "x": 236, "y": 125, "label": "intent.md"}, {"t": 7.27, "x": 236, "y": 125, "label": "intent-1 copy.md"},
         {"t": 9.32, "x": 236, "y": 151, "label": "intent-2.md"}, {"t": 10.39, "x": 1576, "y": 295, "label": "строка"}]),
    # compare (новая запись, крупный шрифт): 1,16 клик intent-1.md; 3-5 палитра команд (Compare Active File With...), 7,0 выбор intent-2.md, 7,3 открылось сравнение, до 13,4 держится.
    "scene-02-compare": ("scene-02-compare.mp4", 0.0, 13.4,
        [(1.16, 21.8), (7.0, 33.0)],
        [{"t": 1.16, "x": 370, "y": 150, "label": "intent-1.md"}, {"t": 7.0, "x": 962, "y": 115, "label": "intent-2.md"}]),
    # newfolder: 1,86 клик New Folder, 3,04 имя введено (Enter), 4,64 клик intent.md, 6,25 перенос в с-git
    "scene-02-newfolder": ("scene-02-newfolder.mp4", 0.0, 8.0,
        [(1.86, 48.8), (3.04, 50.2), (4.64, 51.9), (6.25, 53.5), (8.0, 55.3)],
        [{"t": 1.88, "x": 336, "y": 95, "label": "New Folder"}, {"t": 4.64, "x": 236, "y": 151, "label": "intent.md"},
         {"t": 6.25, "x": 236, "y": 125, "label": "с-git"}]),
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
    src, rs, re_, anchors, clicks = SPECS[name]
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
    print("  клики (время производной записи):", json.dumps([{"t": round(derived(segs, c["t"]), 2), "x": c["x"], "y": c["y"], "label": c.get("label", "")} for c in clicks], ensure_ascii=False))
    print("  якоря в сцене:", [(a[0], round(derived(segs, a[0]) + data_start, 2)) for a in anchors])

for n in (sys.argv[1:] or SPECS):
    build(n)
