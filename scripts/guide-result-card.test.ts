import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  mountHero,
  type HeroHeading,
  type HeroProof,
  type HeroStage,
  type HeroSummary,
} from '../docs/pages/sdlc-development/guides/renderer/hero.ts';

/**
 * Owner finding (pack14, design review): the hero card «Наблюдаемый результат» turned a
 * long `stage.output` paragraph into one bold `<strong>` run (up to 14 lines at 1440).
 * The renderer now marks a long result with `data-output="long"` and guide.css sets it as
 * an explanation; authored short `<strong>` runs on the course map stay untouched.
 * These checks pin the boundary (120 characters stay an accent phrase, 121 becomes a
 * paragraph) and the CSS contract behind the marker, so removing either fails here.
 */
const mount = (output: string) => {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { title: '' } });
  const attributes = new Map<string, string>();
  const heading: HeroHeading = { textContent: '' };
  const summary: HeroSummary = { innerHTML: '', insertAdjacentHTML: () => undefined };
  const proof: HeroProof = {
    textContent: '',
    setAttribute: (name: string, value: string) => attributes.set(name, value),
  };
  const stage: HeroStage = { title: 'Шаг 3', summary: '', output };
  mountHero('3', stage, heading, summary, proof);
  return { attributes, proof };
};

await test('a result of exactly 120 characters stays an accent phrase without the long marker', () => {
  const output = 'я'.repeat(120);
  const { attributes, proof } = mount(output);
  assert.equal(proof.textContent, output, 'the result text is passed through unchanged');
  assert.equal(attributes.size, 0, 'a 120-character result must not be marked as long');
});

await test('a result of 121 characters gets data-output="long" and keeps its text', () => {
  const output = 'я'.repeat(121);
  const { attributes, proof } = mount(output);
  assert.equal(proof.textContent, output, 'the result text is passed through unchanged');
  assert.deepEqual(
    [...attributes],
    [['data-output', 'long']],
    'a 121-character result is an explanation and is marked exactly once',
  );
});

await test('the long result rule renders the card as an explanation, not a heading', async () => {
  const css = await readFile('docs/pages/sdlc-development/guides/guide.css', 'utf8');
  const rule = css.match(/\.proof strong\[data-output='long'\]\s*\{([^}]*)\}/u)?.[1] ?? '';
  assert.ok(rule, "the .proof strong[data-output='long'] rule is missing from guide.css");
  // TASK-904 (layout review): the result is the point of the lesson, so it reads at body size in the main colour.
  assert.match(rule, /font-size:\s*\.94rem/u, 'the long result uses the body text size, 15px');
  assert.match(rule, /font-weight:\s*400/u, 'the long result is not bold, weight 400');
  assert.match(rule, /color:\s*var\(--ink\)/u, 'the long result uses the main text colour');
});
