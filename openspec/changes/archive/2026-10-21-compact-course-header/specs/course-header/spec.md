## Purpose

Задаёт проверяемое поведение адаптивной навигации курса и воспроизводимого источника сгенерированных страниц.

## ADDED Requirements

### Requirement: Phone header leaves space for course content
The course navigation SHALL preserve the approved CustomDev compact layout and keyboard disclosure behavior.

#### Scenario: Read a course page on a phone
- **WHEN** a page with global navigation is opened at a viewport width of 320 or 390 pixels
- **THEN** the collapsed navigation bottom is at most 64 pixels from the viewport top, controls remain reachable, and the page has no horizontal overflow

#### Scenario: Read the slide position in the collapsed deck header
- **WHEN** the analytics deck is opened on a phone with More closed
- **THEN** the complete slide counter remains visible without clipping, and secondary slide commands remain available through More

#### Scenario: Close the expanded menu with a keyboard
- **WHEN** a reader opens More, focuses a menu destination and presses Escape
- **THEN** the menu closes, aria-expanded is false, and focus returns to More

### Requirement: Generated course sources are reproducible
Generated HTML SHALL be updated only by the canonical CustomDev export and the course navigation updater.

#### Scenario: Build the accepted source
- **WHEN** the course is built from the committed exported source
- **THEN** the build writes only generated output and leaves tracked source unchanged
