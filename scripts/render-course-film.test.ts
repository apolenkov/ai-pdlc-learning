import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'scripts/render-course-film.ts');
type MapData = {
  here: string;
  total: number;
  steps: { num: string; title: string; code: string }[];
  branches: { num: string; parent: string }[];
};
const mapShape = (value: unknown): value is MapData =>
  !!value &&
  typeof value === 'object' &&
  'steps' in value &&
  Array.isArray(value.steps) &&
  'branches' in value &&
  Array.isArray(value.branches);

function fixture(t: test.TestContext, block = 'block-sdd') {
  mkdirSync(join(root, '.cache'), { recursive: true });
  const dir = mkdtempSync(join(root, '.cache/render-film-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const docs = join(dir, 'docs/pages/sdlc-development');
  mkdirSync(join(docs, 'guides'), { recursive: true });
  for (const file of ['course-names.json', 'guides/route-steps.json'])
    cpSync(join(root, 'docs/pages/sdlc-development', file), join(docs, file));
  const routePath = join(docs, 'guides/route-steps.json');
  const route: unknown = JSON.parse(readFileSync(routePath, 'utf8'));
  assert.ok(Array.isArray(route));
  // Analysis films ignore the intent course (its films land later with their own map).
  const analysisRoute = route.filter((entry: { course?: unknown }) => entry.course !== 'intent');
  const numbers = ['', '', '', '', '1', '2', '3', '4', '5', '6а', '6б', '7'];
  assert.equal(analysisRoute.length, numbers.length);
  analysisRoute.forEach((entry: unknown, i) => {
    assert.ok(entry && typeof entry === 'object' && 'number' in entry && 'branchOf' in entry);
    entry.number = numbers[i]!;
    if (entry.branchOf) entry.branchOf = '6';
  });
  writeFileSync(routePath, JSON.stringify(analysisRoute));
  const film = join(dir, 'video', block, 'film');
  mkdirSync(join(film, 'compositions'), { recursive: true });
  mkdirSync(join(film, 'assets/vo'), { recursive: true });
  cpSync(
    join(root, 'video', block, 'film/compositions/scene-0m.html'),
    join(film, 'compositions/scene-0m.html'),
  );
  writeFileSync(
    join(film, 'compositions/scene-00.html'),
    '<div id="С1">П3 → С1; С4а / С4б; Д1</div><a href="https://example.test/С1">С1</a><script>const label="П3"; const asset="assets/С1.mp3";</script>',
  );
  writeFileSync(
    join(film, 'scenes.json'),
    JSON.stringify([{ n: '0m', duration: 2, title: 'П3', audio: 'assets/vo/scene-0m.mp3' }]),
  );
  writeFileSync(join(film, 'index.html'), '<div>П3</div>');
  writeFileSync(join(film, 'assets/vo/scene-0m.mp3'), 'synthetic immutable audio');
  writeFileSync(join(film, 'assets/vo/scene-0m.alignment.js'), 'window.ALIGN={text:"П3 С1"};');
  mkdirSync(join(film, 'renders'));
  writeFileSync(join(film, 'renders/unrelated.mp4'), 'do not copy');
  return { dir, film, project: join(dir, 'renders', `${block}-project`), block };
}
function run(dir: string, ...args: string[]) {
  return spawnSync(process.execPath, ['--experimental-strip-types', cli, ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
}
function installedCli(dir: string) {
  const bin = join(dir, 'hyperframes.cjs');
  writeFileSync(
    bin,
    `#!${process.execPath}
const { existsSync, writeFileSync } = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === '--version') console.log('1.0.0');
else if (args[0] === 'check') process.exit(existsSync(${JSON.stringify(join(dir, 'fail-check'))}) ? 2 : 0);
else if (args[0] === 'render') writeFileSync(args[args.indexOf('--output') + 1], 'synthetic rendered movie');
else process.exit(3);
`,
  );
  chmodSync(bin, 0o755);
  return (block: string, phase: string) =>
    spawnSync(process.execPath, ['--experimental-strip-types', cli, block, phase], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HYPERFRAMES_BIN: bin, HYPERFRAMES_VERSION: '1.0.0' },
    });
}
function map(project: string) {
  const html = readFileSync(join(project, 'compositions/scene-0m.html'), 'utf8');
  const value: unknown = JSON.parse(/const D = (.*);/u.exec(html)![1]!);
  assert.ok(mapShape(value));
  return value;
}

await test('prepare maps menu numbers including delivery and branches while preserving source, audio, URLs and identifiers', (t) => {
  const f = fixture(t);
  const before = [
    'scenes.json',
    'compositions/scene-0m.html',
    'compositions/scene-00.html',
    'assets/vo/scene-0m.mp3',
    'assets/vo/scene-0m.alignment.js',
  ].map((p) => [p, readFileSync(join(f.film, p))] as const);
  const result = run(f.dir, f.block, 'prepare');
  assert.equal(result.status, 0, result.stderr);
  const data = map(f.project);
  assert.deepEqual(
    data.steps.map((s: { num: string }) => s.num),
    ['', '', '', '', '1', '2', '3', '4', '5', '7'],
  );
  assert.deepEqual(
    data.branches.map((s: { num: string }) => s.num),
    ['6а', '6б'],
  );
  assert.equal(data.total, 7);
  assert.equal(data.steps[2]!.title, 'SDD и OpenSpec');
  assert.equal(data.steps[2]!.code, 'Подготовка');
  for (const [path, bytes] of before)
    assert.deepEqual(readFileSync(join(f.film, path)), bytes, path);
  for (const path of ['assets/vo/scene-0m.mp3', 'assets/vo/scene-0m.alignment.js'])
    assert.deepEqual(readFileSync(join(f.project, path)), readFileSync(join(f.film, path)));
  assert.equal(
    readFileSync(join(f.project, 'compositions/scene-00.html'), 'utf8'),
    '<div id="С1">подготовка «SDD и OpenSpec» → шаг 1 курса; шаг 6а курса / шаг 6б курса; шаг 7 курса</div><a href="https://example.test/С1">шаг 1 курса</a><script>const label="подготовка «SDD и OpenSpec»"; const asset="assets/С1.mp3";</script>',
  );
  assert.throws(() => readFileSync(join(f.project, 'renders/unrelated.mp4')), /ENOENT/u);
});

await test('extra derives its parent number and plus from the menu rather than an ordinal list', (t) => {
  const f = fixture(t, 'block-dark-factory');
  const namesPath = join(f.dir, 'docs/pages/sdlc-development/course-names.json');
  const names: unknown = JSON.parse(readFileSync(namesPath, 'utf8'));
  assert.ok(names && typeof names === 'object' && 'extras' in names && Array.isArray(names.extras));
  const first: unknown = names.extras[0];
  assert.ok(first && typeof first === 'object' && 'after' in first);
  first.after = 'delivery';
  writeFileSync(namesPath, JSON.stringify(names));
  const result = run(f.dir, f.block, 'prepare');
  assert.equal(result.status, 0, result.stderr);
  const data = map(f.project);
  assert.equal(data.here, 'dark');
  assert.equal(data.branches[0]!.num, '7+');
  assert.equal(data.branches[0]!.parent, 'delivery');
});

await test('prepare refuses existing outputs and invalid blocks without overwriting evidence', (t) => {
  const f = fixture(t);
  mkdirSync(join(f.dir, 'renders'));
  const output = join(f.dir, 'renders', `${f.block}.mp4`);
  writeFileSync(output, 'existing evidence');
  assert.notEqual(run(f.dir, f.block, 'prepare').status, 0);
  assert.equal(readFileSync(output, 'utf8'), 'existing evidence');
  assert.notEqual(run(f.dir, '../escape', 'prepare').status, 0);
  rmSync(output);
  assert.equal(run(f.dir, f.block, 'prepare').status, 0);
  const prepared = readFileSync(join(f.project, 'scenes.json'));
  assert.notEqual(run(f.dir, f.block, 'prepare').status, 0);
  assert.deepEqual(readFileSync(join(f.project, 'scenes.json')), prepared);
});

await test('later phases reject changed source or copied audio and require an explicit installed CLI', (t) => {
  const f = fixture(t);
  assert.equal(run(f.dir, f.block, 'prepare').status, 0);
  const noCli = spawnSync(process.execPath, ['--experimental-strip-types', cli, f.block, 'check'], {
    cwd: f.dir,
    encoding: 'utf8',
    env: { ...process.env, HYPERFRAMES_BIN: '', HYPERFRAMES_VERSION: '' },
  });
  assert.notEqual(noCli.status, 0);
  assert.match(noCli.stderr, /Set HYPERFRAMES_BIN/u);
  const audio = join(f.project, 'assets/vo/scene-0m.mp3');
  writeFileSync(audio, 'accidentally regenerated');
  const modifiedAudio = run(f.dir, f.block, 'check');
  assert.notEqual(modifiedAudio.status, 0);
  assert.match(modifiedAudio.stderr, /Generated asset changed/u);
  cpSync(join(f.film, 'assets/vo/scene-0m.mp3'), audio);
  writeFileSync(join(f.film, 'scenes.json'), '[]');
  const modifiedSource = run(f.dir, f.block, 'check');
  assert.notEqual(modifiedSource.status, 0);
  assert.match(modifiedSource.stderr, /Source changed/u);
});

await test('render accepts the unchanged generated project after a successful check', (t) => {
  const f = fixture(t);
  const hf = installedCli(f.dir);
  assert.equal(run(f.dir, f.block, 'prepare').status, 0);
  const checked = hf(f.block, 'check');
  assert.equal(checked.status, 0, checked.stderr);
  const rendered = hf(f.block, 'render');
  assert.equal(rendered.status, 0, rendered.stderr);
  assert.equal(
    readFileSync(join(f.dir, 'renders', `${f.block}.mp4`), 'utf8'),
    'synthetic rendered movie',
  );
});

for (const path of ['compositions/scene-00.html', 'index.html', 'scenes.json']) {
  await test(`render rejects ${path} changed after a successful check`, (t) => {
    const f = fixture(t);
    const hf = installedCli(f.dir);
    assert.equal(run(f.dir, f.block, 'prepare').status, 0);
    const checked = hf(f.block, 'check');
    assert.equal(checked.status, 0, checked.stderr);
    writeFileSync(join(f.project, path), `${readFileSync(join(f.project, path), 'utf8')}\n`);
    const rendered = hf(f.block, 'render');
    assert.notEqual(rendered.status, 0);
    assert.match(rendered.stderr, /Generated render inputs changed since check/u);
    assert.throws(() => readFileSync(join(f.dir, 'renders', `${f.block}.mp4`)), /ENOENT/u);
  });
}

for (const failure of ['external CLI', 'source validation']) {
  await test(`failed repeat check (${failure}) revokes earlier render permission`, (t) => {
    const f = fixture(t);
    const hf = installedCli(f.dir);
    assert.equal(run(f.dir, f.block, 'prepare').status, 0);
    assert.equal(hf(f.block, 'check').status, 0);
    const path =
      failure === 'external CLI' ? join(f.dir, 'fail-check') : join(f.film, 'index.html');
    const before = failure === 'source validation' ? readFileSync(path) : null;
    writeFileSync(path, 'trigger check failure');
    assert.notEqual(hf(f.block, 'check').status, 0);
    if (before) writeFileSync(path, before);
    else rmSync(path);
    const rendered = hf(f.block, 'render');
    assert.notEqual(rendered.status, 0);
    assert.match(rendered.stderr, /Run check successfully before render/u);
    assert.throws(() => readFileSync(join(f.dir, 'renders', `${f.block}.mp4`)), /ENOENT/u);
  });
}
