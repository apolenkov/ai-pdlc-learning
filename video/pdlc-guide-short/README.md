# pdlc-guide-short — «Коротко» для гайда PDLC (R11, пачка 11)

Ролик для плеера «Коротко / Подробно» вверху `docs/pages/sdlc-development/pdlc-guide.html`: принцип, семь этапов по одной-две фразы, вывод.
Девять глав, диктор Allan (eleven_v4), без вшитых субтитров: реплики лежат отдельной дорожкой `pdlc-guide-short.vtt`.
Сценарий принят Fable 19.10 (14:00): `~/work/handoffs/customdev-unify/pack11/G-short.md`.

## Что где

| Файл | Назначение |
| --- | --- |
| `film/` | композиции HyperFrames: `index.html`, `compositions/scene-01…09.html`, kit, озвучка `assets/vo/` |
| `film/work/vo-input.md` | текст диктора, записанный по-русски («пи-ди-эл-си»); в VTT латиница по `film/terms.json` |
| `film/assets/sketches/` | восемь скетчей пачки 9 (`customdev` `origin/main` `8269075e`), без правок: в этапах закрыта только шапка скетча |
| `film/sfx.json` | план эффектов (swipe, pop, click, subdrop), `film/tools/make-sfx.mjs` |
| `pdlc-guide-short.vtt`, `pdlc-guide-short.chapters.json`, `.chapters.vtt` | дорожка реплик (по предложениям), главы для плеера |
| `pdlc-guide-short-poster.webp` | постер плеера |
| `MEDIA.sha256` | sha256 озвучки; `video-manifest.json` — пины 720p и master (url заполняет 008 после Registry) |

## Сборка

```sh
cd video/pdlc-guide-short/film
STORYBOARD=work/vo-input.md node ../../_shared/tools/voice.mjs work/vo-raw all   # озвучка (ключ берёт voice.mjs)
node ../../_shared/tools/vo-normalize.mjs …                                       # паузы; scene-01 сдвинут на 0,5 с (пауза в начале)
node tools/make-scenes.mjs && node tools/wrap-scene.mjs && node tools/build-index.mjs . && node tools/sync-dur.mjs
node tools/make-vtt.mjs ../pdlc-guide-short.vtt && node tools/make-chapters.mjs
node tools/make-sfx.mjs
npx --yes hyperframes@0.8.166 check
npx --yes hyperframes@0.8.172 render . -q standard -w 1 -o renders/raw.mp4
node tools/final-audio.mjs renders/raw.mp4 <bed.wav> work/audio work/audio/final.m4a   # звук
```

Подложка (`bed.wav`, вне Git): трек «Один маршрут» из `577/bed-577.wav`, обрезан до длины ролика, затухание 6 с. Источники и лицензии — `film/credits.txt`.

## Слова и роли (590)

Одобряет только владелец продукта (этап 02; аналитик и техлид комментируют); ADR утверждает архитектор, документ дизайна пишет техлид;
код принимает техлид; тестирование решает инженер качества; выпуск допускает техлид; этапы 01 и 07 решает владелец продукта.
Слов «было → стало» нет; на экране вместо них панели скетчей «Проблемы» и «Цель».
