## 1. CI и документация

- [x] 1.1 Удалить job `build-site`; `workflow` и `pages` оставить без изменений.
- [x] 1.2 Обновить README: сборка локально, в CI только ручной `pages`.
- [x] 1.3 Обновить решение 2026-10-15 и `docs/BOUNDARIES.md`.
- [x] 1.4 Оформить MODIFIED-требование `source-quality` про проверку форматирования.

## 2. Приёмка

- [x] 2.1 `npm test`, `npm run typecheck`, `git diff --check`.
- [x] 2.2 Строгая проверка OpenSpec; тесты, читающие `.gitlab-ci.yml`, проходят.
- [ ] 2.3 При архивации обновить `Purpose` спецификации `source-quality`: там ещё упоминается `source-checks`.
