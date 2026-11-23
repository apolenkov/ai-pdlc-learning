#!/bin/zsh
# Производные записи сцены 9: форма New merge request (scene-10-new-mr с 4,2 с), замечание к строке (scene-11-comment с 6,5 с),
# статус «Ready to merge» и Merge (scene-13-merge с 0,3 с). Ускорения нет: куски идут 1x, лишнее обрезано по краям.
cd "$(dirname "$0")"
E=(-c:v libx264 -crf 14 -preset medium -pix_fmt yuv420p -r 30 -an)
ffmpeg -v error -y -ss 4.2 -t 7.2 -i scene-10-new-mr.mp4 $E scene-09-mr.v3.mp4
# после клика форма New merge request остаётся на экране: последний кадр удерживается ещё 6 с (озвучка в этом месте длиннее записи)
ffmpeg -v error -y -i scene-09-mr.v3.mp4 -vf tpad=stop_mode=clone:stop_duration=6 $E scene-09-mr.v4.mp4
ffmpeg -v error -y -ss 6.5 -t 4.0 -i scene-11-comment.mp4 $E scene-09-comment.v3.mp4
ffmpeg -v error -y -ss 0.3 -t 4.0 -i scene-13-merge.mp4 $E scene-09-merge.v3.mp4
for n in scene-09-mr scene-09-comment scene-09-merge; do ffmpeg -v error -y -i $n.v3.mp4 -frames:v 1 $n.v3.first.png; done
