#!/bin/sh
# Итоговая сборка ролика главной: рендеры сцен (tools/scene.mjs N render) + голос сцен по scenes.json.
#   sh tools/assemble.sh            из каталога film; выход — renders/final/
# Видео: сцены склеиваются без перекодирования в мастер 1080p, веб — 1280×720, CRF 30.
# Звук: голос каждой сцены дополняется тишиной до длительности сцены, затем loudnorm −16 LUFS и ограничитель
# −5,2 dBFS до кодирования AAC. Гейты: число кадров = сумма сцен × 30, обе дорожки одной длины, декод без ошибок,
# −16 ± 0,5 LUFS, true peak ≤ −4,5 dBTP по готовому файлу. Постер — кадр 0 веб-версии, webp 1280×720.
set -eu
FILM=$(cd "$(dirname "$0")/.." && pwd)
OUT="$FILM/renders/final"
N=$(node -e "console.log(require('$FILM/scenes.json').length)")
for i in $(seq 1 "$N"); do
  nn=$(printf %02d "$i")
  [ -f "$FILM/renders/scene-$nn.mp4" ] || { echo "нет рендера сцены $nn" >&2; exit 1; }
  [ -f "$FILM/assets/vo/scene-$nn.mp3" ] || { echo "нет голоса сцены $nn" >&2; exit 1; }
done
if grep -q '"estimate": *true' "$FILM"/assets/vo/scene-*.alignment.json; then echo "СТОП: разметка слов оценочная, голоса нет" >&2; exit 1; fi
mkdir -p "$OUT"
TOTAL=$(node -e "console.log(require('$FILM/scenes.json').reduce((a,s)=>a+s.duration,0).toFixed(3))")
FRAMES=$(node -e "console.log(require('$FILM/scenes.json').reduce((a,s)=>a+Math.round(s.duration*30),0))")

# 1. Видео: склейка рендеров сцен (имена относительно списка).
: > "$OUT/list.txt"
for i in $(seq 1 "$N"); do nn=$(printf %02d "$i"); cp "$FILM/renders/scene-$nn.mp4" "$OUT/v-$nn.mp4"; printf "file 'v-%s.mp4'\n" "$nn" >> "$OUT/list.txt"; done
ffmpeg -v error -y -f concat -safe 0 -i "$OUT/list.txt" -an -c copy "$OUT/video.mp4"

# 2. Звук: голос сцены + тишина до её длительности, склейка, громкость.
args=""; filt=""
for i in $(seq 1 "$N"); do
  nn=$(printf %02d "$i"); d=$(node -e "console.log(require('$FILM/scenes.json')[$i-1].duration)")
  args="$args -i $FILM/assets/vo/scene-$nn.mp3"
  filt="$filt[$((i-1)):a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:$d,asetpts=N/SR/TB[a$i];"
done
cat=""; for i in $(seq 1 "$N"); do cat="$cat[a$i]"; done
# shellcheck disable=SC2086
ffmpeg -v error -y $args -filter_complex "${filt}${cat}concat=n=$N:v=0:a=1,loudnorm=I=-16:TP=-5.5:LRA=11,alimiter=limit=0.5495:attack=2:release=50:level=disabled[o]" \
  -map "[o]" -t "$TOTAL" -c:a aac -b:a 160k -ar 48000 -ac 2 "$OUT/audio.m4a"

# 3. Мастер 1080p и веб 720p.
ffmpeg -v error -y -i "$OUT/video.mp4" -i "$OUT/audio.m4a" -map 0:v -map 1:a -c copy -movflags +faststart -t "$TOTAL" "$OUT/landing-route-1080p.mp4"
ffmpeg -v error -y -i "$OUT/landing-route-1080p.mp4" -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -crf 30 -profile:v high -level 3.1 -pix_fmt yuv420p -r 30 -c:a copy -movflags +faststart "$OUT/landing-route-720p.mp4"

# 4. Гейты по веб-версии.
F="$OUT/landing-route-720p.mp4"
frames=$(ffprobe -v error -select_streams v -count_frames -show_entries stream=nb_read_frames -of csv=p=0 "$F")
vdur=$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$F")
adur=$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$F")
echo "frames $frames (ждём $FRAMES), video $vdur s, audio $adur s, scenes $TOTAL s"
[ "$frames" = "$FRAMES" ] || { echo "СТОП: число кадров" >&2; exit 1; }
node -e "const [v,a,t]=process.argv.slice(1).map(Number);process.exit(Math.abs(v-t)<0.05&&Math.abs(a-t)<0.05?0:1)" "$vdur" "$adur" "$TOTAL" || { echo "СТОП: длина дорожек" >&2; exit 1; }
ffmpeg -v error -xerror -i "$F" -f null -
echo "decode: ok"
loud=$(ffmpeg -hide_banner -i "$F" -vn -af loudnorm=print_format=json -f null - 2>&1)
printf '%s\n' "$loud" | awk -F'"' '/"input_i"/{i=$4} /"input_tp"/{tp=$4} END{printf "loudness %s LUFS, true peak %s dBTP\n", i, tp; if (i < -16.5 || i > -15.5 || tp > -4.5) { print "СТОП: громкость или пик вне нормы"; exit 1 }}'

# 5. Постер: кадр 0 (светлая заставка), webp 1280×720.
# ffmpeg из Homebrew собран без libwebp: кадр в PNG, webp — через cwebp
ffmpeg -v error -y -i "$F" -frames:v 1 "$OUT/poster.png"
cwebp -quiet -q 80 "$OUT/poster.png" -o "$OUT/landing-route-poster.webp"
shasum -a 256 "$OUT/landing-route-1080p.mp4" "$F" "$OUT/landing-route-poster.webp"
