#!/bin/zsh
# Производные записи сцены 8: клик Clone целиком и клик Sync Changes (фрагмент записи scene-12-fix с 11,5 с, Commit уже сделан).
cd "$(dirname "$0")"
E=(-c:v libx264 -crf 14 -preset medium -pix_fmt yuv420p -r 30 -an)
ffmpeg -v error -y -i scene-08-clone-button.mp4 $E scene-08-clone.v3.mp4
ffmpeg -v error -y -ss 11.5 -t 4.0 -i scene-12-fix.mp4 $E scene-08-sync.v3.mp4
for n in scene-08-clone scene-08-sync; do ffmpeg -v error -y -i $n.v3.mp4 -frames:v 1 $n.v3.first.png; done
# Publish Branch: фрагмент записи scene-09-push с 9,4 с (Commit уже сделан, клик Publish Branch на 1,84 с).
ffmpeg -v error -y -ss 9.4 -t 4.0 -i scene-09-push.mp4 $E scene-08-publish.v3.mp4
ffmpeg -v error -y -i scene-08-publish.v3.mp4 -frames:v 1 scene-08-publish.v3.first.png
