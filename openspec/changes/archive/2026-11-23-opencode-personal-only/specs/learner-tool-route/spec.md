## ADDED Requirements

### Requirement: OpenCode только на личном компьютере

Курс SHALL предлагать OpenCode только на личном компьютере с macOS или Linux. Основной инструмент курса — Kilo Code в VS Code.

#### Scenario: Доменная Windows или VDI

- **WHEN** ученик готовит доменную Windows или VDI для работы с моделью
- **THEN** курс направляет его в Kilo Code в VS Code
- **AND** в инструкции для Windows / VDI и в заявке на установку ПО нет OpenCode и WSL

#### Scenario: Личный компьютер

- **WHEN** ученик выбирает инструмент на личном компьютере с macOS или Linux
- **THEN** курс предлагает OpenCode как необязательную продвинутую альтернативу Kilo Code
- **AND** заголовки блоков установки и продвинутого варианта указывают, что OpenCode предназначен только для личного компьютера
