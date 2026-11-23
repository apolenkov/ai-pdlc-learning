# Справка собирается в курсе

- Статус: принято владельцем 24.11.2026
- Контекст: TASK-951.01, [OpenSpec change `help-reference-in-course`](../../openspec/changes/help-reference-in-course/proposal.md)

## Контекст

Роли и глоссарий собирали в закрытом `customdev` и копировали в курс. Когда `customdev` ушёл в архив,
править генератор стало негде. Владелец спросил: «почему это не в ai-pdlc learning!?».

## Решение

- Данные ролей и глоссария, шаблоны страниц и сборщик храним в `scripts/help-reference/`.
  Команда `npm run help:build` собирает обе страницы с меню курса.
- Карту намерений и `help-reference.css` правим прямо в `docs/pages/sdlc-development/`.
  Прежний сборщик карты остался в закрытом репозитории.

## Последствия

Справку можно обновить в одном pull request курса. После `npm run help:build` и `npm run site-nav:update`
тест сравнивает роли и глоссарий с файлами в репозитории байт в байт.
