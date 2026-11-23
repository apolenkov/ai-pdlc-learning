import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

// The course map is a wrapping flex row of cards a third wide. A short last row used to grow its
// cards (1440: three cards at 446px, then two at 674px), so the columns of the rows did not line up;
// layout review TASK-904 #4 asked for one column grid: the last row keeps the 446px column width.
// Only a card alone in its group takes the whole row.
const ROOT = resolve(import.meta.dirname, '..');
const MAP_CSS =
  'docs/pages/sdlc-development/guides/learning-enhancements/08-course-map-and-rhythm.css';
const MAP_HTML = 'docs/pages/sdlc-development/guides/index.html';

const read = (file: string): Promise<string> => readFile(resolve(ROOT, file), 'utf8');

/** Body of the first `@media` block whose query matches `query`. */
const mediaBlock = (css: string, query: RegExp): string => {
  for (const match of css.matchAll(/@media\s*(\([^{]+?)\s*\{/gu)) {
    if (!query.test(match[1]!)) continue;
    let depth = 1;
    let index = match.index + match[0].length;
    const start = index;
    while (index < css.length && depth > 0) {
      if (css[index] === '{') depth += 1;
      else if (css[index] === '}') depth -= 1;
      index += 1;
    }
    return css.slice(start, index - 1);
  }
  throw new Error(`no @media block for ${query}`);
};

/** Selector and body of the first rule matching `selector`. */
const rule = (block: string, selector: RegExp): { selector: string; body: string } => {
  const match = selector.exec(block);
  assert.ok(match, `no rule ${selector}`);
  const open = block.indexOf('{', match.index);
  const close = block.indexOf('}', open);
  return { selector: block.slice(match.index, open).trim(), body: block.slice(open + 1, close) };
};

await test('the map list is a flex row of equal columns: a short last row does not stretch its cards', async () => {
  const css = await read(MAP_CSS);
  const list = rule(css, /\.course-map__list\{/u);
  assert.match(list.body, /display:\s*flex/u);
  assert.match(list.body, /flex-wrap:\s*wrap/u);
  assert.match(list.body, /gap:\s*10px/u);
  assert.doesNotMatch(
    list.body,
    /grid-template-columns/u,
    'no fixed grid tracks on the list: tracks are what leave empty cells',
  );
  const step = rule(css, /\.course-map__list>\.course-map__step\{/u);
  assert.match(
    step.body,
    /flex:\s*0 1 calc\(\(100% - 20px\)\/3\)/u,
    'three cards share a row and a short last row keeps their width',
  );
  assert.match(
    rule(css, /\.course-map__list>\.course-map__step:only-child\{/u).body,
    /flex-grow:\s*1/u,
    'a card alone in its group still takes the whole row',
  );
  assert.match(step.body, /min-width:\s*0/u, 'a long word cannot push a card out of its row');
  assert.match(
    step.body,
    /max-width:\s*none/u,
    'a lone card fills its row: the generic .shell li cap of 70ch would stop it at a text column',
  );
  const branches = rule(css, /\.course-map__branches\{/u);
  assert.match(branches.body, /flex:\s*1 1 100%/u, 'the branch block keeps its own full row');
  assert.match(branches.body, /padding:2px 0 0;/u, 'branch rows start on the same column edge');
  assert.doesNotMatch(branches.body, /border-left/u);
  assert.doesNotMatch(css, /\.course-map__list--branches[^{]*\{[^}]*flex:/u);
  const html = await read(MAP_HTML);
  assert.match(
    html,
    /<ol class="course-map__list course-map__list--branches"[^>]*><li class="course-map__step course-map__step--branch"/u,
  );
});

await test('the map keeps two columns up to 1100px and one column up to 760px', async () => {
  const css = await read(MAP_CSS);
  assert.match(
    mediaBlock(css, /max-width:\s*1100px/u),
    /\.course-map__list>\.course-map__step\{flex:0 1 calc\(\(100% - 10px\)\/2\)\}/u,
  );
  assert.match(
    mediaBlock(css, /max-width:\s*760px/u),
    /\.course-map__list>\.course-map__step,\.course-map__branches\{flex:1 1 100%\}/u,
  );
});

await test('a lone card takes the whole row and reads its facts in two columns', async () => {
  const css = await read(MAP_CSS);
  const only = rule(css, /\.course-map__list>\.course-map__step:only-child \.course-map__facts\{/u);
  assert.match(only.body, /grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/u);
  assert.match(
    mediaBlock(css, /max-width:\s*760px/u),
    /\.course-map__list>\.course-map__step:only-child \.course-map__facts\{grid-template-columns:minmax\(0,1fr\)/u,
    'one column on a phone',
  );
});

await test('the product metarepository card names its film in the generated map', async () => {
  const html = await read(MAP_HTML);
  assert.match(
    html,
    /id="map-П4"[^]*?<li data-film="guides\/p4-metarepository\.html" hidden><span>Ролик<\/span><a href="p4-metarepository\.html#lesson-video">3:45<\/a><\/li>/u,
    'П4 shows a film line like its neighbours: the manifest of the block-p4 film is known',
  );
  assert.equal(
    (html.match(/<li data-film="guides\/[^"]+" hidden>/gu) ?? []).length,
    12,
    'eleven guide pages and the preparation extra start hidden until the player is embedded (the П2 film is withdrawn)',
  );
});
