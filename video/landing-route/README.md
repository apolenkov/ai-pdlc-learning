# landing-route — ролик шапки публичной главной (TASK-944, запрос TASK-923)

Статус: **v1** собран 23.11.2026. Ролик для `figure.hero-media` публичной главной (метка `<!-- landing-film -->`): 5 глав по порядку страницы — Главная, Карта PDLC, Намерение и план, Анализ, Справка. 70,6 с, 17 реплик, −16,2 LUFS, true peak −5,2 dBTP, 2118 кадров. Звук — только голос, без музыки и эффектов. Веб-версия 720p выкладывается в релиз `media-v1` публичного репозитория по URL из `video-manifest.json`; мастер 1080p и рендеры — вне Git, их sha256 — в `MEDIA.sha256` (пути как на диске: `shasum -a 256 -c MEDIA.sha256` из этого каталога после сборки). Требования — OpenSpec `landing-route-film`.

## Что внутри

- `film/` — сборка hyperframes 0.8.172 по шаблону «окно страницы» обзорного ролика (`kit/pagewin.*`; `kit/kit.js` — ссылка на файл `landing-overview-sections`, `tools/scene.mjs` копирует его в сцену как файл).
- `film/assets/page/` — кадр опубликованной главной (public main `16d112d`, 1664×2091 CSS × DPR 2) и прямоугольники её частей; оба пишет `film/tools/shoot-page.ts`, он же обновляет блок `R` в `kit/pagewin.js` и высоту страницы в `kit/pagewin.css`. Координат вручную в сценах нет.
- `film/work/vo-input.md` — текст диктора (5 блоков, 847 знаков); `film/work/scenes/NN.js` — сцены; `compositions/` собирает из них `tools/wrap-scene.mjs`.
- `film/assets/vo/scene-NN.*` — голос Allan, `eleven_v4`, lead 2,0 с у сцены 1; тайминги слов — из синтеза ElevenLabs (with-timestamps). Исходные блоки — `film/assets/vo-v3/`.
- `landing-route.vtt` — субтитры (`tools/make-vtt.mjs`), `landing-route.chapters.{json,vtt}` — главы по сценам (`tools/make-chapters.mjs`).
- `landing-route-poster.webp` — постер 1280×720: кадр 0 веб-версии, подпись «● AI PDLC Learning» в нём поднята на 80 px (TASK-923, 23.11): так на 1440 она не уходит под панель плеера. `tools/assemble.sh` пишет кадр 0 без этого сдвига — после пересборки сдвиг повторить.
- `video-manifest.json` — url и sha256 mp4, мастер, постер и дорожки (`tracks`: субтитры, главы vtt и json) с sha256 и размером; `MEDIA.sha256` — те же файлы и голос сцен. Оба пишет `film/tools/pin-media.mjs`, сверяет `scripts/landing-route-film.test.ts`.

## Как собрать

```sh
node --experimental-strip-types video/landing-route/film/tools/shoot-page.ts https://apolenkov.github.io/ai-pdlc-learning/
node video/voice-landing.mjs --only=landing-route        # голос; нужен прокси elevenlabs-proxy из Связки ключей
cd video/landing-route/film
node tools/wrap-scene.mjs && node tools/build-index.mjs .
node tools/make-vtt.mjs ../landing-route.vtt && node tools/make-chapters.mjs
node tools/scene.mjs N check|snapshot|render              # N = 1..5
sh tools/assemble.sh                                      # renders/final/: 1080p, 720p, постер
node tools/pin-media.mjs                                  # манифест, MEDIA.sha256, постер рядом с манифестом
```

`tools/assemble.sh` склеивает рендеры сцен, дополняет голос каждой сцены тишиной до её длины, нормализует громкость в два прохода (loudnorm −16 LUFS: замер, затем второй проход по замеру; если линейное усиление вывело бы пик за −5,5 dBTP, ffmpeg сам переходит в динамический режим) и ограничивает пик −5,2 dBFS до кодирования AAC. Гейты: каждый рендер сцены — ровно её длительность × 30 кадров; по готовому 720p — число кадров = сумма сцен × 30, дорожки одной длины, декод без ошибок, −16 ± 0,5 LUFS, true peak ≤ −4,5 dBTP. Постер — через `cwebp` (ffmpeg из Homebrew собран без libwebp).

## Проверки v1

- `hyperframes check` пяти сцен на реальных таймингах — PASS; переходы прожектора заканчиваются до конца сцены (ревью Codex).
- Общий план карты (сцены 1, 2, 5) — камера Y 330: верх кадра под шапкой, строка заголовка не режется.
- Субтитры — 17 реплик, каждая 1–7 с: по «:»/«;» режется только предложение длиннее 62 знаков (`tools/make-vtt.mjs`).
- Кадры стыков сцен и всех выносок — просмотрены; выноска «Карта PDLC» убрана (под ссылкой закрывала заголовок, справа указывала бы на «Справку»), у ссылки осталось кольцо.
- whisper по готовому ролику совпадает с текстом диктора; фраза «Курсы есть у первых двух этапов» на длинном прогоне пропущена распознаванием, отдельный прогон сцены 2 её находит.
- Нет CustomDev, команды развития и аудита — тест `scripts/landing-route-film.test.ts`.
