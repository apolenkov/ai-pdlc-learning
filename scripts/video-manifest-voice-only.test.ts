import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const VOICE_ONLY = 'voice-only';

/** Films whose audio is not yet rebuilt as voice-only (TASK-671 rollout). The list may only shrink:
 * a film that already carries `"audio": "voice-only"` must be removed from it.
 *
 * How a rollout release updates this file: when it adds `"audio": "voice-only"` to a film's manifest,
 * it (1) deletes that film's line from the list below and (2) lowers PENDING_CEILING by the number of
 * deleted lines. Nothing else changes. Adding a film to the list, or deleting lines without lowering the
 * ceiling, fails the "only shrinks" test. */
const VOICE_ONLY_PENDING: readonly string[] = ['landing-overview-long2', 'landing-pdlc'];

/** Exactly the current length of VOICE_ONLY_PENDING: a ratchet, lowered together with the list and never raised. */
const PENDING_CEILING = 2;

/** Manifest of block-0a lives outside `video/`, next to the course page that shows it. */
const BLOCK_0A_MANIFEST = [
  'docs',
  'pages',
  'sdlc-development',
  'guides',
  'assets',
  'video',
  'video-manifest.json',
];

/** Films that keep their old audio on purpose, with the reason. A film leaves this list only when it gets the field. */
const VOICE_ONLY_EXCEPTIONS: Readonly<Record<string, string>> = {};

const audioInManifest = async (file: string): Promise<unknown> => {
  const manifest: unknown = JSON.parse(await readFile(file, 'utf8'));
  assert.ok(
    manifest !== null && typeof manifest === 'object',
    `${file}: manifest is not an object`,
  );
  return 'audio' in manifest ? manifest.audio : undefined;
};
const audioOf = (dir: string): Promise<unknown> =>
  audioInManifest(resolve(root, 'video', dir, 'video-manifest.json'));

const films = async (): Promise<string[]> => {
  const entries = await readdir(resolve(root, 'video'), { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const withManifest: string[] = [];
  for (const dir of dirs.sort()) {
    const names = await readdir(resolve(root, 'video', dir));
    if (names.includes('video-manifest.json')) withManifest.push(dir);
  }
  return withManifest;
};

const exceptionDirs = Object.keys(VOICE_ONLY_EXCEPTIONS);

await test('TASK-688 v3: voice-only exceptions are empty and cannot grow back', () => {
  assert.deepEqual(exceptionDirs, []);
});

await test('video manifests: audio is voice-only unless the film is pending or an exception', async () => {
  const bad: string[] = [];
  for (const dir of await films()) {
    const audio = await audioOf(dir);
    if (audio === VOICE_ONLY) continue;
    if (audio !== undefined) bad.push(`${dir}: audio=${JSON.stringify(audio)}`);
    else if (!VOICE_ONLY_PENDING.includes(dir) && !exceptionDirs.includes(dir))
      bad.push(
        `${dir}: no "audio": "voice-only" and not in VOICE_ONLY_PENDING / VOICE_ONLY_EXCEPTIONS`,
      );
  }
  assert.deepEqual(bad, []);
});

await test('VOICE_ONLY_PENDING and VOICE_ONLY_EXCEPTIONS name only existing films, once, with no overlap', async () => {
  const known = await films();
  const listed = [...VOICE_ONLY_PENDING, ...exceptionDirs];
  assert.deepEqual(
    listed.filter((dir) => !known.includes(dir)),
    [],
    'unknown film in the lists',
  );
  assert.equal(new Set(listed).size, listed.length, 'a film is listed twice');
});

await test('manifest of block-0a (outside video/) carries "audio": "voice-only"', async () => {
  assert.equal(await audioInManifest(resolve(root, ...BLOCK_0A_MANIFEST)), VOICE_ONLY);
});

await test('VOICE_ONLY_PENDING only shrinks: a film that already has the field is removed, and no film is added', async () => {
  assert.equal(
    VOICE_ONLY_PENDING.length,
    PENDING_CEILING,
    'VOICE_ONLY_PENDING only shrinks: lower PENDING_CEILING together with the list (never raise it, never add a film)',
  );
  const stale: string[] = [];
  for (const dir of [...VOICE_ONLY_PENDING, ...exceptionDirs]) {
    if ((await audioOf(dir)) === VOICE_ONLY) stale.push(dir);
  }
  assert.deepEqual(
    stale,
    [],
    'already voice-only: remove from VOICE_ONLY_PENDING / VOICE_ONLY_EXCEPTIONS',
  );
});

await test('VOICE_ONLY_EXCEPTIONS carry a reason', () => {
  for (const [dir, reason] of Object.entries(VOICE_ONLY_EXCEPTIONS)) {
    assert.ok(reason.trim().length > 20, `${dir}: reason is empty`);
  }
});
