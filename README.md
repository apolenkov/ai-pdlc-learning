# ai-pdlc-learning

Курс «Анализ с ИИ-агентами»: путь аналитика от запроса бизнеса к проверяемым требованиям в Git.
Markdown, Git, GitLab, SDD и OpenSpec на одном учебном примере — кредитном калькуляторе.

[Открыть курс](https://apolenkov.github.io/ai-pdlc-learning/) · [Исходники на GitHub](https://github.com/apolenkov/ai-pdlc-learning)

## Что здесь

```text
docs/pages/sdlc-development/     исходники сайта курса (HTML, CSS, TS), единственный источник
├─ guides/                       учебный маршрут: введение, С1–С4, практикум, гайд Git и Markdown
│  ├─ guide-stages.ts            тексты и шаги всех гайдов (данные)
│  ├─ guide-data.ts              отрисовка гайдов в браузере
│  ├─ assets/ examples/          снимки экрана и учебные примеры
│  └─ metarepository.md + metarepository/01-steps.md  техническое руководство по метарепозиторию (текст собирается из двух файлов)
├─ examples/credit-calculator.*  исходная версия учебного калькулятора
├─ corporate-resources.html      системы и инструменты, нужные на этапах курса
├─ harness-levels.html           ступени harness и Dark Factory (от базы к фабрике)
└─ analytics-process-sdd.html    обзор SDD и OpenSpec в 7 слайдах
standards/sdlc-analysis-standard/  стандарт и шаблоны рабочей папки аналитика
skills/setup-analysis-workspace/   учебный навык подготовки рабочего места
skills/course-video/              правила производства роликов курса
video/                           исходники роликов (озвучка, сцены, раскадровки); mp4 в Git нет
scripts/                         сборка сайта, предпросмотр, проверки
docs/COURSE-RULES.md              правила оформления курса (проверки в npm test)
dist/                            результат сборки (в Git не попадает)
```

Исходники и результат сборки разделены: сборка только читает исходники и пишет в `dist/site`.

## Быстрый старт

Нужен Node.js из `.nvmrc` и npm.

```sh
npm ci
npm run build:site    # собирает сайт в dist/site
npm run preview       # http://127.0.0.1:4177/
npm test              # тесты сборки, гайдов, калькулятора и стандарта
npm run typecheck
```

## Видео

Готовые ролики лежат в [релизе media-v1](https://github.com/apolenkov/ai-pdlc-learning/releases/tag/media-v1).
Имя файла в релизе начинается с первых 12 символов SHA-256. Полная контрольная сумма и размер указаны в `video-manifest.json`.

```sh
npm run video:fetch
npm run build:site
```

Первая команда скачивает ролики без авторизации и проверяет размер и SHA-256. Без локального mp4 сборка скрывает плеер.
Ролик П2 (`block-0a`) исключён из выпуска. Записи экрана и озвучка остаются у автора. Правила производства — в [руководстве по видео](skills/course-video/SKILL.md).

## Публикация

[Workflow Pages](.github/workflows/pages.yml) скачивает ролики, собирает сайт и сверяет готовые файлы с манифестами.
Для pull request он проверяет сборку. Из `main` публикует её на [GitHub Pages](https://apolenkov.github.io/ai-pdlc-learning/).
В настройках репозитория для Pages выберите источник GitHub Actions.

## Как посмотреть свою правку

```sh
git switch <ветка вашей правки>
npm ci
npm run build:site
npm run preview       # http://127.0.0.1:4177/
```

Остановить — `Ctrl+C`. Если правки не видно, обновите страницу без кэша (`Cmd+Shift+R` / `Ctrl+Shift+R`).

## Ревью курса

Для замечания откройте issue и укажите страницу и шаг. Исправления присылайте через pull request. Что проверять на каждой странице — [docs/review/CHECKLIST.md](docs/review/CHECKLIST.md).

## Как внести правку

1. Сделайте fork проекта на GitHub и ветку от `main`.
2. Правьте исходники в `docs/pages/sdlc-development/`; `dist/` не коммитьте.
3. Запустите `npm test` и `npm run typecheck`, соберите сайт и посмотрите изменённые страницы.
4. Сообщение коммита по Conventional Commits, например `docs(guides): уточнить шаг 3 в С1`.
5. Откройте pull request в `main`. Подробнее — в [CONTRIBUTING.md](CONTRIBUTING.md), правила для ИИ-агентов — в [AGENTS.md](AGENTS.md).

## Генерируемые страницы

Страницы ролей, глоссария и карт зрелости обновляйте из генератора CustomDev через pull request.
После обновления запустите `npm run site-nav:update`. Тест `scripts/generated-pages-marker.test.ts` проверяет маркеры генератора.

## Что в курс не входит

Командные материалы, корпоративные навыки, внутренние данные и защищённые страницы остаются за [границами публикации](docs/BOUNDARIES.md).
