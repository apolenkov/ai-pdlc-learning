// Run from the repository root. Heavy phases require the coordinator's render lane.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  createReadStream,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, relative } from 'node:path';

type Step = {
  id: string;
  code: string;
  number: string;
  group: string;
  title: string;
  branchOf: string | null;
};
type Extra = { id: string; code: string; after: string; title: string; short?: string };
type Scene = {
  n?: string | number;
  id?: string;
  duration: number;
  overlay?: boolean;
  tail?: boolean;
};
type State = {
  source: Record<string, string>;
  commands: string[];
  version?: string;
  checked?: boolean;
  checkedInputs?: string;
  rendered?: boolean;
};
const [block = '', phase = 'all'] = process.argv.slice(2);
if (
  !/^block-[a-z0-9-]+$/u.test(block) ||
  !['all', 'prepare', 'check', 'render', 'report'].includes(phase) ||
  process.argv.length > 4
) {
  console.error(
    'Usage: node --experimental-strip-types scripts/render-course-film.ts BLOCK [prepare|check|render|report|all]\nRun heavy phases under the coordinator lane; set HYPERFRAMES_BIN and HYPERFRAMES_VERSION to an installed CLI.',
  );
  process.exit(1);
}
const root = process.cwd(),
  source = join(root, 'video', block, 'film');
const output = join(root, 'renders'),
  project = join(output, `${block}-project`);
const movie = join(output, `${block}.mp4`),
  frames = join(output, `${block}-frames`),
  report = join(output, `${block}-REPORT.md`);
const stateFile = join(project, 'render-state.json');
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const step = (value: unknown): value is Step =>
  record(value) &&
  ['id', 'code', 'number', 'group', 'title'].every((key) => typeof value[key] === 'string') &&
  (value.branchOf === null || typeof value.branchOf === 'string');
const extra = (value: unknown): value is Extra =>
  record(value) &&
  ['id', 'code', 'after', 'title'].every((key) => typeof value[key] === 'string') &&
  (value.short === undefined || typeof value.short === 'string');
type Names = {
  extras: Extra[];
  groups: Record<string, string>;
  branches: { id: string; of: string }[];
};
const namesShape = (value: unknown): value is Names =>
  record(value) &&
  Array.isArray(value.extras) &&
  value.extras.every(extra) &&
  Array.isArray(value.branches) &&
  value.branches.every(
    (b: unknown) => record(b) && typeof b.id === 'string' && typeof b.of === 'string',
  ) &&
  record(value.groups) &&
  Object.values(value.groups).every((v) => typeof v === 'string');
const stateShape = (value: unknown): value is State =>
  record(value) &&
  record(value.source) &&
  Object.values(value.source).every((v) => typeof v === 'string') &&
  (value.checkedInputs === undefined || typeof value.checkedInputs === 'string') &&
  Array.isArray(value.commands) &&
  value.commands.every((v: unknown) => typeof v === 'string');
const scene = (value: unknown): value is Scene =>
  record(value) &&
  typeof value.duration === 'number' &&
  Number.isFinite(value.duration) &&
  value.duration > 0 &&
  (value.overlay === undefined || typeof value.overlay === 'boolean') &&
  (value.tail === undefined || typeof value.tail === 'boolean');
const parse = <T>(text: string, valid: (value: unknown) => value is T): T => {
  const value: unknown = JSON.parse(text);
  if (!valid(value)) throw new Error('Invalid JSON input shape');
  return value;
};
const load = <T>(path: string, valid: (value: unknown) => value is T): T =>
  parse(readFileSync(path, 'utf8'), valid);
const stepsShape = (value: unknown): value is Step[] => Array.isArray(value) && value.every(step);
const scenesShape = (value: unknown): value is Scene[] =>
  Array.isArray(value) && value.every(scene);
const mapShape = (value: unknown): value is Record<string, unknown> & { here: string } =>
  record(value) && value.version === 2 && typeof value.here === 'string';

const save = (path: string, data: unknown) =>
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
const refuse = (path: string) => {
  if (
    existsSync(path) ||
    (() => {
      try {
        lstatSync(path);
        return true;
      } catch {
        return false;
      }
    })()
  )
    throw new Error(`Refusing existing output: ${path}`);
};
function files(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => !['node_modules', 'renders', 'work', '.hyperframes'].includes(name))
    .flatMap((name) => {
      const path = join(dir, name),
        stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`Refusing symlink: ${path}`);
      return stat.isDirectory() ? files(path) : [path];
    });
}
async function hash(path: string) {
  const sum = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    if (!(chunk instanceof Buffer)) throw new Error('Unexpected stream chunk');
    sum.update(chunk);
  }
  return sum.digest('hex');
}
async function fingerprint() {
  const entries: [string, string][] = [];
  for (const path of files(source)) entries.push([relative(source, path), await hash(path)]);
  for (const path of ['guides/route-steps.json', 'course-names.json'])
    entries.push([`@menu/${path}`, await hash(join(root, 'docs/pages/sdlc-development', path))]);
  return Object.fromEntries(entries);
}
async function renderFingerprint() {
  const sum = createHash('sha256');
  for (const path of files(project).sort()) {
    if (path !== stateFile) sum.update(`${relative(project, path)}\0${await hash(path)}\0`);
  }
  return sum.digest('hex');
}
let state: State;
function command(bin: string, args: string[], capture = false): string {
  state.commands.push(
    [bin, ...args].map((value) => `'${value.replaceAll("'", "'\\''")}'`).join(' '),
  );
  try {
    return (
      execFileSync(bin, args, {
        cwd: project,
        env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', HYPERFRAMES_SKIP_SKILLS: '1' },
        encoding: 'utf8',
        stdio: capture ? 'pipe' : 'inherit',
      }) ?? ''
    );
  } finally {
    save(stateFile, state);
  }
}
async function immutable() {
  if (JSON.stringify(await fingerprint()) !== JSON.stringify(state.source))
    throw new Error('Source changed since prepare');
  for (const [path, expected] of Object.entries(state.source)) {
    if (path.startsWith('assets/') && (await hash(join(project, path))) !== expected)
      throw new Error(`Generated asset changed: ${path}`);
  }
}
const stop = (s: Step) => ({
  id: s.id,
  num: s.number,
  code: s.number ? `Шаг ${s.number}` : 'Подготовка',
  title: s.title,
  label: s.title,
  group: s.group,
});
function prepare() {
  for (const path of [project, movie, frames, report]) refuse(path);
  const steps = load(join(root, 'docs/pages/sdlc-development/guides/route-steps.json'), stepsShape);
  const names = load(join(root, 'docs/pages/sdlc-development/course-names.json'), namesShape);
  const mapFile = join(source, 'compositions/scene-0m.html');
  let html = readFileSync(mapFile, 'utf8');
  const match = /const D = (\{[^\n]+\});/u.exec(html);
  if (!match) throw new Error('Unrecognized frozen map DATA');
  const data = parse(match[1]!, mapShape);
  if (![...steps, ...names.extras].some((s) => s.id === data.here))
    throw new Error(`Unknown map step: ${data.here}`);
  const branches = steps
    .filter((s) => s.branchOf)
    .map((s) => {
      const parent = names.branches.find((b) => b.id === s.id)?.of;
      if (!steps.some((p) => p.id === parent)) throw new Error(`Unknown branch parent: ${s.id}`);
      return { ...stop(s), parent };
    });
  const extras = names.extras.map((s) => {
    const parent = steps.find((p) => p.id === s.after);
    if (!parent) throw new Error(`Unknown extra parent: ${s.after}`);
    return {
      id: s.id,
      num: parent.number ? `${parent.number}+` : '',
      code: parent.number ? `Шаг ${parent.number}+` : 'Дополнение к подготовке',
      title: s.title,
      label: s.short ?? s.title,
      group: parent.group,
      parent: parent.id,
      extra: true,
    };
  });
  const total = Math.max(...steps.map((s) => Number.parseInt(s.number, 10) || 0));
  Object.assign(data, {
    steps: steps.filter((s) => !s.branchOf).map(stop),
    branches: extras.some((s) => s.id === data.here) ? extras : branches,
    groups: names.groups,
    total,
  });
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  html = html.replace(match[0], `const D = ${json};`);
  const mappings = [
    ...steps.map((s) => [s.code, s.number ? `шаг ${s.number} курса` : `подготовка «${s.title}»`]),
    ...extras.map((s, i) => [
      names.extras[i]!.code,
      s.num ? `шаг ${s.num} курса` : s.code.toLowerCase(),
    ]),
  ].sort((a, b) => b[0]!.length - a[0]!.length);
  const codes = mappings.map(([code]) => code!.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('|');
  const replacements = new Map(mappings.map(([code, num]) => [code!, num!]));
  const visible = (text: string) =>
    text.replace(
      new RegExp(`(?<![\\p{L}\\p{N}_./:#?=+-])(${codes})(?![\\p{L}\\p{N}_./:#?=+-])`, 'gu'),
      (code) => replacements.get(code)!,
    );
  const transform = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(transform);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          ['title', 'chapter', 'name', 'text', 'label'].includes(key) && typeof item === 'string'
            ? visible(item)
            : transform(item),
        ]),
      );
    return value;
  };
  mkdirSync(project, { recursive: true });
  cpSync(source, project, {
    recursive: true,
    filter: (path) => !['node_modules', 'renders', 'work', '.hyperframes'].includes(basename(path)),
  });
  for (const path of files(project)) {
    const rel = relative(project, path);
    if (rel === 'compositions/scene-0m.html') continue;
    if ((rel.startsWith('compositions/') || rel === 'index.html') && path.endsWith('.html')) {
      writeFileSync(
        path,
        readFileSync(path, 'utf8')
          .split(/(<[^>]+>)/gu)
          .map((part, i) => (i % 2 ? part : visible(part)))
          .join(''),
      );
    } else if (['scenes.json', 'meta.json'].includes(rel))
      save(
        path,
        transform(
          parse(readFileSync(path, 'utf8'), (value): value is unknown => value !== undefined),
        ),
      );
  }
  writeFileSync(join(project, 'compositions/scene-0m.html'), html);
}
function hyperframes(args: string[]) {
  const bin = process.env.HYPERFRAMES_BIN,
    version = process.env.HYPERFRAMES_VERSION;
  if (!bin || !version || !/^\d+\.\d+\.\d+$/u.test(version))
    throw new Error(
      'Set HYPERFRAMES_BIN and exact HYPERFRAMES_VERSION; no runtime install is performed',
    );
  const actual = command(bin, ['--version'], true).trim();
  if (!new RegExp(`(?:^|\\s)v?${version.replaceAll('.', '\\.')}($|\\s)`, 'u').test(actual))
    throw new Error(`HyperFrames version mismatch: ${actual}`);
  if (state.version && state.version !== version)
    throw new Error('HyperFrames version differs from previous phase');
  state.version = version;
  command(bin, [...args, project]);
}
function probeDuration(expected: number) {
  const probe: unknown = JSON.parse(
    command(
      'ffprobe',
      ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', movie],
      true,
    ),
  );
  if (
    !record(probe) ||
    !record(probe.format) ||
    typeof probe.format.duration !== 'string' ||
    !Array.isArray(probe.streams)
  )
    throw new Error('Invalid ffprobe output');
  const streams = probe.streams.filter(record);
  const duration = Number(probe.format.duration),
    video = streams.find((s) => s.codec_type === 'video');
  if (
    !Number.isFinite(duration) ||
    Math.abs(duration - expected) > 0.2 ||
    video?.width !== 1920 ||
    video.height !== 1080 ||
    video.r_frame_rate !== '30/1' ||
    !streams.some((s) => s.codec_type === 'audio')
  )
    throw new Error('Film duration, dimensions, fps or audio do not match the source');
  return duration;
}
async function makeReport() {
  refuse(report);
  refuse(frames);
  if (!state.rendered || !state.checked)
    throw new Error('Successful check and render are required before report');
  const scenes = load(join(project, 'scenes.json'), scenesShape);
  const expected = scenes.reduce((sum, s) => sum + (s.overlay ? 0 : s.duration), 0);
  const duration = probeDuration(expected);
  const times = new Set([0, 0.1, 0.3, Math.max(0, duration - 1 / 30)]);
  let start = 0;
  for (const scene of scenes) {
    const at = scene.overlay && scene.tail ? start - scene.duration : start;
    for (const t of [
      at - 1 / 30,
      at,
      at + 0.1,
      at + 0.3,
      at + scene.duration / 2,
      at + scene.duration - 1 / 30,
    ])
      if (t >= 0 && t < duration) times.add(t);
    if (!scene.overlay) start += scene.duration;
  }
  const timestamps = [...new Set([...times].map((time) => time.toFixed(6)))].sort(
    (a, b) => Number(a) - Number(b),
  );
  mkdirSync(frames);
  for (const time of timestamps)
    command('ffmpeg', [
      '-v',
      'error',
      '-n',
      '-ss',
      time,
      '-i',
      movie,
      '-frames:v',
      '1',
      join(frames, `${time}.png`),
    ]);
  await immutable();
  const sha256 = await hash(movie);
  writeFileSync(
    report,
    `# ${block}\n\nTechnical checks completed. Visual review: NOT_RUN; READY requires independent frame review.\n\nDuration: ${duration}s (source ${expected}s).\nResolution: 1920×1080, 30 fps.\nHyperFrames: ${state.version}\nSHA256: ${sha256}\nBoundary frames: ${timestamps.length} full-size PNGs in ${relative(root, frames)}\nSource and copied assets: byte-identical to prepare snapshot.\n\nCommands (cwd ${project}):\n\n\`\`\`sh\n${state.commands.join('\n')}\n\`\`\`\n`,
    { flag: 'wx' },
  );
}
try {
  if (existsSync(output) && lstatSync(output).isSymbolicLink())
    throw new Error('Refusing symlinked renders directory');
  if (phase === 'prepare' || phase === 'all') {
    const snapshot = await fingerprint();
    prepare();
    state = {
      source: snapshot,
      commands: [
        `# prepare cwd: ${root}\n'${process.execPath}' --experimental-strip-types '${join(root, 'scripts/render-course-film.ts')}' ${block} prepare`,
      ],
    };
    save(stateFile, state);
  } else state = load(stateFile, stateShape);
  if (phase === 'check' || phase === 'all') {
    state.checked = false;
    delete state.checkedInputs;
    save(stateFile, state);
  }
  await immutable();
  if (phase === 'check' || phase === 'all') {
    const inputs = await renderFingerprint();
    hyperframes(['check']);
    if ((await renderFingerprint()) !== inputs)
      throw new Error('Generated render inputs changed during check');
    state.checkedInputs = inputs;
    state.checked = true;
    save(stateFile, state);
  }
  if (phase === 'render' || phase === 'all') {
    refuse(movie);
    if (!state.checked) throw new Error('Run check successfully before render');
    if ((await renderFingerprint()) !== state.checkedInputs)
      throw new Error('Generated render inputs changed since check; run check again');
    hyperframes([
      'render',
      '--fps',
      '30',
      '--crf',
      '20',
      '--workers',
      '1',
      '--video-frame-format',
      'png',
      '--output',
      movie,
    ]);
    state.rendered = true;
    save(stateFile, state);
  }
  if (phase === 'report' || phase === 'all') await makeReport();
  await immutable();
  console.log(`${block}: ${phase} completed`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
