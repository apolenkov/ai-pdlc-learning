## MODIFIED Requirements

### Requirement: Analysis maturity levels live in the course

Сайт SHALL NOT публиковать карту зрелости анализа. Её прежний адрес `analysis-maturity-map.html` SHALL быть
заглушкой-переадресацией на блок ступеней `guides/index.html#maturity-levels`. Главная курса анализа SHALL показывать блок
«Три ступени зрелости анализа» с тремя ступенями; каждая ступень SHALL ссылаться на свой шаг курса 1–3.

#### Scenario: Open the analysis stage from the landing

- **WHEN** читатель открывает раздел «02 · Анализ» на главной сайта
- **THEN** в разделе одна карточка — курс анализа, и ни одна страница сайта не ссылается на `analysis-maturity-map.html`

#### Scenario: Open the old map address

- **WHEN** читатель открывает старую ссылку `analysis-maturity-map.html`, в том числе с якорем
- **THEN** открывается блок «Три ступени зрелости анализа» на главной курса

#### Scenario: Pick a level inside the course

- **WHEN** читатель на главной курса выбирает ступень 2 «Перекрёстная проверка»
- **THEN** открывается шаг курса 2 «Проверяем и согласуем»
