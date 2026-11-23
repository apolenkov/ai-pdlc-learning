#!/usr/bin/env python3
"""corp-guard: keeps real corporate addresses, mail and names out of this repository.

The stop list lives outside Git (default ~/.config/customdev-learning/stoplist.tsv, override with
CORP_GUARD_STOPLIST): one `label<TAB>regex` per line, case-insensitive unless the label starts
with `CS:`. Without the stop list every mode fails: the guard never passes silently. A contributor
who has no stop list turns the guard off out loud with CORP_GUARD_STOPLIST=none (CONTRIBUTING.md):
every mode then prints that it was skipped and exits 0. A stop list at the default path wins over
`none`: an opt-out left in a maintainer's shell does not switch the guard off.

Optional allow list next to it (guard-allow.tsv, override CORP_GUARD_ALLOW): `<blob sha><TAB>note`.
A listed blob is a reviewed false positive (for example random bytes of an mp3 that spell a rule);
its content is not scanned, its paths still are.

Modes (wired in lefthook.yml):
  pre-commit            staged files (added, copied, modified, renamed, type-changed) and their
                        paths, author and committer identity
  commit-msg FILE       the commit message
  pre-push REMOTE URL   hook stdin; for every pushed ref: the ref names, annotated tags (message,
                        tagger, nested tags), every outgoing commit (message, author, committer),
                        the full path list of each outgoing commit's tree and the content of every
                        outgoing blob. A new branch is checked against its whole history; only
                        objects reachable from the target remote's own tracking refs (remote name
                        configured with the same URL) are taken as already published.

Content: a NUL-free blob is read as UTF-8. NUL never means "safe": UTF-16 text (by BOM, or by
the share of NUL bytes without one) is decoded whole, and in every blob with NUL the readable runs
(ASCII and Cyrillic) are searched as UTF-8, UTF-16LE and UTF-16BE at any byte offset.
Findings name the rule and a place with the match replaced by [redacted], never the matched text.
Exit 1 on any finding.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ZERO = "0" * 40
CFG = Path.home() / ".config" / "customdev-learning"


def load_rules() -> list[tuple[str, re.Pattern[str]]]:
    path = Path(os.environ.get("CORP_GUARD_STOPLIST", str(CFG / "stoplist.tsv")))
    if not path.is_file():
        sys.exit(
            f"corp-guard: stop list not found ({path}); the check cannot run. "
            "Without a stop list set CORP_GUARD_STOPLIST=none, see CONTRIBUTING.md"
        )
    rules = []
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        label, sep, rx = line.partition("\t")
        if not sep:
            sys.exit(f"corp-guard: {path}:{n}: expected label<TAB>regex")
        flags = 0 if label.startswith("CS:") else re.IGNORECASE
        rules.append((label.removeprefix("CS:"), re.compile(rx, flags | re.MULTILINE)))
    if not rules:
        sys.exit(f"corp-guard: stop list {path} is empty")
    return rules


def load_allow() -> set[str]:
    """Blob ids (40 hex) of reviewed false positives; any other non-comment line stops the guard."""
    path = Path(os.environ.get("CORP_GUARD_ALLOW", str(CFG / "guard-allow.tsv")))
    if not path.is_file():
        return set()
    allow = set()
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        sha = line.split("\t", 1)[0]
        if not re.fullmatch(r"[0-9a-f]{40}", sha):
            sys.exit(f"corp-guard: {path}:{n}: expected <40-hex blob id><TAB>note")
        allow.add(sha)
    return allow


def git(*args: str, data: bytes | None = None) -> bytes:
    return subprocess.run(["git", *args], input=data, capture_output=True, check=True).stdout


# Readable runs in bytes with NUL: ASCII and Cyrillic in UTF-8, UTF-16LE and UTF-16BE.
RUNS = (
    (re.compile(rb"(?:[\t\x20-\x7e]|[\xd0\xd1][\x80-\xbf]){4,}"), "utf-8"),
    (re.compile(rb"(?:[\t\x20-\x7e]\x00|[\x00-\x5f]\x04){4,}"), "utf-16-le"),
    (re.compile(rb"(?:\x00[\t\x20-\x7e]|\x04[\x00-\x5f]){4,}"), "utf-16-be"),
)


def utf16(blob: bytes) -> str | None:
    """UTF-16 text by BOM, or without BOM when one byte of each pair is mostly NUL."""
    if blob[:2] in (b"\xff\xfe", b"\xfe\xff"):
        return blob.decode("utf-16", "replace")
    head = blob[:8192]
    even, odd = head[0::2], head[1::2]
    if len(head) >= 8 and odd.count(0) > 0.3 * len(odd) and even.count(0) < 0.05 * len(even):
        return blob[: len(blob) // 2 * 2].decode("utf-16-le", "replace")
    if len(head) >= 8 and even.count(0) > 0.3 * len(even) and odd.count(0) < 0.05 * len(odd):
        return blob[: len(blob) // 2 * 2].decode("utf-16-be", "replace")
    return None


def runs(blob: bytes, rx: re.Pattern[bytes], enc: str) -> str:
    """Runs found at any byte offset; UTF-16 units are two bytes, so every run decodes whole."""
    return "\n".join(m.group(0).decode(enc, "replace") for m in rx.finditer(blob))


# Adjacent quoted literals joined by `,` or `+` ("a" + "b", ['a', 'b'].join('')): a value split
# into pieces is checked as one string too.
LITERAL_RUN = re.compile(r"""(['"`])[^'"`\n]{0,80}\1(?:\s*[,+]\s*(['"`])[^'"`\n]{0,80}\2)+""")
LITERAL = re.compile(r"""(['"`])([^'"`\n]{0,80})\1""")


def joined(text: str) -> str:
    return "\n".join("".join(m.group(2) for m in LITERAL.finditer(run.group(0))) for run in LITERAL_RUN.finditer(text))


def views(blob: bytes) -> list[str]:
    """Text to check. A NUL-free blob is UTF-8. A blob with NUL is never skipped: UTF-16 text is
    decoded whole, and in any case the readable runs of the raw bytes are checked as UTF-8,
    UTF-16LE and UTF-16BE (ASCII and Cyrillic), so strings inside binaries are covered."""
    if b"\0" not in blob:
        text = blob.decode("utf-8", "replace")
        return [text, joined(text)]
    out = [runs(blob, rx, enc) for rx, enc in RUNS]
    text = utf16(blob)
    return out if text is None else [text, *out]


class Batch:
    """One `git cat-file --batch` process for all object reads."""

    def __init__(self) -> None:
        self.proc = subprocess.Popen(["git", "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)

    def read(self, sha: str) -> tuple[str, bytes]:
        assert self.proc.stdin and self.proc.stdout
        self.proc.stdin.write(sha.encode() + b"\n")
        self.proc.stdin.flush()
        header = self.proc.stdout.readline().split()
        if len(header) < 3:
            raise RuntimeError(f"corp-guard: cannot read object {sha[:12]}")
        data = self.proc.stdout.read(int(header[2]))
        self.proc.stdout.read(1)
        return header[1].decode(), data


class Guard:
    def __init__(self) -> None:
        self.rules = load_rules()
        self.allow = load_allow()
        self.findings: list[str] = []

    def hits(self, text: str) -> list[str]:
        return [label for label, rx in self.rules if rx.search(text)]

    def redact(self, text: str) -> str:
        for _, rx in self.rules:
            text = rx.sub("[redacted]", text)
        return text

    def check(self, text: str, where: str) -> None:
        for label in self.hits(text):
            self.findings.append(f"{label}: {self.redact(where)}")

    def check_name(self, text: str, kind: str) -> None:
        for label in self.hits(text):
            self.findings.append(f"{label}: {kind} {self.redact(text)}")

    def check_bytes(self, data: bytes, where: str) -> None:
        """Messages, commit and tag objects: always checked, the allow list does not apply."""
        for view in views(data):
            for label in self.hits(view):
                self.findings.append(f"{label}: {self.redact(where)}")

    def check_blob(self, sha: str, blob: bytes, where: str) -> None:
        """File content: skipped only when its blob id is on the allow list."""
        if sha not in self.allow:
            self.check_bytes(blob, where)

    def finish(self, mode: str) -> int:
        if not self.findings:
            return 0
        print(f"corp-guard ({mode}): {len(set(self.findings))} finding(s); replace with neutral values, see README", file=sys.stderr)
        for f in sorted(set(self.findings)):
            print(f"  {f}", file=sys.stderr)
        return 1


def identities(g: Guard) -> None:
    for var in ("GIT_AUTHOR_IDENT", "GIT_COMMITTER_IDENT"):
        ident = git("var", var).decode("utf-8", "replace").rsplit(" ", 2)[0]
        g.check(ident, var.lower().replace("_", " "))


def pre_commit() -> int:
    g = Guard()
    identities(g)
    entries = git("diff", "--cached", "--raw", "-z", "--no-abbrev", "--diff-filter=ACMRT").split(b"\0")
    i = 0
    while i < len(entries) - 1:
        _, mode, _, sha, status = entries[i].decode().split()
        i += 3 if status[0] in "RC" else 2
        path = entries[i - 1].decode("utf-8", "replace")
        g.check_name(path, "path")
        if mode != "160000":  # a submodule commit has no content here
            g.check_blob(sha, git("cat-file", "blob", sha), path)
    return g.finish("pre-commit")


def commit_msg(path: str) -> int:
    g = Guard()
    g.check_bytes(Path(path).read_bytes(), "commit message")
    return g.finish("commit-msg")


def published(remote: str, url: str) -> list[str]:
    """Tracking refs of the target remote, only when `remote` is configured with this very URL."""
    try:
        urls = {git("remote", "get-url", remote).decode().strip(), git("remote", "get-url", "--push", remote).decode().strip()}
    except subprocess.CalledProcessError:
        return []
    if url not in urls:
        return []
    refs = git("for-each-ref", "--format=%(objectname)", f"refs/remotes/{remote}/").decode().split()
    return [f"^{r}" for r in refs]


def tree_paths(batch: Batch, tree: str, prefix: str, seen: set[tuple[str, str]], out: set[str]) -> None:
    if (tree, prefix) in seen:
        return
    seen.add((tree, prefix))
    _, data = batch.read(tree)
    pos = 0
    while pos < len(data):
        sp = data.index(b" ", pos)
        nul = data.index(b"\0", sp)
        mode, name = data[pos:sp], data[sp + 1 : nul].decode("utf-8", "replace")
        sha = data[nul + 1 : nul + 21].hex()
        pos = nul + 21
        path = prefix + name
        out.add(path)
        if mode == b"40000":
            tree_paths(batch, sha, path + "/", seen, out)


def check_tag(g: Guard, batch: Batch, sha: str, ref: str) -> tuple[str, str]:
    """Annotated tag objects along the chain: message and tagger of each. Returns the target."""
    while True:
        typ, data = batch.read(sha)
        if typ != "tag":
            return typ, sha
        g.check_bytes(data, f"tag object of {ref}")
        sha = data.split(b"\n", 1)[0].split()[1].decode()


def pre_push(stdin: str, remote: str, url: str) -> int:
    g = Guard()
    batch = Batch()
    exclude = published(remote, url)
    seen: set[tuple[str, str]] = set()
    paths: set[str] = set()
    blobs: dict[str, str] = {}
    for line in stdin.splitlines():
        parts = line.split()
        if len(parts) != 4:
            continue
        local_ref, local_sha, remote_ref, remote_sha = parts
        g.check_name(local_ref, "local ref")
        g.check_name(remote_ref, "remote ref")
        if local_sha == ZERO:
            continue
        typ, target = check_tag(g, batch, local_sha, remote_ref)
        if typ == "tree":
            tree_paths(batch, target, "", seen, paths)
        known = remote_sha != ZERO and subprocess.run(["git", "cat-file", "-e", remote_sha], capture_output=True).returncode == 0
        rng = [local_sha, f"^{remote_sha}"] if known else [local_sha, *exclude]
        for sha in git("rev-list", *rng).decode().split():
            _, commit = batch.read(sha)
            g.check_bytes(commit, f"commit {sha[:12]}")
            tree = commit.split(b"\n", 1)[0].split()[1].decode()
            tree_paths(batch, tree, "", seen, paths)
        objs = git("rev-list", "--objects", "--no-object-names", *rng)
        for ln in git("cat-file", "--batch-check=%(objectname) %(objecttype)", data=objs).decode().splitlines():
            sha, typ = ln.split()
            if typ == "blob":
                blobs.setdefault(sha, remote_ref)
    for p in paths:
        g.check_name(p, "path")
    for sha, ref in blobs.items():
        _, data = batch.read(sha)
        g.check_blob(sha, data, f"blob {sha[:12]} (pushed to {ref})")
    return g.finish("pre-push")


def main(argv: list[str]) -> int:
    mode = argv[1] if len(argv) > 1 else ""
    if mode in ("pre-commit", "commit-msg", "pre-push") and os.environ.get("CORP_GUARD_STOPLIST") == "none":
        if not (CFG / "stoplist.tsv").is_file():
            print(f"corp-guard ({mode}): skipped, CORP_GUARD_STOPLIST=none", file=sys.stderr)
            return 0
        print(
            f"corp-guard ({mode}): CORP_GUARD_STOPLIST=none ignored, "
            "the stop list at ~/.config/customdev-learning/stoplist.tsv is used",
            file=sys.stderr,
        )
        del os.environ["CORP_GUARD_STOPLIST"]
    if mode == "pre-commit":
        return pre_commit()
    if mode == "commit-msg" and len(argv) > 2:
        return commit_msg(argv[2])
    if mode == "pre-push":
        return pre_push(sys.stdin.read(), argv[2] if len(argv) > 2 else "", argv[3] if len(argv) > 3 else "")
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
