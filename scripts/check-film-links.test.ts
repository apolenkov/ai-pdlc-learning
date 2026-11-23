import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

import { PLAYER, intentFilmLinksProblem, sourceFilmRows, trackOk } from './check-film-links.ts';

/** Contract model of a track element: a real .vtt src, readyState 2 = LOADED, 3 = ERROR; cues are parsed only on success. */
type TrackModel = { src: string; readyState: number; cues: { length: number } | null };

const track = (readyState: number, cues: { length: number } | null): TrackModel => ({
  src: 'http://localhost/guides/assets/video/film.vtt',
  readyState,
  cues,
});

await test('trackOk requires a loaded track with parsed cues, not a .vtt URL', () => {
  assert.equal(trackOk(null), false);
  assert.equal(trackOk(undefined), false, 'no track element at all');
  assert.equal(trackOk(track(1, null)), false, 'still loading');
  assert.equal(trackOk(track(3, null)), false, '404 or broken VTT: ERROR without cues');
  assert.equal(trackOk(track(2, null)), false, 'loaded but no parsed cues');
  assert.equal(trackOk(track(2, { length: 0 })), false, 'empty subtitle file');
  assert.equal(trackOk(track(2, { length: 3 })), true, 'loaded and parsed cues');
  assert.equal(
    trackOk({ track: track(2, { length: 1 }) }),
    true,
    'a wrapper whose TextTrack carries readyState',
  );
  assert.equal(
    trackOk({ readyState: 2, track: { src: 'film.vtt', cues: { length: 2 } } }),
    true,
    'a real HTMLTrackElement: readyState on the element, cues on the TextTrack',
  );
  assert.equal(
    trackOk({ readyState: 3, track: { src: 'film.vtt', cues: null } }),
    false,
    'a real failed HTMLTrackElement',
  );
});

/** The player probe runs in the page; a compact DOM model is enough to exercise its contract. */
const runProbe = async (model: TrackModel): Promise<{ ok: boolean; why: string }> => {
  const video = {
    readyState: 4,
    error: null,
    paused: true,
    currentTime: 0,
    muted: false,
    duration: 41,
    play() {
      video.currentTime = 0.9;
      video.paused = false;
      return Promise.resolve();
    },
    addEventListener: () => undefined,
    querySelector: (selector: string) => (selector === 'track' ? { ...model, mode: '' } : null),
    getAttribute: (name: string) => (name === 'poster' ? 'http://localhost/poster.jpg' : null),
  };
  const section = {
    querySelector: (selector: string) => (selector === 'video' ? video : null),
    querySelectorAll: (selector: string) =>
      selector === 'button[data-chapter]' ? [1, 2, 3, 4] : [],
    getBoundingClientRect: () => ({ top: 100 }),
  };
  class Poster {
    naturalWidth = 1;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      setTimeout(() => this.onload?.(), 0);
    }
  }
  const context = {
    document: { getElementById: (id: string) => (id === 'lesson-video' ? section : null) },
    Image: Poster,
    innerHeight: 900,
    setTimeout,
    Date,
  };
  const result: unknown = await runInNewContext(PLAYER('lesson-video', true), context);
  assert.ok(typeof result === 'string', 'probe returns a JSON string');
  const parsed: unknown = JSON.parse(result);
  if (parsed === null || typeof parsed !== 'object' || !('ok' in parsed) || !('why' in parsed))
    assert.fail('probe result must be an object with ok and why');
  if (typeof parsed.ok !== 'boolean' || typeof parsed.why !== 'string')
    assert.fail('probe result must carry a boolean ok and a string why');
  return { ok: parsed.ok, why: parsed.why };
};

await test('the player probe FAILS when the VTT is ERROR with null cues, although the mp4 plays', async () => {
  const broken = await runProbe(track(3, null));
  assert.equal(broken.ok, false, `broken VTT must fail the gate: ${broken.why}`);
  assert.match(broken.why, /track=false/u);
});

await test('the player probe PASSES when the VTT is loaded and gives parsed cues', async () => {
  const loaded = await runProbe(track(2, { length: 4 }));
  assert.equal(loaded.ok, true, `a loaded track must pass: ${loaded.why}`);
  assert.match(loaded.why, /track=true/u);
});

await test('the player probe embeds the same caption predicate as trackOk', () => {
  assert.ok(
    PLAYER('lesson-video', true).includes(trackOk.toString()),
    'the browser probe and the unit contract must be one function',
  );
});

await test('the intent film-link gate expects the rows of the source map part, never the page it checks', async () => {
  const source = await readFile(
    resolve(import.meta.dirname, '..', 'docs/pages/sdlc-development/guides/intent/course-map.html'),
    'utf8',
  );
  assert.equal(
    sourceFilmRows(source),
    8,
    'four preparation films (the П2 film is withdrawn) and four step films are on the intent map',
  );
  const links = (count: number): string[] =>
    Array.from({ length: count }, (_, index) => `i${index}.html#lesson-video`);
  assert.equal(intentFilmLinksProblem(links(8), source), null, 'every source row is revealed');
  assert.match(
    intentFilmLinksProblem(links(7), source) ?? '',
    /7 film links on the intent map, expected 8/u,
  );
  assert.match(
    intentFilmLinksProblem(links(0), source) ?? '',
    /0 film links on the intent map, expected 8/u,
  );
  assert.match(
    intentFilmLinksProblem(links(9), '<ul></ul>') ?? '',
    /no film rows/u,
    'an empty source map is no gate',
  );
});
