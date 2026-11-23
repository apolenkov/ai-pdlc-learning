## MODIFIED Requirements

### Requirement: Verify authored source formatting in the delivery route

Normal hooks and the local `pre-push` route SHALL check authored source with
the shared Prettier configuration. A formatting violation SHALL fail the route.
The route SHALL NOT depend on CI: the pipeline keeps only the manual Pages
publication. Behavioral tests SHALL continue to validate the course after source
changes.

#### Scenario: Incorrectly formatted source is submitted

- **GIVEN** a formatted source file passes the formatter check
- **WHEN** formatting is broken without changing its semantics
- **THEN** the formatter check exits nonzero
