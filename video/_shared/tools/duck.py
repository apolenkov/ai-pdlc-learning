#!/usr/bin/env python3
"""Замер дака музыки под голос по стемам (бриф п.3, гейт sfx-gate.ts --music --duck).

Сравниваются два стема одного прогона mix-v35.ts: `stems/music.wav` (музыка до дака,
с тем же гейном) и `stems/music-ducked.wav` (после sidechaincompress под голосом).
Слова берутся из alignment озвучки: слово — токен без пробелов, сцены складываются
со стартами из scenes.json.

Глубина дака слова = медиана мгновенного дака (окно 40 мс, шаг 5 мс)
  · по окнам, где ГОЛОС звучит (`stems/voice.wav` выше «пик − 40 дБ») — дак под словами,
  · и где музыка слышна (`music.wav` выше «пик − 40 дБ») — в цифровой тишине отношение
    не определено (0/0), такие окна не считаются.

RE1 (18.10): меряются ВСЕ слова alignment, включая «с», «по», «а», «и», «что», «к». Короткое слово
(< --short, по умолчанию 150 мс, или меньше 4 окон звучания) оценивается в окне фразы: его интервал плюс
соседние слова, если пауза до них ≤ 300 мс (`mode: "phrase"`). Для справки у каждого слова считается
дак по ЕГО СОБСТВЕННОМУ интервалу целиком (`db_full`) и список слов ниже 3 дБ по обоим определениям.
Пропускаются только токены без букв и цифр (тире, знаки; `no-letters`) и слова, под которыми музыка
в цифровой тишине (`music-silent`); все пропуски перечислены в `skipped` с причиной.

Квитанция (для sfx-gate.ts) связана с MP4 (`--mp4`), четырьмя стемами и файлами alignment по sha256
и хранит число слов alignment: замеров + пропусков = слов.

Запуск: python duck.py --mp4 <ролик.mp4> --stems DIR --film DIR --out duck.json [--png duck.png]
"""

from __future__ import annotations
import argparse, hashlib, json, sys
from pathlib import Path

import numpy as np
import wave

p = argparse.ArgumentParser()
p.add_argument("--stems", required=True)
p.add_argument("--attack", type=float, default=150.0)
p.add_argument("--short", type=float, default=0.150)
p.add_argument("--context", type=float, default=0.300)
p.add_argument("--mp4", required=True)
p.add_argument("--film", required=True)
p.add_argument("--out", required=True)
p.add_argument("--png")
a = p.parse_args()


def read_wav(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as w:
        fs, n, ch, sw = (
            w.getframerate(),
            w.getnframes(),
            w.getnchannels(),
            w.getsampwidth(),
        )
        raw = w.readframes(n)
    if sw == 3:  # pcm_s24le
        b = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3)
        v = (
            b[:, 0].astype(np.int32)
            | (b[:, 1].astype(np.int32) << 8)
            | (b[:, 2].astype(np.int32) << 16)
        )
        v = np.where(v >= 1 << 23, v - (1 << 24), v)
        x = v.astype(np.float64) / (1 << 23)
    else:
        dt = {1: np.int8, 2: "<i2", 4: "<i4"}[sw]
        x = np.frombuffer(raw, dtype=dt).astype(np.float64) / float(np.iinfo(dt).max)
    return x.reshape(-1, ch), fs


music, fs = read_wav(Path(a.stems) / "music.wav")
ducked, fs2 = read_wav(Path(a.stems) / "music-ducked.wav")
voice, fs3 = read_wav(Path(a.stems) / "voice.wav")
assert fs == fs2 == fs3
n = min(len(music), len(ducked), len(voice))
mm, dd, vv = music[:n].mean(axis=1), ducked[:n].mean(axis=1), voice[:n].mean(axis=1)

# --- слова ---
FILM = Path(a.film)
scenes = json.loads((FILM / "scenes.json").read_text())
align_files = []
words = []
acc = 0.0
for s in scenes:
    if s.get("overlay"):
        continue
    n_scene = str(s["n"])
    af = next(
        (path for path in (
            FILM / f"assets/vo/scene-{n_scene}.alignment.json",
            FILM / f"assets/vo/scene-{n_scene.zfill(2)}.alignment.json",
        ) if path.exists()),
        None,
    )
    if af is None:
        raise FileNotFoundError(f"alignment for scene {n_scene} not found")
    align_files.append(af)
    al = json.loads(af.read_text())
    tok = []
    for ch, c0, c1 in zip(
        al["characters"],
        al["character_start_times_seconds"],
        al["character_end_times_seconds"],
    ):
        if ch.strip() == "":
            if tok:
                words.append(
                    (
                        acc + min(t[0] for t in tok),
                        acc + max(t[1] for t in tok),
                        "".join(t[2] for t in tok),
                    )
                )
                tok = []
        else:
            tok.append((c0, c1, ch))
    if tok:
        words.append(
            (
                acc + min(t[0] for t in tok),
                acc + max(t[1] for t in tok),
                "".join(t[2] for t in tok),
            )
        )
    acc += s["duration"]

# --- огибающие на общей сетке окон ---
win, hop = int(0.040 * fs), int(0.005 * fs)
starts = np.arange(0, n - win, hop)


def env(x: np.ndarray) -> np.ndarray:
    return np.sqrt(np.array([(x[i : i + win] ** 2).mean() for i in starts]))


rms_m, rms_d, rms_v = env(mm), env(dd), env(vv)
voiced, audible = (
    rms_v > rms_v.max() * 10 ** (-40 / 20),
    rms_m > rms_m.max() * 10 ** (-40 / 20),
)
inst_db = 20 * np.log10(np.maximum(rms_m, 1e-12) / np.maximum(rms_d, 1e-12))


def span(t0: float, t1: float) -> tuple[int, int]:
    return max(0, int(round(t0 * fs))), min(n, int(round(t1 * fs)))


measured, skipped = [], []


def sk(t0, t1, w, reason):
    skipped.append(
        {"word": w, "t0": round(t0, 3), "t1": round(t1, 3), "dur": round(t1 - t0, 3), "reason": reason}
    )


def own_full(t0, t1):
    i0, i1 = span(t0, t1)
    if i1 - i0 < 2:
        return None
    return float(
        20 * np.log10(np.sqrt((mm[i0:i1] ** 2).mean()) / max(np.sqrt((dd[i0:i1] ** 2).mean()), 1e-12))
    )


def pick(t0, t1):
    i0, i1 = span(t0, t1)
    in_w = (starts >= i0) & (starts + win <= i1)
    sel = in_w & voiced & audible
    if sel.sum() < 2:
        sel = in_w & audible
    return sel


for k, (t0, t1, w) in enumerate(words):
    if not any(c.isalnum() for c in w):
        sk(t0, t1, w, "no-letters")
        continue
    sel = pick(t0, t1)
    mode = "word"
    if (t1 - t0) < a.short or sel.sum() < 4:
        # окно фразы: сам токен + соседние слова, если пауза до них ≤ context
        c0, c1 = t0, t1
        if k > 0 and any(ch.isalnum() for ch in words[k - 1][2]) and t0 - words[k - 1][1] <= a.context:
            c0 = words[k - 1][0]
        if k + 1 < len(words) and any(ch.isalnum() for ch in words[k + 1][2]) and words[k + 1][0] - t1 <= a.context:
            c1 = words[k + 1][1]
        sel = pick(c0, c1)
        mode = "phrase"
    else:
        c0, c1 = t0, t1
    if sel.sum() == 0:
        sk(t0, t1, w, "music-silent")
        continue
    A = own_full(t0, t1)
    j0, j1 = span(t0 + a.attack / 1000.0, t1)
    B = (
        float(20 * np.log10(np.sqrt((mm[j0:j1] ** 2).mean()) / max(np.sqrt((dd[j0:j1] ** 2).mean()), 1e-12)))
        if j1 - j0 > 1
        else A
    )
    measured.append(
        {
            "word": w,
            "t0": round(t0, 3),
            "t1": round(t1, 3),
            "dur": round(t1 - t0, 3),
            "mode": mode,
            "window": [round(c0, 3), round(c1, 3)],
            "db": round(float(np.median(inst_db[sel])), 2),
            "db_full": None if A is None else round(A, 2),
            "db_steady": None if B is None else round(B, 2),
            "windows": int(sel.sum()),
        }
    )


def stats(key: str) -> dict:
    v = np.array([m[key] for m in measured if m[key] is not None])
    return {
        "min": round(float(v.min()), 2),
        "median": round(float(np.median(v)), 2),
        "max": round(float(v.max()), 2),
    }


main = stats("db")


def ref(path):
    path = Path(path).resolve()
    return {"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


res = {
    "mp4": ref(a.mp4),
    "stems": {k: ref(Path(a.stems) / f"{k}.wav") for k in ("voice", "sfx", "music", "music-ducked")},
    "alignment": [ref(f) for f in align_files],
    "alignmentWords": len(words),
    "attack_ms": a.attack,
    "short_s": a.short,
    "context_s": a.context,
    "words_measured": len(measured),
    "words_skipped": len(skipped),
    "words_phrase_mode": sum(m["mode"] == "phrase" for m in measured),
    # контракт sfx-gate.ts: min/median/max/words пересчитываются гейтом из perWord
    "min": main["min"],
    "median": main["median"],
    "max": main["max"],
    "words": len(measured),
    "reference": {"full": stats("db_full"), "steady": stats("db_steady")},
    "below3": [m for m in measured if m["db"] < 3],
    "below3_own_interval": [m for m in measured if m["db_full"] is not None and m["db_full"] < 3],
    "perWord": measured,
    "skipped": skipped,
}
Path(a.out).write_text(json.dumps(res, ensure_ascii=False, indent=1) + "\n")

print(f"слов alignment {len(words)}: измерено {len(measured)} (в окне фразы {res['words_phrase_mode']}), пропущено {len(skipped)}")
print("  пропуски:", ", ".join(f"{x['word']}[{x['reason']}]" for x in skipped))
print(f"  ниже 3 дБ (основной замер): {[(m['word'], m['db']) for m in res['below3']]}")
print(f"  ниже 3 дБ (собственный интервал слова): {[(m['word'], m['db_full']) for m in res['below3_own_interval']]}")
print(
    f"  дак по словам: {main['min']:+.2f} … {main['median']:+.2f} … {main['max']:+.2f} дБ"
)
print(
    f"  справка (без маски голоса): full {res['reference']['full']['min']:+.2f}…{res['reference']['full']['max']:+.2f}, "
    f"steady {res['reference']['steady']['min']:+.2f}…{res['reference']['steady']['max']:+.2f}"
)
lo = sorted(measured, key=lambda m: m["db"])[:5]
hi = sorted(measured, key=lambda m: -m["db"])[:5]
print("  тише всех:", ", ".join(f"{m['word']}={m['db']:+.2f}" for m in lo))
print("  глубже всех:", ", ".join(f"{m['word']}={m['db']:+.2f}" for m in hi))

try:
    if not a.png:
        raise RuntimeError("plot not requested")
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    t = starts / fs
    fig, ax = plt.subplots(figsize=(14, 4.2), dpi=110)
    ax.plot(
        t,
        20 * np.log10(np.maximum(rms_m, 1e-9)),
        lw=0.7,
        color="#888",
        label="музыка (до дака)",
    )
    ax.plot(
        t,
        20 * np.log10(np.maximum(rms_d, 1e-9)),
        lw=0.9,
        color="#1b6ca8",
        label="музыка (дак под голос)",
    )
    ax.plot(
        t,
        20 * np.log10(np.maximum(rms_m, 1e-9)) - 5,
        lw=0.6,
        color="#d24",
        alpha=0.45,
        label="−5 дБ от музыки (цель дака)",
    )
    for m in measured:
        ax.axvspan(m["t0"], m["t1"], color="#f4c542", alpha=0.16, lw=0)
    ax.set_xlim(0, 8.2)
    ax.set_ylim(-64, -18)
    ax.set_xlabel("время ролика, с (сцена 1)")
    ax.set_ylabel("RMS, дБFS")
    ax.set_title("Дак музыки под голос, сцена 1 (жёлтые — слова alignment)")
    ax.legend(loc="lower right", fontsize=8)
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(a.png)
    print("  график:", a.png)
except Exception as e:
    if a.png:
        print("  график не построен:", e, file=sys.stderr)
