#!/bin/bash
# Звук и выпуск «Подробно · гайд PDLC»: голос+эффекты → стемы, подложка под голосом (дак), один AAC (48 кГц, моно) в оба MP4.
#   BED=<bed.wav> OUT=<каталог> bash tools/mix.sh      # после `hyperframes render` (renders/render.mp4)
# BED — подложка −35 LUFS (bed-loop.ts), уже опущенная на 3,5 дБ (как в E1: музыка под голосом тише); источники вне Git (video/_shared/music/credits.txt).
set -euo pipefail
FILM=$(cd "$(dirname "$0")/.." && pwd)
REPO=$(cd "$FILM/../../.." && pwd)
: "${BED:?нужен BED}" "${OUT:?нужен OUT}"
NAME=pdlc-guide-long
mkdir -p "$OUT"
node --experimental-strip-types "$REPO/video/_shared/tools/sfx-mix.ts" "$FILM" "$FILM/renders/render.mp4" "$OUT/nomusic.mp4" --stems "$OUT/stems"
node --experimental-strip-types "$REPO/video/_shared/tools/mix-v35.ts" --voice "$OUT/stems/voice.wav" --sfx "$OUT/stems/sfx.wav" --bed "$BED" \
  --video "$FILM/renders/render.mp4" --out "$OUT/mix-stereo.mp4" --stems "$OUT/stems-final" --tp -2.0 --duck-attack 100
# один AAC: моно (среднее каналов), 48 кГц, 128 кбит/с, loudnorm −16 LUFS + лимитер (tools/mono.mjs)
node "$FILM/tools/mono.mjs" "$OUT/mix-stereo.mp4" "$OUT/audio.m4a"
# master 1080p: картинка из рендера копией; web 720p: crf 30 preset slow
ffmpeg -v error -y -i "$FILM/renders/render.mp4" -i "$OUT/audio.m4a" -map 0:v -map 1:a -c copy -movflags +faststart -shortest "$OUT/$NAME-1080p.mp4"
ffmpeg -v error -y -i "$FILM/renders/render.mp4" -i "$OUT/audio.m4a" -map 0:v -map 1:a -vf scale=1280:720 -c:v libx264 -preset slow -crf 30 -pix_fmt yuv420p -c:a copy -movflags +faststart -shortest "$OUT/$NAME-720p.mp4"
