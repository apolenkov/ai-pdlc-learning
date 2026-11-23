# source-quality Specification

## Purpose
Требования к качеству авторского исходного кода: типизированный lint без подавлений, лимиты сложности и размера, проверка форматирования в хуках и в source-checks.

## Requirements

### Requirement: Reject unsafe and oversized authored source

Source quality checks SHALL use typed semantic lint with no inline configuration
and zero warnings. Authored scripts, browser guides and standards checks SHALL
be included. Generated output and local runtime directories SHALL be excluded.
Complexity SHALL be at most 20, function length at most 100 lines and file length
at most 500 lines. TS7 SHALL remain the compiler; parser compatibility SHALL be explicit.

#### Scenario: Unsafe code or suppression attempts enter the source

- **GIVEN** valid source passes the quality gate
- **WHEN** an unsafe assignment or an unhandled promise is introduced
- **THEN** the gate fails with the owning semantic rule
- **AND** an inline disable cannot make the violation pass

#### Scenario: Source exceeds a configured limit

- **GIVEN** authored source is included in the quality inventory
- **WHEN** complexity exceeds 20, a function exceeds 100 lines or a file exceeds 500 lines
- **THEN** the gate fails with the corresponding limit rule

### Requirement: Verify authored source formatting in the delivery route

Normal hooks and the existing source-checks job SHALL check authored source with
the shared Prettier configuration. A formatting violation SHALL fail the route.
Behavioral tests SHALL continue to validate the course after source changes.

#### Scenario: Incorrectly formatted source is submitted

- **GIVEN** a formatted source file passes the formatter check
- **WHEN** formatting is broken without changing its semantics
- **THEN** the formatter check exits nonzero
