## 1. Сборка и список файлов

- [x] 1.1 Создать `scripts/site-file-list.ts` с `SITE_FILE_LIST` (содержимое прежнего `OFFLINE_SITE_ALLOWLIST`).
- [x] 1.2 Перевести `build-learning-pages.test.ts` и `harness-levels.test.ts` на `SITE_FILE_LIST`.
- [x] 1.3 Убрать вызов `writeOfflineArchive` из `scripts/build-learning-pages.ts`.
- [x] 1.4 Удалить `scripts/offline-site.ts`, `scripts/offline-site.test.ts`, `stryker.offline.config.json`; убрать офлайн-тест из
      `scripts/site-navigation-contract.test.ts`.

## 2. Карта курса и документы

- [x] 2.1 Снять карточку «Без сети» с `guides/index.html`; тест карты ждёт четыре карточки и отсутствие ZIP.
- [x] 2.2 Обновить README, `docs/BOUNDARIES.md`, `docs/pages/sdlc-development/DESIGN.md` и комментарии в коде.

## 3. Зависимости и гейты

- [x] 3.1 `npm uninstall jszip`; убрать `mutation:offline` из `package.json`, `lefthook.yml`, `scripts/boundaries-gate.test.ts`.
- [x] 3.2 `stryker.guard.config.json`: диапазон `122-191` → `121-190`.

## 4. Приёмка

- [x] 4.1 `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run boundaries`, `npm run spec:check`.
- [x] 4.2 `npm run test:coverage`: пороги `.c8rc.json` не снижены; `npm run mutation:guard`.
- [x] 4.3 `PAGES_WITH_VIDEO=1 npm run build:site`; в `dist/site` нет `site-offline.zip`.
- [x] 4.4 Кадры карты курса при 1440, 1024 и 390 px целиком: четыре карточки, без обрезки и наложения.
- [x] 4.5 Ролик «Карта»: сцена 5 без обещания архива, рендер 720p и 1080p, пины и архив источников.
- [ ] 4.6 Выложить три новых пакета ролика «Карта» (720p `563d14082c1d`, мастер `b904db304045`, источники
      `8a2b7b708914`) до сборки сайта с роликами: выпуск TASK-923, Release `media-v1`.
