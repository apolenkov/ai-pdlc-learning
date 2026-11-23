## Why

Решение владельца 27.10.2026 (~18:15, TASK-727): в CI оставить только те сборки, которые нужны
DevOps, остальное убрать и переносить на `pre-push`. Сборка сайта тяжёлая (около 185 МиБ, до
30 минут), с 27.10.2026 запускалась вручную и дублировала локальную `npm run build:site`;
поэтому job `build-site` убран, а в CI остаётся одна ручная выкладка Pages.

## What Changes

- Удалить job `build-site` из `.gitlab-ci.yml`; `workflow` и job `pages` не меняются.
- Сборку сайта проверять локально командой `npm run build:site` — она уже выполняется в `pre-push`.
- В требовании `source-quality` заменить проверку форматирования «в source-checks job» на локальный
  маршрут `pre-push`: проверок качества в CI нет.
- Согласовать README, `docs/BOUNDARIES.md` и решение от 15.10.2026 с новым состоянием CI.

## Impact

Меняются `.gitlab-ci.yml`, README, `docs/decisions/2026-10-15-blocking-quality-gates.md`,
`docs/BOUNDARIES.md` и спецификация `source-quality`. Скрипты сборки и проверок, тесты
`check-site-package` и `pages-videos` не меняются: они читают только job `pages`.
Публикация Pages, её включение (`PAGES_ENABLED`) и подключение DevOps остаются за владельцем.
