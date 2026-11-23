## MODIFIED Requirements

### Requirement: Generated course sources are reproducible
Generated HTML SHALL be updated only by the course reference generator (`npm run help:build`) and the course navigation updater.

#### Scenario: Build the accepted source
- **WHEN** the course is built from the committed exported source
- **THEN** the build writes only generated output and leaves tracked source unchanged

#### Scenario: Rebuild the reference pages
- **WHEN** a contributor runs `npm run help:build` and then `npm run site-nav:update` on a clean checkout
- **THEN** `roles.html` and `glossary.html` come out byte for byte as committed and `git status` stays clean
