## ADDED Requirements

### Requirement: Fourth preparation guide
The course SHALL publish preparation guide four from the tracked metarepository Markdown, with a shared route, accessible distinct icon, and names from the course registry.

#### Scenario: Read the fourth preparation guide
- **WHEN** a learner follows preparation after SDD and OpenSpec
- **THEN** the map and guides 1–3 link to `p4-metarepository.html`, its route selects the fourth preparation node, and its next step is the first practice guide
- **AND** the old `metarepository.html` address preserves anchors when forwarding to the new guide
- **AND** no video is required for the new guide

#### Scenario: Read on a phone
- **WHEN** a learner reads the guide or map at 390 pixels wide, at rest or after scrolling
- **THEN** content and navigation remain readable without page overflow or overlap

### Requirement: Unified lifecycle names
The course SHALL name the model PDLC and its seven stages Намерение и план, Анализ требований, Архитектура и дизайн, Реализация, Тестирование, Выпуск, Наблюдение from the course registry.

#### Scenario: Explain the lifecycle
- **WHEN** the learner reads the course introduction
- **THEN** its lifecycle names match the registry and are distinct from the numbered practice steps
