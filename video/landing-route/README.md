# landing-route — ролик шапки публичной главной (TASK-944, запрос TASK-923)

Статус: **v1** собран 23.11.2026. Ролик для `figure.hero-media` публичной главной (метка `<!-- landing-film -->`): 5 глав по порядку страницы — Главная, Карта PDLC, Намерение и план, Анализ, Справка. 70,6 с, 19 реплик, −16,2 LUFS, true peak −5,2 dBTP, 2118 кадров. Звук — только голос, без музыки и эффектов. Веб-версия 720p — в релизе `media-v1` публичного репозитория (URL и sha256 — в `video-manifest.json`), мастер 1080p и рендеры — вне Git, их sha256 — в `MEDIA.sha256`. Требования — OpenSpec `landing-route-film`.

## Что внутри

- `film/` — сборка hyperframes 0.8.172 по шаблону «окно страницы» обзорного ролика (`kit/pagewin.*`; `kit/kit.js` — ссылка на файл `landing-overview-sections`, `tools/scene.mjs` копирует его в сцену как файл).
- `film/assets/page/` — кадр опубликованной главной (public main `16d112d`, 1664×2091 CSS × DPR 2) и прямоугольники её частей; оба пишет `film/tools/shoot-page.ts`, он же обновляет блок `R` в `kit/pagewin.js` и высоту страницы в `kit/pagewin.css`. Координат вручную в сценах нет.
- `film/work/vo-input.md` — текст диктора (5 блоков, 847 знаков); `film/work/scenes/NN.js` — сцены; `compositions/` собирает из них `tools/wrap-scene.mjs`.
- `film/assets/vo/scene-NN.*` — голос Allan, `eleven_v4`, lead 2,0 с у сцены 1; тайминги слов — из синтеза ElevenLabs (with-timestamps). Исходные блоки — `film/assets/vo-v3/`.
- `landing-route.vtt` — субтитры (`tools/make-vtt.mjs`), `landing-route.chapters.{json,vtt}` — главы по сценам (`tools/make-chapters.mjs`).
- `landing-route-poster.webp` — постер, кадр 0 веб-версии (1280×720).
- `video-manifest.json`, `MEDIA.sha256` — пины; их сверяет `scripts/landing-route-film.test.ts`.

## Как собрать

```sh
node --experimental-strip-types video/landing-route/film/tools/shoot-page.ts https://apolenkov.github.io/ai-pdlc-learning/
node video/voice-landing.mjs --only=landing-route        # голос; нужен прокси elevenlabs-proxy из Связки ключей
cd video/landing-route/film
node tools/wrap-scene.mjs && node tools/build-index.mjs .
node tools/make-vtt.mjs ../landing-route.vtt && node tools/make-chapters.mjs
node tools/scene.mjs N check|snapshot|render              # N = 1..5
sh tools/assemble.sh                                      # renders/final/: 1080p, 720p, постер
```

`tools/assemble.sh` склеивает рендеры сцен, дополняет голос каждой сцены тишиной до её длины, нормализует громкость в два прохода (loudnorm −16 LUFS, линейно по замеру) и ограничивает пик −5,2 dBFS до кодирования AAC. Гейты по готовому 720p: число кадров = сумма сцен × 30, дорожки одной длины, декод без ошибок, −16 ± 0,5 LUFS, true peak ≤ −4,5 dBTP. Постер — через `cwebp` (ffmpeg из Homebrew собран без libwebp).

## Проверки v1

- `hyperframes check` пяти сцен на реальных таймингах — PASS.
- Кадры стыков сцен и всех выносок — просмотрены; выноска «Карта PDLC» убрана (под ссылкой закрывала заголовок, справа указывала бы на «Справку»), у ссылки осталось кольцо.
- whisper по готовому ролику совпадает с текстом диктора; фраза «Курсы есть у первых двух этапов» на длинном прогоне пропущена распознаванием, отдельный прогон сцены 2 её находит.
- Нет CustomDev, команды развития и аудита — тест `scripts/landing-route-film.test.ts`.
