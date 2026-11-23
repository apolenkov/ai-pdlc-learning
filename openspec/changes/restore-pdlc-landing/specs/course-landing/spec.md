## ADDED Requirements

### Requirement: Public site opens on the PDLC landing

Корень публичного сайта SHALL быть лендингом «Карта PDLC» с полосой «PDLC: 7 этапов», разделами
«01 · Намерение и план», «02 · Анализ» и «Справка». Каждая ссылка лендинга SHALL вести на страницу публичного сайта.
Лендинг SHALL NOT содержать «Среда и контуры», имя CustomDev и ссылки на корпоративные хосты.

#### Scenario: Drill down from the landing to a stage

- **WHEN** читатель открывает корень сайта и выбирает этап «Анализ требований» или «Намерение и план»
- **THEN** открывается раздел этапа на лендинге, а из него — карта зрелости или курс этапа

#### Scenario: Stage without a public page

- **WHEN** этап не имеет публичной страницы (архитектура, тестирование, выпуск, наблюдение, будущее)
- **THEN** этап показан без ссылки, с подписью «Курс в работе» или как направление

#### Scenario: Course hosted under CustomDev

- **WHEN** сайт собирают с `COURSE_NAV=customdev`
- **THEN** `course/index.html` перенаправляет на `guides/index.html`, а файлы `landing.css` и `landing.js` в сборку курса не входят

#### Scenario: Scroll through the stages

- **WHEN** полоса этапов требует горизонтальной прокрутки
- **THEN** под полосой видна подсказка о прокрутке. Когда этапы помещаются в строку или переносятся на несколько строк, подсказка скрыта

### Requirement: Every page returns to the PDLC map

Меню публичных страниц SHALL содержать «Карта PDLC» и «Справка», ведущие на лендинг (`#sdlc`, `#help`);
страницы курса SHALL показывать «← К карте PDLC».

#### Scenario: Return from a course page

- **WHEN** читатель на странице курса выбирает «Карта PDLC» или «← К карте PDLC»
- **THEN** открывается лендинг на полосе этапов
