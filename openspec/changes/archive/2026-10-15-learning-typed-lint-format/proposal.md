# Типизированные проверки исходного кода курса

## Why

Оценка TASK-515 обнаружила отсутствие исполняемых semantic lint и format gates
в учебном репозитории. TASK-524 AC2 требует отклонять опасный код, превышение
лимитов сложности/размера и обход проверок, сохраняя существующее поведение курса.

## What Changes

- Штатные ESLint с typescript-eslint и Prettier проверяют authored source.
- Пределы: complexity20, function100, file500; warnings0, noInlineConfig.
- Отрицательные и безопасные controls выполняют настоящие CLI над fs fixtures.
- TS7 остаётся compiler; совместимый TS6 alias используется только typed parser.
- Normal hooks и existing source-checks получают lint/format после clean setup
  и устранения diagnostics. Автоматизация MR route остаётся отдельным AC3.

## Impact

Backlog TASK-524, координатор wrk-42. TASK-519/source guard не изменяется этой веткой.
Стенд и push запрещены; установки и прогоны ждут выделенного окна ведущего.
