# Agent rules

This profile is for analysis and review.

## Allowed

- read files inside this metarepository;
- read an explicitly selected read-only service snapshot;
- run allowlisted validation and test commands;
- propose changes as text or a patch for human review.

## Denied by default

- edit, write, or patch application code;
- mutating shell commands;
- Git push or branch protection changes;
- access to directories outside the metarepository and approved snapshot root;
- arbitrary network access;
- spawning child agents;
- reading or printing secrets.

The same restrictions apply to any delegated process. A human approves the final specification and every merge request.
