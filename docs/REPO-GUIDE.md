# Руководство по репозиторию

## Структура и источники

- Исходники сайта: `docs/pages/sdlc-development/`. Тексты гайдов — `guides/guide-stages.ts`, отрисовка — `guides/guide-data.ts`.
- `dist/` — только результат сборки, не правится вручную и не коммитится. `guides/metarepository.html` не существует в исходниках:
  страница строится из двух файлов: `guides/metarepository.md` и `guides/metarepository/01-steps.md`.
- Карта курса на `guides/intent.html` тоже не в странице: между пустыми маркерами `<!-- course-map:start/end -->`
  сборка вставляет генерируемую часть `guides/intent/course-map.html` (пишет `scripts/course-map.ts --write`),
  чтобы страница оставалась ниже лимита agent-size-guard. Правьте страницу, часть не трогайте.
- Стили guides правятся в частях `guides/learning-enhancements/*.css`: `learning-enhancements.css` собирается
  из них и в дереве исходников его нет; новый файл-часть добавляйте в `scripts/learning-enhancements-css.ts`.
- Общая навигация задаётся в `scripts/site-navigation-contract.ts`. После изменения запустите
  `node --experimental-strip-types scripts/update-site-navigation.ts`.
- Маршруты сайта перечислены в `scripts/pages-route-manifest.ts`, ресурсы гайдов — в `scripts/guide-content.ts`.
  Новая страница или файл, которых нет в этих списках, не попадут в сайт: сборка и тесты это проверяют.

- Ролики: исходники в `video/block-*`, mp4 вне Git (GitHub Release `media-v1`, версии и sha256 — в `video-manifest.json`). Не коммитьте mp4 и рендеры;
  правила производства — `skills/course-video/SKILL.md`.

## Рабочие копии и навыки OpenSpec

- Храните рабочие копии в `.worktrees/<ветка>` внутри репозитория. Этот каталог указан в `.gitignore`. Не создавайте рабочие копии в `/tmp`.
- После слияния удаляйте worktree и ветку. Незавершённую работу сохраняйте в коммите.
- Команда `openspec init --tools codex,claude` восстанавливает сгенерированные навыки `openspec-*`. Не добавляйте их в Git.

## Команды

```sh
npm ci
npm run build:site
npm run preview
npm test
npm run typecheck
```

Перед завершением работы запустите `npm test` и `npm run typecheck`. Хуки Git (`lefthook`) не обходите.
