#!/usr/bin/env python3
# Сцена 3 (ролик 2, v3): производные записи под озвучку assets/vo/scene-3.* (речь 18,67 с). Исходники не меняются.
# Якорь = (t записи, t сцены): кадр записи ПЕРЕД действием показан в момент сцены; до него держится (hold), дальше идёт 1x.
# Ускорять запись нельзя: лишнее время — остановка кадра; вырезать можно только явно названный неподвижный участок (третий элемент якоря).
# Моменты сцены из озвучки: «нажмите» 1,69; «Repository» 3,33-3,85; «Запись» 10,41; «Напишите» 12,71; «Первая» 13,89; второй «Коммит» 16,11.
# Запуск: python3 retime-scene-03.py [имя ...]
import json, os, subprocess, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ENC = ["-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"]

# имя: (источник, начало записи, конец записи, якоря [(t записи, t сцены[, (вырез от, вырез до)])])
SPECS = {
    # init: 1,15 клик Source Control (сразу после заставки, 2,0 с), 2,77 клик Initialize Repository (на «Repository»+0,3); дальше список изменений, запись кончается на 4,4
    "scene-03-init": ("scene-03-init.mp4", 0.0, 4.4,
        [(1.15, 2.00), (2.77, 3.65)]),
    # commit: 1,79 клик Stage (11,5), 3,2 клик в поле сообщения (12,95), 3,3 текст вставлен (на «Первая»), 4,54 клик Commit (на втором «Коммит»);
    # после Commit запись идёт 1x до 9,0 (в записи дальше открывается терминал: он в ролик не входит)
    "scene-03-commit": ("scene-03-commit.mp4", 0.0, 9.0,
        [(1.79, 10.90), (3.20, 12.95), (3.30, 13.90), (4.54, 16.60)]),
}

def plan(rec_start, rec_end, anchors):
    segs = [(rec_start, anchors[0][0], 1.0, 0.0)]  # (a, b, коэффициент, hold)
    for A, B in zip(anchors, anchors[1:]):
        (a, sa), (b, sb) = A[:2], B[:2]
        cut = B[2] if len(B) > 2 else None
        L, R = sb - sa, b - a
        if cut:
            R -= cut[1] - cut[0]
            if L < R - 0.05:
                raise SystemExit(f"интервал {a}-{b} даже после выреза длиннее сцены ({R:.2f} > {L:.2f})")
            segs.append((a, cut[0], 1.0, 0.0)); segs.append((cut[1], b, 1.0, max(0.0, L - R)))
            continue
        if L < R - 0.05:
            raise SystemExit(f"интервал записи {a}-{b} длиннее сцены ({R:.2f} > {L:.2f}): пришлось бы ускорять")
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
    for (a, b, f, h), s in reversed(list(zip(segs, st))):   # на границе берём следующий кусок (после hold)
        if a - 1e-6 <= t <= b + 1e-6:
            return s + (t - a) * f
    for (a, b, f, h), s in zip(segs, st):                  # попал в вырезанный участок: ближайший следующий кусок
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
    out = name + ".v3.retimed.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[v]"] + ENC + [out], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", out, "-frames:v", "1", name + ".v3.retimed.first.png"], check=True)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).decode())
    data_start = anchors[0][1] - derived(segs, anchors[0][0])
    print(f"{name}: data-start={data_start:.2f} длительность={dur:.2f} (расчёт {total:.2f})")
    try:
        clicks = json.load(open(name + ".clicks.json"))
    except FileNotFoundError:
        clicks = []
    print("  клики (время производной записи):", json.dumps([{"t": round(derived(segs, c["t"]), 2), "x": c["x"], "y": c["y"], "label": c.get("label", "")} for c in clicks], ensure_ascii=False))
    print("  якоря в сцене:", [(r, round(derived(segs, r) + data_start, 2)) for r, *_ in anchors])

for n in (sys.argv[1:] or SPECS):
    build(n)
