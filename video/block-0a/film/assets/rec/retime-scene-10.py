#!/usr/bin/env python3
# Ролик 2 (Markdown и Git), сцена 10: производная запись под озвучку assets/vo/scene-10.alignment.json. Исходники не меняются.
# Якоря: (время записи, время сцены[, (с, по) — вырезаемый неподвижный участок записи перед якорем]). Моменты сцены берёт T(фраза, n, сдвиг) из alignment.
# Запись идёт строго 1x: лишнее время закрывает стоп-кадр (hold); вырезать можно только явно названный неподвижный участок. Ускорения нет.
# Выход: <имя>.retimed.mp4 и <имя>.retimed.first.png (poster); скрипт печатает data-start, длительность и клики во времени производной.
# Запуск: python3 retime-scene-10.py [имя ...]
import json, os, subprocess, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ENC = ["-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"]

def load_align(n):
    al = json.load(open(f"../vo/scene-{n}.alignment.json"))
    return "".join(al["characters"]), al["character_start_times_seconds"]

def T(al, phrase, n=1, off=0.0):
    txt, st = al
    i = -1
    for _ in range(n):
        i = txt.find(phrase, i + 1)
        if i < 0:
            raise SystemExit(f"фраза «{phrase}» ({n}) не найдена в озвучке")
    return round(st[i] + off, 2)

def plan(rec_start, rec_end, anchors):
    # сегмент: (с, по, коэффициент 1.0, hold); ускорения нет, вырезать можно только явно названный неподвижный участок (третий элемент якоря)
    segs = [(rec_start, anchors[0][0], 1.0, 0.0)]
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
            raise SystemExit(f"интервал записи {a}-{b} длиннее сцены ({R:.2f} > {L:.2f}): пришлось бы ускорять или вырезать")
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

def build(name, specs):
    src, rs, re_, anchors = specs[name]
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
    data_start = anchors[0][1] - derived(segs, anchors[0][0])
    print(f"{name}: data-start={data_start:.2f} длительность={dur:.2f} (расчёт {total:.2f})")
    clicks = [c for c in json.load(open(name + ".clicks.json")) if rs <= c["t"] <= re_]
    print("  клики (время производной записи):", json.dumps([{"t": round(derived(segs, c["t"]), 2), "x": c["x"], "y": c["y"], "label": c.get("label", "")} for c in clicks], ensure_ascii=False))
    print("  якоря в сцене:", [(r, round(derived(segs, r) + data_start, 2)) for r in (a[0] for a in anchors)])

AL = load_align("10")
# scene-14-pull (15,8 с) используется с 4.3 по 13.4 с записи (9,1 с): начало (переключение на main, 0–4.3) и хвост не нужны речи сцены.
# Клик Source Control (5.2) — на «компьютер» +0,17; вырезаны только неподвижные участки 6.7-7.05 и 7.65-8.05 (экран не меняется);
# клик Pull на 8.35 приходится на 6.3 с сцены («та же версия»); авторы и причины видны в графе записи уже с 7.0.
SPECS = {
    "scene-14-pull": ("scene-14-pull.mp4", 4.3, 13.4,
        [(5.2, T(AL, "компьютер", 1, 0.17)), (7.05, T(AL, "компьютер", 1, 0.17 + 1.5), (6.7, 7.05)), (8.35, T(AL, "компьютер", 1, 0.17 + 2.4), (7.65, 8.05))]),
}
# Кадр статуса Merged из записи GitLab (scene-13-merge, 11.0 с): статичный первый план сцены.
FRAMES = [("scene-13-merge.mp4", 11.0, "scene-10-merged.png")]

if not sys.argv[1:]:
    for src, t, out in FRAMES:
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(t), "-i", src, "-frames:v", "1", out], check=True)
for n in (sys.argv[1:] or SPECS):
    build(n, SPECS)
