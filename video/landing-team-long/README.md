# landing-team-long — «Команда развития: подробно» (R11)

Ролик enabling-team, 13 глав, 7:22,6 (522,6 с). Сценарий принят: `~/work/handoffs/customdev-unify/pack11/T-long.md`.
Роли и решения — строго по правилу 590 (одобрение требований ≠ принятие кода). «Менеджер внедрения» в голосе и на экране —
слово из белого списка гейта v3. Субтитры не вшиты: отдельная дорожка `landing-team-long.vtt` (по предложениям);
главы — `landing-team-long.chapters.json` и `.chapters.vtt`.

## Что в каталоге

| Файл | Назначение |
|---|---|
| `film/` | композиции HyperFrames (13 сцен), озвучка, `scenes.json`, `sfx.json`, `credits.txt` |
| `landing-team-long.vtt`, `.chapters.json`, `.chapters.vtt` | дорожки: субтитры и главы |
| `landing-team-long-poster.webp` | постер (кадр сцены 1, 1280×720) |
| `video-manifest.json`, `MEDIA.sha256` | пины mp4 (web 720p и мастер 1080p); mp4 вне Git, версия в Registry — первые 12 знаков sha256 |

## Сборка

```sh
cd video/landing-team-long/film
node tools/make-vo-input.mjs         # work/vo-input.md из сценария (латиница → русская запись)
node ../../_shared/tools/voice.mjs …  # озвучка ElevenLabs (Allan, eleven_v4, скорость 0,85); затем vo-normalize.mjs, tools/build-vo.mjs
node tools/wrap-scene.mjs && node tools/build-index.mjs .
node tools/make-sfx.mjs              # sfx.json из тех же сцен
npx hyperframes@0.8.166 check .      # проверка композиций
npx hyperframes@0.8.172 render . --video-frame-format png -w 1 -o nosubs-1080p.mp4
node tools/make-vtt.mjs ../landing-team-long.vtt && node tools/make-chapters.mjs
node tools/check-speech.mjs <mp4> <каталог>   # whisper-сверка всей речи с текстом озвучки
```

Звук — только голос (TASK-671): озвучка сцен без музыки, эффектов и подложки; манифест несёт `"audio": "voice-only"`.
Голосовую шину собирает `video/_shared/tools/voice-only.ts --from-pin` (запуск из корня репозитория): моно AAC-LC 128k 48 кГц,
loudnorm I −16 (два прохода), видео скопировано из прежнего пина. Web — libx264 crf 30 preset slow 1280×720, мастер 1080p
остаётся прежним миксом (видеопоток HF без перекодирования, вне этапа).

## Известные отклонения

- Длительность 522,6 с против 443 с по оценке сценария (+18 %): темп голоса 0,85 (≈124 слова/мин вместо 145).
- Скетчи пачки 9 (`assets/sketches/`) не перерисовывались; в `pdlc-02` стоит «владелец подтверждает», а по 590 требования одобряет
  владелец продукта — в кадре скетч показан вместе с плашкой «02 · одобряет владелец продукта» (по 590); подпись внутри скетча не правилась.
