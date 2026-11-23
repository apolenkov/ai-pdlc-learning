import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * pre-push: commitlint over exactly the commits a push sends. A ref whose remote sha this
 * repository has is checked from that sha; a new ref (or an unknown remote sha, as on the first
 * push to an empty repository) is checked over its whole history, root commit included.
 * Deleted refs send no commits.
 */
const ZERO = '0'.repeat(40);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export interface LintRange {
  from?: string;
  to: string;
}

export const lintRanges = (input: string, known: (sha: string) => boolean): LintRange[] => {
  const ranges: LintRange[] = [];
  for (const line of input.split('\n')) {
    const parts = line.trim().split(/\s+/u);
    if (parts.length !== 4) continue;
    const [, local = ZERO, , remote = ZERO] = parts;
    if (local === ZERO) continue;
    ranges.push(remote !== ZERO && known(remote) ? { from: remote, to: local } : { to: local });
  }
  return ranges;
};

const git = (args: string[]): { status: number | null; out: string } => {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return { status: result.status, out: result.stdout.trim() };
};

const commitlint = (args: string[], input?: string): boolean =>
  spawnSync(
    resolve(ROOT, 'node_modules', '.bin', 'commitlint'),
    ['--config', resolve(ROOT, 'commitlint.config.ts'), ...args],
    input === undefined ? { stdio: 'inherit' } : { input, stdio: ['pipe', 'inherit', 'inherit'] },
  ).status === 0;

/** Lints one range; returns false on any failure, including a commit that cannot be read. */
export const lintRange = (range: LintRange): boolean => {
  const to = git(['rev-parse', '--verify', `${range.to}^{commit}`]);
  if (to.status !== 0) return false;
  if (range.from) return commitlint(['--from', range.from, '--to', to.out]);
  let ok = true;
  for (const root of git(['rev-list', '--max-parents=0', to.out]).out.split('\n').filter(Boolean)) {
    const message = git(['log', '-1', '--format=%B', root]);
    ok = commitlint([], message.out) && ok;
    if (root !== to.out) ok = commitlint(['--from', root, '--to', to.out]) && ok;
  }
  return ok;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ranges = lintRanges(
    readFileSync(0, 'utf8'),
    (sha) => git(['cat-file', '-e', sha]).status === 0,
  );
  let ok = true;
  for (const range of ranges) ok = lintRange(range) && ok;
  process.exitCode = ok ? 0 : 1;
}
