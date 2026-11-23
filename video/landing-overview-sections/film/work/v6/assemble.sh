#!/bin/sh
# TASK-911 (v6): new web cut of the overview film. Scenes 1–4 from the published 720p v5b (8045d033), scenes 5–6 fresh
# renders, sound = the v5b voice-only track with the removed sentence cut out of scene 5.
#   sh assemble.sh <v5b web mp4> [film dir]      film dir defaults to the one this script lives in (../..)
# Inputs: <film>/renders/scene-05.mp4 and scene-06.mp4 (tools/scene.mjs N render). Output: <film>/renders/v6-build/.
set -eu
PUB=${1:?usage: sh assemble.sh <v5b web mp4> [film dir]}
FILM=$(cd "${2:-$(dirname "$0")/../..}" && pwd)
OUT="$FILM/renders/v6-build"
for f in "$PUB" "$FILM/renders/scene-05.mp4" "$FILM/renders/scene-06.mp4"; do [ -f "$f" ] || { echo "нет входа: $f" >&2; exit 1; }; done
[ "$(shasum -a 256 "$PUB" | cut -d' ' -f1)" = 8045d033de61641ee77b54b77aa073f9c9db75d2385ecd4ee52dade27283cb43 ] || { echo "не v5b: $PUB" >&2; exit 1; }
KEY=58.333333        # last keyframe before scene 5 (64.1 s) in the v5b file
S5=64.1              # scene 5 start
A=$(echo "$S5 + 6.80" | bc); B=$(echo "$S5 + 11.70" | bc)   # 70.90 .. 75.80, the same cut as edit-sources.py
mkdir -p "$OUT"
X264="-c:v libx264 -preset slow -crf 30 -profile:v high -level 3.1 -pix_fmt yuv420p -r 30"

# 1. Head: frames 0..1749 copied as is (ends right before the keyframe).
ffmpeg -v error -y -i "$PUB" -map 0:v -c copy -frames:v 1750 "$OUT/head.mp4"
# 2. Tail: v5b frames 1750..1922 (rest of scene 4) + scene 5 + scene 6, one encode.
ffmpeg -v error -y -ss "$KEY" -i "$PUB" -i "$FILM/renders/scene-05.mp4" -i "$FILM/renders/scene-06.mp4" -filter_complex \
  "[0:v]trim=start_frame=0:end_frame=173,setpts=PTS-STARTPTS[a];[1:v]scale=1280:720:flags=lanczos,fps=30,setsar=1,setpts=PTS-STARTPTS[b];[2:v]scale=1280:720:flags=lanczos,fps=30,setsar=1,setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0[v]" \
  -map "[v]" $X264 "$OUT/tail.mp4"
# Names relative to list.txt (both files lie next to it): a quote in the film path cannot break the concat list.
printf "file 'head.mp4'\nfile 'tail.mp4'\n" > "$OUT/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$OUT/list.txt" -c copy "$OUT/video.mp4"
# 3. Sound: cut [A, B) with a 10 ms crossfade inside the pauses, padded back to the video length. A limiter at −5.2 dBFS
#    runs before the AAC encode: without it the encoded file measures −4.40 dBTP (v5b: −4.63), over the −4.5 limit.
ffmpeg -v error -y -i "$PUB" -filter_complex \
  "[0:a]atrim=0:$A,asetpts=N/SR/TB[x];[0:a]atrim=$B,asetpts=N/SR/TB[y];[x][y]acrossfade=d=0.01:c1=tri:c2=tri,alimiter=limit=0.5495:attack=2:release=50:level=disabled,apad=pad_dur=0.01[o]" \
  -map "[o]" -t 87.3 -c:a aac -b:a 160k -ar 48000 -ac 2 "$OUT/audio.m4a"
# 4. Mux and gates: length, decode, loudness −16 LUFS ±0.5, true peak ≤ −4.5 dBTP.
ffmpeg -v error -y -i "$OUT/video.mp4" -i "$OUT/audio.m4a" -map 0:v -map 1:a -c copy -movflags +faststart -t 87.3 "$OUT/landing-overview.mp4"
frames=$(ffprobe -v error -select_streams v -count_frames -show_entries stream=nb_read_frames -of csv=p=0 "$OUT/landing-overview.mp4")
vdur=$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$OUT/landing-overview.mp4")
adur=$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$OUT/landing-overview.mp4")
echo "frames $frames, video $vdur s, audio $adur s"
[ "$frames" = 2619 ] && [ "$vdur" = 87.300000 ] && [ "$adur" = 87.300000 ] || { echo "СТОП: ждали 2619 кадров и 87,3 с обеих дорожек" >&2; exit 1; }
ffmpeg -v error -xerror -i "$OUT/landing-overview.mp4" -f null -
echo "decode: ok"
# Separate assignment: set -e sees the ffmpeg exit code, which a pipe into awk would hide.
loud=$(ffmpeg -hide_banner -i "$OUT/landing-overview.mp4" -vn -af loudnorm=print_format=json -f null - 2>&1)
printf '%s\n' "$loud" |
  awk -F'"' '/"input_i"/{i=$4} /"input_tp"/{tp=$4} END{printf "loudness %s LUFS, true peak %s dBTP\n", i, tp; if (i < -16.5 || i > -15.5 || tp > -4.5) { print "СТОП: громкость или пик вне нормы"; exit 1 }}'
shasum -a 256 "$OUT/landing-overview.mp4"
