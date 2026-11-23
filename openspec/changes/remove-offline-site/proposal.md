## Why

22.11.2026 владелец решил убрать офлайн-версию сайта: «легче тогда удалить редим». В распакованном `site-offline.zip`
Chrome не пускает окно схемы PDLC на другой локальный файл, поэтому ссылка «Источник» там не работает. В опросе выбрано
«Убрать офлайн-версию целиком»: пропадают скачивание ZIP, его тесты и упоминания в гайдах, а без сети курсом больше не
воспользоваться. Онлайн курс работает как прежде.

## What Changes

- `scripts/build-learning-pages.ts` перестаёт создавать `dist/site/site-offline.zip`; модуль `scripts/offline-site.ts`, его
  тест и `stryker.offline.config.json` удаляются.
- Список файлов сайта, на который опираются тесты, сохраняется отдельным модулем `scripts/site-file-list.ts`
  (`SITE_FILE_LIST`) с прежним содержимым.
- С карты курса (`guides/index.html`) снимается карточка «Без сети» со ссылкой на ZIP; в блоке «Как пользоваться картой»
  остаются четыре карточки.
- Из `package.json`, `package-lock.json` и `lefthook.yml` убираются зависимость `jszip`, скрипт `mutation:offline` и его
  запуск в pre-push; `stryker.guard.config.json` получает сдвиг диапазона строк.
- README, `docs/BOUNDARIES.md` и `docs/pages/sdlc-development/DESIGN.md` не упоминают офлайн-архив.
- Требование «Complete film catalog on the home page» перестаёт обещать запись в offline ZIP.
- Ролик «Карта» (`video/block-map`, сцена 5) больше не говорит «Без сети курс открывается из архива»: дубль озвучки
  обрезан на паузе после «вернуться к любому шагу.» без новой генерации голоса, сцена показывает четыре карточки,
  субтитры, главы, раскадровка, пины роликов и архив источников обновлены.
- Не меняются: остальные ролики и их субтитры, tar.gz-пакет публичного сайта (`check-site-package.ts`,
  `.gitlab-ci.yml`), онлайн-работа курса.

## Impact

Затронуты `scripts/` (сборка, тесты, превью), `docs/pages/sdlc-development/guides/index.html`, `package.json`,
`package-lock.json`, `lefthook.yml`, `stryker.guard.config.json`, README и документы. Спецификация: `course-home`.
Читатель без сети курс больше не откроет: решение владельца от 22.11.2026. Ролик «Карта» и его источники
(`video/block-map/video-manifest.json`, `sources-manifest.json`) получают новые версии; их файлы выкладывает выпуск.
