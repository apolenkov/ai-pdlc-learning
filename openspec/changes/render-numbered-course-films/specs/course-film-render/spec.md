## ADDED Requirements

### Requirement: One source of course numbers
Конвейер SHALL брать номера и названия шагов из guides/route-steps.json, сохраняя идентификаторы и адреса исходных сцен.

#### Scenario: Delivery and branches
- **WHEN** строится карта из существующего шаблона
- **THEN** подготовка остаётся без номеров, практикум получает номер 7, варианты продукта — 6а и 6б, названия совпадают с меню

### Requirement: Isolated local output
Конвейер SHALL создавать производную копию фильма и отказываться перезаписывать существующий результат, не меняя исходную озвучку и опубликованные файлы.

#### Scenario: Existing result
- **WHEN** целевой mp4 или каталог проекта уже существует
- **THEN** соответствующая операция завершается отказом до перезаписи

### Requirement: Reviewable render evidence
Конвейер SHALL сохранять mp4, полные кадры границ сцен и отчёт с командами, длительностью и sha256; техническая проверка не считается визуальной приёмкой.

#### Scenario: Completed pilot
- **WHEN** рендер успешно завершён
- **THEN** длительность сверена со scenes.json и артефакты доступны для отдельного визуального ревью

### Requirement: Part titles without a total
The twelve course films in TASK-558 SHALL display part numbers without a denominator.

#### Scenario: Generated title and runtime header
- **WHEN** a part title or header is displayed
- **THEN** it identifies the part and its name without an «из M» suffix

### Requirement: One human approval
The review lesson SHALL distinguish reviewer comments from the project manager's approval.

#### Scenario: Current version acceptance
- **WHEN** the analyst and tech lead review the current version through comments
- **THEN** the project manager gives one approval; after a change, comments and approval are renewed on the current version
