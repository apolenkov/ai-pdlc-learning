# pdlc-guide-long — «Подробно» для страницы гайда PDLC (R11)

Ролик «Подробно» (≈ 7,5 мин, 10 глав) для плеера «Коротко / Подробно» на `pdlc-guide.html`.
Сценарий: `~/work/handoffs/customdev-unify/pack11/G-long.md` (принят Fable 19.10 14:00). Без вшитых субтитров; дорожка — `pdlc-guide-long.vtt`
(по предложениям), главы — `pdlc-guide-long.chapters.json` / `.chapters.vtt`. Звук — только голос (TASK-671): озвучка сцен без музыки, эффектов и подложки.

```text
film/work/vo-input.md ─ voice.mjs ─▶ assets/vo-v3 ─ vo-normalize ─▶ assets/vo/scene-NN.{mp3,alignment.*}
film/tools/spec.mjs ─ tools/build.mjs ─▶ scenes.json · compositions/ · index.html · sfx.json · VTT · главы
hyperframes render 0.8.172 ─▶ renders/render.mp4 ─ video/_shared/tools/voice-only.ts ─▶ AAC-LC 48 кГц моно ─▶ web 720p (crf 30 slow); мастер 1080p — прежний микс
```

- Картинка — скетчи `docs/assets/sketches/` (customdev `origin/main` 8269075e, без правок файлов): `film/assets/sketches/`. Своя шапка карточки
  с ролями по 590 стоит вместо шапки скетча (верхние 90 единиц скетча обрезаны), подсветка областей — маска поверх.
- «PDLC» в голосе записано по-русски («пи-ди-эл-си», как в overview); на экране и в VTT — латиница (`film/terms.json`).
- Первая глава начинается с паузы 0,4 с (`film/tools/lead.mjs`): озвучка стартует с нуля секунд.
- Сборка: `node tools/build.mjs` (из `film/`), проверка `npm run check` (hyperframes 0.8.166), рендер `npx hyperframes@0.8.172 render . -q standard -w 1 -o renders/render.mp4`,
  звук — `video/_shared/tools/voice-only.ts --from-pin` (из корня репозитория, всегда сначала `--plan-only`). MP4 в Git не хранятся (Registry проекта 6656, версии — `video-manifest.json`).
- Выпуск TASK-671: web 720p — только голос, пересборка из прежнего пина (видео скопировано), AAC-LC моно 48 кГц 128k (`"audio": "voice-only"` в манифесте);
  мастер 1080p остаётся прежним миксом (вне этапа), к нему относятся треки Matio888 из `film/credits.txt` (CC BY 4.0, исходники вне Git — `video/_shared/music/credits.txt`).
