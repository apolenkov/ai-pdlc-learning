# Обзор «Куда идти» · ролик под H1 главной · 84,0 с (сценарий 75 с)

Композиция HyperFrames без голоса и без рендера (бриф `next-1710/VIDEO-pi-brief.md`).
Сценарий: `feedback-1610/VIDEO-LANDING-OVERVIEW-STORYBOARD.md`. Стиль: ролики курса 558 + P7 `dee7ea0` (тот же kit, полоса, карточки, субтитры вшиты).

```text
film/work/vo-input.md → tools/synth-alignment.mjs → assets/vo/scene-NN.alignment.js + scenes.json
scenes.json → tools/build-index.mjs → index.html (compositions/scene-NN.html + kit/kit.js)
```

- 7 сцен, 1920×1080, `hyperframes@0.8.166` (latest 16.10.2026). Реплики и счёт знаков — `video/landing-films-VOICE-PACK.md` §1.
- Синтетический alignment (`synthetic: true`, 145 слов/мин + паузы 0,3 с); `<audio>` нет — `Kit.scene` читает только `window.ALIGN`. Реальный голос перезапишет alignment + `scenes.json` тем же форматом (имена как у P7: `assets/vo-v3/block-N.mp3` → `assets/vo/scene-N.*`).
- Сцены 1–3 переиспользуются в `video/landing-before-after` без изменений (решение 008 17:12).
- Листы кадров: `film/snapshots/` (5 кадров + `sheet-overview.jpg`).

```sh
node tools/synth-alignment.mjs   # после правки реплик
node tools/build-index.mjs .     # после правки scenes.json (аргумент — каталог film/)
npm run check                    # = npx hyperframes check, 0 ошибок
```

Рендер MP4 — только в отдельном окне 008, здесь не запускать.
