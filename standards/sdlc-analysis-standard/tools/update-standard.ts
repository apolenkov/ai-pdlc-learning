import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMap, isScalar, parseDocument } from 'yaml';

export type UpdateStatus = 'up-to-date' | 'update-available';
export interface UpdatePlan {
  readonly schemaVersion: 'sdlc-standard-update/v1';
  readonly status: UpdateStatus;
  readonly currentVersion: string;
  readonly availableVersion: string;
  readonly protectedPaths: readonly string[];
  readonly changedPaths: readonly string[];
  readonly patch: string;
}

interface Manifest { version: string; protectedProductPaths?: string[]; }

const readText = (root: string, file: string): Promise<string> => readFile(join(root, file), 'utf8');

const parseLockVersion = (source: string): { version: string; start: number; end: number; raw: string } => {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error(`guides.lock.yaml contains invalid YAML: ${document.errors.map(({ message }) => message).join('; ')}`);
  }
  if (!isMap(document.contents)) throw new Error('guides.lock.yaml must contain a YAML mapping');
  const versionNode = document.get('standard_version', true);
  if (!isScalar(versionNode) || typeof versionNode.value !== 'string' || versionNode.value.length === 0 || !versionNode.range) {
    throw new Error('guides.lock.yaml must contain a scalar standard_version');
  }
  const [start, end] = versionNode.range;
  return { version: versionNode.value, start, end, raw: source.slice(start, end) };
};

const formatVersionScalar = (version: string, original: string): string => {
  if (original.startsWith('"')) return JSON.stringify(version);
  if (original.startsWith("'")) return `'${version.replaceAll("'", "''")}'`;
  return version;
};

const createPatch = async (oldLock: string, newLock: string): Promise<string> => {
  const scratch = await mkdtemp(join(tmpdir(), 'sdlc-standard-update-'));
  const oldDirectory = join(scratch, 'old');
  const newDirectory = join(scratch, 'new');
  try {
    await Promise.all([
      mkdir(oldDirectory, { recursive: true }),
      mkdir(newDirectory, { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(oldDirectory, 'guides.lock.yaml'), oldLock, 'utf8'),
      writeFile(join(newDirectory, 'guides.lock.yaml'), newLock, 'utf8'),
    ]);

    let output: string;
    try {
      output = execFileSync('git', [
        'diff', '--no-index', '--no-ext-diff', '--no-color', '--no-prefix', '--',
        'old/guides.lock.yaml', 'new/guides.lock.yaml',
      ], { cwd: scratch, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 1) throw error;
      output = String('stdout' in error ? error.stdout : '');
    }

    return output
      .replace(/^diff --git old\/guides\.lock\.yaml new\/guides\.lock\.yaml$/mu, 'diff --git a/guides.lock.yaml b/guides.lock.yaml')
      .replace(/^--- old\/guides\.lock\.yaml$/mu, '--- a/guides.lock.yaml')
      .replace(/^\+\+\+ new\/guides\.lock\.yaml$/mu, '+++ b/guides.lock.yaml');
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
};

export const createUpdatePlan = async (input: { standardRoot: string; productRoot: string }): Promise<UpdatePlan> => {
  const standardRoot = resolve(input.standardRoot);
  const productRoot = resolve(input.productRoot);
  const manifest = JSON.parse(await readText(standardRoot, 'manifest.json')) as Manifest;
  const availableVersion = (await readText(standardRoot, 'VERSION')).trim();
  const oldLock = await readText(productRoot, 'guides.lock.yaml');
  const versionScalar = parseLockVersion(oldLock);
  const currentVersion = versionScalar.version;
  const status: UpdateStatus = currentVersion === availableVersion ? 'up-to-date' : 'update-available';
  const newLock = oldLock.slice(0, versionScalar.start)
    + formatVersionScalar(availableVersion, versionScalar.raw)
    + oldLock.slice(versionScalar.end);
  const patch = status === 'up-to-date' ? '' : await createPatch(oldLock, newLock);
  return {
    schemaVersion: 'sdlc-standard-update/v1',
    status,
    currentVersion,
    availableVersion,
    protectedPaths: manifest.protectedProductPaths ?? ['CONTEXT.md', 'product.yaml', 'openspec/', 'services.lock.yaml'],
    changedPaths: status === 'up-to-date' ? [] : ['guides.lock.yaml'],
    patch,
  };
};

const argument = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  const mode = argument('--mode') ?? 'dry-run';
  const standardRoot = argument('--standard') ?? resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const productRoot = argument('--product') ?? resolve(standardRoot, 'examples/product-meta');
  const output = argument('--output');
  if (mode !== 'dry-run' && mode !== 'patch') throw new Error('--mode must be dry-run or patch');
  const plan = await createUpdatePlan({ standardRoot, productRoot });
  const report = JSON.stringify({ ...plan, mode }, null, 2) + '\n';
  if (output) await writeFile(resolve(output), mode === 'patch' ? plan.patch : report, 'utf8');
  process.stdout.write(mode === 'patch' ? plan.patch || '# Standard is already current\n' : report);
}
