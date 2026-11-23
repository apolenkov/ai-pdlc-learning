# Changelog

## Unreleased

- Added sections: boundary between the analyst specification and `design.md`, exceptions to the rules, urgent changes.
- Added the merge request template `templates/gitlab/merge_request_templates/Default.md`
  (three review marks, manual rule for GitLab CE) and required it in `doctor`.
- Review control: three marks (project manager, analyst who is not the author, tech lead);
  the architect adds a fourth by criteria or on dispute.
- Added the stage-1 intent template `templates/intent.md` («Намерение и план»)
  and the structure check `tools/intent-lint.ts` (`analysis` and `stage1` modes,
  `npm run intent:lint`); analysis-course intents stay valid without edits.

## 0.1.0-draft — 2026-08-27

- Defined six process variants and their observable evidence.
- Separated product and service ownership.
- Added a safe snapshot and agent-permission contract.
- Added reference product metarepository files.
- Added a version manifest, platform commands, TypeScript checks and a
  read-only update-plan generator.
