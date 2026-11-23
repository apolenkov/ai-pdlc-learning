import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scene03, scene05 } from './scene-data.ts';
const base = fileURLToPath(new URL('.', import.meta.url));
const source = (path: string) => readFileSync(base + path, 'utf8');
const manifest = JSON.parse(source('snapshot-times.json'));
const guide = source('../../../../docs/pages/sdlc-development/guides/metarepository.md');
const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
assert.equal(scene05.length, 8);
assert.deepEqual([...new Set(scene03.map((s) => s.step))], [0, 1, 2, 3, 4, 5]);
for (const name of ['03', '05']) {
  const html = source(`scene-${name}/index.html`);
  const timeline = source(`scene-${name}/timeline.js`);
  assert.match(html, /<script src="timeline\.js"><\/script>/);
  assert.match(html, /gsap\.timeline\(\{paused: true\}\)/);
  assert.match(html, new RegExp(`window.__timelines\\['p4-mock-${name}'\\] = tl`));
  assert.doesNotMatch(
    html + timeline,
    /<audio|S\.t\(|S\.end\(|Math\.random|Date\.now|fetch\(|setTimeout/,
  );
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g))
    assert.ok(!match[1].includes('..') && !/^https?:/.test(match[1]), match[1]);
  for (const state of manifest[`scene-${name}`].states)
    assert.ok(state.stationaryHold >= state.words / 3 + 1 - 1e-6, state.id);
}
for (const [id, ui, command] of [
  ['branch', 'Create Branch', 'switch -c'],
  ['stage', 'Stage Changes', ' add '],
  ['commit', 'Commit', ' commit '],
  ['push', 'Publish Branch/Push', ' push '],
]) {
  const state = scene03.find((item) => item.id === id)!;
  assert.ok(state.html.indexOf(`В GitLab: ${ui}`) < state.html.indexOf('В терминале:'));
  const cmd = text(state.html.match(/<pre class="command">(.*?)<\/pre>/)![1]);
  assert.ok(cmd.includes(command));
  assert.ok(guide.includes(cmd), cmd);
}
const register = scene03.find((s) => s.id === 'register')!.html;
assert.ok(register.includes('В терминале:'));
assert.ok(!register.includes('В GitLab:'));
assert.equal(
  (
    scene03
      .map((s) => s.html)
      .join('')
      .match(/git pull/g) || []
  ).length,
  1,
);
assert.ok(scene03.findIndex((s) => s.id === 'mkdir') < scene03.findIndex((s) => s.id === 'config'));
assert.ok(scene03.findIndex((s) => s.id === 'config') < scene03.findIndex((s) => s.id === 'init'));
assert.ok(scene05.find((s) => s.id === 'join')!.html.includes('Все MR кода и статусов слиты'));
const title = source('../compositions/scene-t5.html');
const lead = title.match(/y: 670[^\n]*text: "([^"]+)"/)![1];
assert.equal(lead, 'Планирование · код и статусы · архив');
assert.match(title, /const DURATION = 2;/);
assert.match(title, /duration: 0\.3[^\n]*DURATION - 0\.3/);
const leadWords = lead.split(/\s+/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
const titles = [...title.matchAll(/Kit\.kinetic\(S,[^\n]*text: "([^"]+)"/g)]
  .map((m) => m[1])
  .join(' ');
const allWords = titles.split(/\s+/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
assert.equal(leadWords, 5);
assert.equal(allWords, 11);
const harness = source('title-05/index.html');
assert.match(harness, /data-composition-src="compositions\/scene-t5.html"/);
assert.ok(!harness.includes(lead));
assert.ok(!harness.includes('<audio'));
console.log(
  'PASS: source contracts, relative assets, command provenance, deterministic timeline, mock reading holds. Not a visual PASS.',
);
console.log(
  `STOP title-05 reading: exact lead «${lead}»; ${leadWords} words need ${(leadWords / 3 + 1).toFixed(3)}s; full ${allWords} words need ${(allWords / 3 + 1).toFixed(3)}s; static hold 1.700s. Duration stays 2s.`,
);
for (const name of ['scene-03', 'scene-05'])
  console.log(`${name}: ${manifest[name].midpoints.join(',')}`);
console.log(`title-05: ${manifest['title-05'].times.join(',')}`);
