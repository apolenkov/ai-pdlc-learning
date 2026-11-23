#!/usr/bin/env python3
"""Plan scene 01 at 1x with explicit idle cuts and holds; --write encodes under LANE."""
import argparse
import json
import math
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
REC = ROOT / "assets/rec"
NAME = "scene-01-calc.nocursor"
FPS = 30


def plan():
    # Use the same phrase lookup as the composition, including occurrence handling.
    query = r"""
      const fs = require('node:fs'), vm = require('node:vm');
      const ctx = { window: {} };
      vm.runInNewContext(fs.readFileSync('kit/kit.js', 'utf8'), ctx);
      const a = JSON.parse(fs.readFileSync('assets/vo/scene-1.alignment.json', 'utf8'));
      const S = { t: (p, n) => ctx.window.Kit.timeOf(a, p, n),
                  end: (p, n) => ctx.window.Kit.endOf(a, p, n) };
      console.log(JSON.stringify({ first: Math.max(1.5, S.t('рассчитал') - 0.3),
        typed: S.end('ввёл неверный срок'), error: S.t('ошибку'),
        swap: S.t('Просьба') - 0.5 }));
    """
    times = json.loads(subprocess.check_output(["node", "-e", query], cwd=ROOT))
    clicks = json.loads((REC / f"{NAME}.clicks.json").read_text())
    if len(clicks) != 3 or not all(0 <= c['x'] <= 1920 and 0 <= c['y'] <= 1080 for c in clicks):
        raise ValueError("Expected three clicks inside the 1920x1080 capture")
    first, field, error = [c['t'] for c in clicks]
    if not (first < 5.2 < field < 9.2 < 9.6 < 10.45 < 10.85 < 11.6 < error < 16):
        raise ValueError("Capture changed: recheck the explicit idle cuts")
    # Preserve all character changes. Only idle focus/caret frames are removed.
    typing = [(field, 9.2), (9.6, 10.45), (10.85, 11.6)]
    field_at = times['typed'] - sum(b - a for a, b in typing)
    duration = math.ceil((times['swap'] + 0.55) * FPS) / FPS
    segments = []
    cursor = 0.0

    def add(a, b, end):
        nonlocal cursor
        hold = end - cursor - (b - a)
        if b <= a or hold < -1e-6:
            raise ValueError(f"Cannot fit {a}..{b} at 1x by scene time {end}")
        segments.append((a, b, max(0, hold)))
        cursor = end

    # Trim the initial wait; keep the first result, then cut the idle wait for focus.
    add(first - times['first'], first, times['first'])
    add(first, 5.2, field_at)
    for a, b in typing[:-1]:
        add(a, b, cursor + b - a)
    a, b = typing[-1]
    add(a, b, times['error'])
    # Retain the actual error frame and old payment, then freeze through the exit.
    add(error, 16, duration)
    derived_clicks = [dict(c, t=round(t, 6)) for c, t in zip(clicks, [times['first'], field_at, times['error']])]
    assert all(h >= 0 for _, _, h in segments)
    assert abs(sum(b - a + h for a, b, h in segments) - duration) < 1e-6
    assert times['first'] >= 1.3, "Kit cursor appearance must not start before scene zero"
    assert field_at - times['first'] >= 1.4, "Cursor needs travel time and a full hover before the next click"
    assert times['error'] - times['typed'] >= 1.0, "Hold the completed input before calculating"
    assert times['swap'] - (times['error'] + 16 - error) >= 1.5
    return segments, derived_clicks, duration, times


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='encode MP4 and poster (owner LANE only)')
    args = parser.parse_args()
    segments, clicks, duration, times = plan()
    print(f"data-start=0 data-duration={duration:.6f} (30 fps; hold, speed=1x)")
    print("clicks (derivative time):", json.dumps(clicks, ensure_ascii=False))
    print("anchors (scene time):", json.dumps(times, ensure_ascii=False))
    print("segments (source start, source end, hold):", json.dumps(segments))
    if not args.write:
        print("PLAN ONLY; no MP4 encoded. Under LANE: python3 assets/rec/retime-scene-01.py --write")
        return
    out = REC / "scene-01-calc.retimed.mp4"
    filters = []
    for i, (a, b, hold) in enumerate(segments):
        filters.append(f"[0:v]fps={FPS},trim=start={a:.6f}:end={b:.6f},setpts=PTS-STARTPTS,"
                       f"tpad=stop_mode=clone:stop_duration={hold:.6f}[v{i}]")
    labels = ''.join(f'[v{i}]' for i in range(len(segments)))
    filters.append(f"{labels}concat=n={len(segments)}:v=1:a=0,fps={FPS},"
                   f"tpad=stop_mode=clone:stop_duration=1,trim=duration={duration:.6f}[v]")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(REC / f'{NAME}.mp4'),
                    '-filter_complex', ';'.join(filters), '-map', '[v]', '-an',
                    '-c:v', 'libx264', '-crf', '14', '-preset', 'medium',
                    '-pix_fmt', 'yuv420p', '-r', str(FPS), str(out)], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out), '-frames:v', '1',
                    str(REC / 'scene-01-calc.retimed.first.png')], check=True)
    actual = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                   'format=duration', '-of', 'csv=p=0', str(out)]))
    if abs(actual - duration) > 1 / FPS:
        raise ValueError(f'Encoded duration {actual} differs from {duration}')
    print(f'Encoded duration={actual:.6f}')


if __name__ == '__main__':
    main()
