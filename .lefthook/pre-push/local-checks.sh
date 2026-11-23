#!/bin/sh
# The pre-push gate. A script job: Lefthook skips a run job when the pushed commits change no file
# (an empty commit), and its message would go out unchecked; a script job runs on every push.
# Lefthook passes the remote name and address as $1 $2 and, with use_stdin, the ref lines Git sends.
set -eu
unset GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE
# The hook input is read once: corp-guard checks every outgoing commit before the other checks.
hook_input=$(cat)
# Git still runs pre-push for an up-to-date push and sends no ref lines: nothing goes out, nothing to check.
# That the ref lines reach this job at all is proven by the empty-commit test in secret-scan-gate.test.ts.
if [ -z "$hook_input" ]; then echo "pre-push: nothing to push, checks skipped" >&2; exit 0; fi
printf '%s\n' "$hook_input" | python3 scripts/corp-guard.py pre-push "$1" "$2"
gitleaks git --no-banner --redact
gitleaks dir --no-banner --redact .
if [ "$(uname -s)" = "Linux" ]; then
  shim_dir=$(mktemp -d)
  trap 'rm -rf "$shim_dir"' EXIT
  cc -shared -fPIC -O2 -o "$shim_dir/pwrite-shim.so" scripts/ci/seccomp-pwrite-shim.c
  cc -O2 -o "$shim_dir/pwrite-shim-test" scripts/ci/seccomp-pwrite-shim.test.c
  LD_PRELOAD="$shim_dir/pwrite-shim.so" "$shim_dir/pwrite-shim-test"
else
  echo "NOT VERIFIED: seccomp shim runtime requires Linux"
fi
npm run audit:high
npm run lint
npm run boundaries
npm run format:check
npm run typecheck
npm run spec:check
npm run test:coverage
npm run mutation:credit
npm run mutation:guard
npm run mutation:course-map
npm run build:site
# The site just built (PAGES_OUTPUT_DIR or dist/site), players included: no outside request, marker or internal name.
node --experimental-strip-types scripts/check-published-site.ts "${PAGES_OUTPUT_DIR:-dist/site}"
gitleaks dir --no-banner --redact "${PAGES_OUTPUT_DIR:-dist}"
# Exactly the pushed commits: from the remote sha, or the whole history on the first push (empty remote).
printf '%s\n' "$hook_input" | node --experimental-strip-types scripts/pre-push-commitlint.ts
