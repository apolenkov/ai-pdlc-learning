# reference-pages Specification

## Purpose
Справочные страницы курса и место ступеней зрелости анализа: что сайт публикует, куда ведут старые адреса и какие
записи справки не допускаются.

## Requirements

### Requirement: Analysis maturity levels live in the course

Сайт SHALL NOT публиковать страницу `analysis-maturity-map.html`. Главная курса анализа SHALL показывать блок
«Три ступени зрелости анализа» с тремя ступенями; каждая ступень SHALL ссылаться на свой шаг курса 1–3.

#### Scenario: Open the analysis stage from the landing

- **WHEN** читатель открывает раздел «02 · Анализ» на главной сайта
- **THEN** в разделе одна карточка — курс анализа, и ни одна страница сайта не ссылается на `analysis-maturity-map.html`

#### Scenario: Pick a level inside the course

- **WHEN** читатель на главной курса выбирает ступень 2 «Перекрёстная проверка»
- **THEN** открывается шаг курса 2 «Проверяем и согласуем»

### Requirement: Reference pages hold no empty or retired entries

Страницы справки SHALL NOT содержать Wiki.js, строки таблиц из одних прочерков и термины глоссария, которые
определяют только снятую карту зрелости анализа.

#### Scenario: Search the built site

- **WHEN** проверка ищет в собранном сайте «Wiki.js», «Document Cloud», «HiveTrace» и коды ИТ0–ИТ4, ИБ0–ИБ4
- **THEN** совпадений нет

#### Scenario: Count glossary terms

- **WHEN** читатель открывает глоссарий
- **THEN** число терминов в сводке и в каждом разделе совпадает с числом определений в разделе

### Requirement: Course header shows the route backdrop

Шапка главной курса анализа SHALL показывать справа декоративный фон с пунктиром маршрута «П → 1…7 → Д». Фон
SHALL быть скрыт от чтения с экрана, SHALL NOT перекрывать текст шапки и карточку результата и SHALL NOT
показываться при ширине 390 px.

#### Scenario: Desktop header

- **WHEN** главную курса открывают на 1440 px
- **THEN** справа над карточкой результата виден маршрут, а текст и кнопка «Начать» читаются без наложений

#### Scenario: Phone header

- **WHEN** главную курса открывают на 390 px
- **THEN** фона нет, шапка как прежде, горизонтальной прокрутки нет
