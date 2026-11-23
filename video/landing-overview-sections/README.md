# landing-overview-sections — источники обзора главной страницы (TASK-602-bis)

Статус: **v6** собран 23.11.2026 (TASK-911): из сцены 5 убран упразднённый раздел «Среда и контуры». Фраза о нём вырезана из записи голоса по паузам (6,80–11,70 с сцены 5, тот же голос, без переозвучки); в кадре страницы вырезана секция (строки 2520–3229, «Справка» поднята на 709 px, высота страницы в `kit/pagewin.css` — 3401); сцены 5–6 перерендерены (hyperframes 0.8.172), сцена 5 — 13,2 с, ролик 87,3 с, 21 реплика, 6 глав, −16,1 LUFS, true peak −5,0 dBTP (ограничитель −5,2 dBFS до кодирования AAC, замер — по готовому MP4). Сцены 1–4 взяты из веб-версии v5b (`8045d033de61`): кадры до 58,333 с скопированы без перекодирования, остаток сцены 4 и новые сцены перекодированы (CRF 30). Звук — дорожка v5b с той же вырезанной фразой. Своего мастера 1080p у v6 нет: мастер v5b утерян до сдачи Mac, его пин сохранён. Как собрано — `film/work/v6/edit-sources.py` (заодно обрезает исходник `assets/vo-v3/block-5.*`, иначе `voice-landing.mjs` вернёт фразу) и `film/work/v6/assemble.sh <v5b mp4>`; субтитр «Внизу…» отстаёт от слова на ~0,09 с, как в v5b (сдвиг alignment исходной записи); актуальный файл — `film/renders/landing-overview-sections-v6-720p.mp4` (вне Git, sha256 — в `MEDIA.sha256` и `video-manifest.json`), в релизе `media-v1` публичного репозитория.

Предыдущая версия — **v5b** собран 23.10 (TASK-671): фон убран, мастер — только голос (−16,0 LUFS, TP −4,6 dBTP); из принятого v4 убран упразднённый раздел «Команды и поддержка» (сцена 5 переозвучена, кадр страницы без секции, «Справка» поднята на 444 CSS); 6 сцен, 92,2 с = 1:32,2; видео сцен 1–4 и 6 — из принятого мастера v4, сцены 5–6 перерендерены. Озвучка — голос Allan (`zWSsRd3J6WyZFl12aGMB`), `eleven_v4`, `speed 0.85`, без ускорения (tempo нет), lead 2,0 с у сцены 1, stitching; источник реплик — `~/work/handoffs/landing-fix/ovr-v4/REPLIKI-v4.md` (текст в `BRIEF-LANDING-SWAP.md`, раздел «Пакет B · DSH · обзор v4»). Файлы v5b — `film/renders/landing-overview-sections-v5b-{1080p,720p}.mp4` (вне Git); мастер 1080p утерян, его пин остался в `MEDIA.sha256` и `video-manifest.json`, веб 720p (`8045d033de61`) — в релизе `media-v1`, из него собран v6. Доставка: MR customdev (следующий после v3 !112) и репозиторий курса; выкладка и Registry — за координатором 008.

## Что внутри

- `film/` — сборка hyperframes 0.8.172: `kit/` (общая тема роликов), шаблон «окно страницы» `kit/pagewin.*` (камера по Y, затемнение с вырезом, кольцо, выноска), `compositions/` (генерируются `tools/wrap-scene.mjs` из `work/scenes/NN.js`), `scenes.json` (6 сцен, реальные длительности и `audio` по озвучке), `index.html` (собирается `tools/build-index.mjs`).
- `film/assets/page/page.jpg` — кадр главной страницы без упразднённого раздела: из принятого v4-кадра (3328×9108) вырезана секция «Команды и поддержка» (строки 6506–7393, 888 px = 444 CSS), итог 3328×8220 (1664×4110 CSS), «Справка» поднята на 444 CSS; остальные пиксели не тронуты (PSNR ≈ 57,9 дБ на стыке). В v6 (TASK-911) из него же вырезана секция «Среда и контуры» (строки 2520–3229 CSS), итог 3328×6802 (1664×3401 CSS).
- `film/assets/vo/scene-NN.{mp3,alignment.json,alignment.js}` — озвучка по сценам (6 блоков, источник — `film/assets/vo-v3/block-N.*`).
- `film/work/vo-input.md` — текст диктора v4 с фонетикой; `film/work/scenes/NN.js` — сцены; `film/sfx.json` — план звука (`tools/make-sfx.mjs`).
- `landing-overview-sections.vtt` — субтитры (21 реплика в v6, `tools/make-vtt.mjs`); `.chapters.json`/`.chapters.vtt` — 6 глав по сценам (`tools/make-chapters.mjs`), конец — по длительности ролика.
- `video-manifest.json` — пины v6: web (релиз `media-v1`, URL по sha256), master — пин утерянного мастера v5b; длительность 87,3 с, 21 реплика, 6 глав; тест глав `scripts/landing-overview-chapters.test.ts` сверяет пины с `MEDIA.sha256`.
- `film/credits.txt` — музыка и эффекты: источники, лицензии, изменения (те же, что в v3).

## Как собрать

v6 — без музыки и мастера: `python3 film/work/v6/edit-sources.py <film>` по исходникам v5b, затем шаги ниже для сцен 5–6 и `sh film/work/v6/assemble.sh <v5b mp4>` (гейты: 2619 кадров, 87,3 с, −16 ± 0,5 LUFS, TP ≤ −4,5 dBTP). Разделы ниже про переозвучку, мастер и микс описывают v4–v5b.

```sh
cd video/landing-overview-sections/film
node tools/wrap-scene.mjs && node tools/build-index.mjs .
node tools/make-vtt.mjs ../landing-overview-sections.vtt && node tools/make-chapters.mjs
node tools/make-sfx.mjs
node tools/scene.mjs N check|snapshot|render   # тяжёлое — через heavy-slot.sh; check с зоной субтитров y>825
```

Переозвучка v5 — только блок 5: `node video/voice-landing.mjs --only=landing-overview-sections` (вариант с пробелом парсер не принимает). Сборка мастера v5 — `~/work/handoffs/task-643/finalize-v5.sh`: кусок [0;64,1) из принятого v4-мастера (MP4 timescale привести к 1/15360, иначе concat молча укорачивает ролик) + свежие рендеры сцен 5–6, затем голос, микс и гейты.

Сведение и рендер: `video/_shared/tools/sfx-mix.ts` (микс с подложкой, даком и loudnorm −16 LUFS / −4,5 dBTP), 720p — scale 1280×720, CRF 30, звук копируется; сборка — `pack14/ovr-v4/finalize-v4.sh` (логи — `pack14/ovr-v4/build-logs/finalize.log`).

## Проверки

v6: hyperframes check сцен 4–6 — PASS; кадры стыков 4→5 и 5→6; whisper по ролику — удалённой фразы нет; ревью Codex — «можно выкладывать». Пункты ниже — проверки v4–v5b.

- hyperframes check по 6 сценам: 0 ошибок, 0 предупреждений; зона субтитров `--caption-zone x0=0;y0=825/1080;x1=1;y1=1;severity=error`.
- Рендер 1080p: 1920×1080, 30 fps, H.264; 720p — CRF 30. Звук −16 LUFS, TP ≤ −4,5 dBTP; `sfx-gate --music --duck` и `--last-word-mp4` — PASS.
- Главы: 6, старты — по `scenes.json`; субтитры — 21 реплика (v6), без перекрытий; запрет «код доступа/доступ» — grep по VTT и тексту = 0.
- Проверка факта речи: whisper-сверка всего ролика (см. отчёт `~/work/handoffs/landing-fix/REPORT-OVR-V4.md`).

## Что остаётся после доставки

- Слияние MR (CD + LR) и выкладка на gh-pages — за координатором 008; пакеты Registry прочитаны обратно, постер — кадр v4-мастера на 2,9 с (1280×720 webp).
- Приёмка: слух всего ролика + кадры 6 сцен + кадры главной (1440/768/390) — за Fable.
