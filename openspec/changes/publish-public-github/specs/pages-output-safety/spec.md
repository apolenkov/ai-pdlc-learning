## ADDED Requirements

### Requirement: Published pages use only public addresses

The built site SHALL reference the course and its example repositories only through public addresses:
`github.com/apolenkov/<repository>` for `ai-pdlc-learning`, `ai-pdlc-learning-stage-1`, `-stage-2`,
`-stage-3`, `-stage-4-code`, `-stage-4-requirements`, `git-markdown-intent`, and `apolenkov.github.io/ai-pdlc-learning/`
for the site. Corporate hosts and any other route of the owner's account SHALL NOT appear in the output.

#### Scenario: Example repository link

- **WHEN** a page links an example repository
- **THEN** the link points to `https://github.com/apolenkov/<repository>` and the build check accepts it

#### Scenario: Private owner route

- **WHEN** a page references another repository of the owner's account or a corporate host
- **THEN** the build check lists the page as an offender and the test fails
