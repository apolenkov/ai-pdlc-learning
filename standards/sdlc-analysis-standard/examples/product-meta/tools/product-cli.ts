import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isMap, isScalar, isSeq, parseDocument } from 'yaml';

const root = new URL('../', import.meta.url);
const file = (name: string): string => fileURLToPath(new URL(name, root));
const required = ['AGENTS.md', 'CONTEXT.md', 'DOMAIN.md', 'product.yaml', 'services.lock.yaml', 'openspec/config.yaml'];

const checkFiles = async (): Promise<void> => {
  const missing: string[] = [];
  for (const name of required) {
    try { await readFile(file(name)); } catch { missing.push(name); }
  }
  if (missing.length > 0) throw new Error(`Missing product-meta files: ${missing.join(', ')}`);
};

const parseYaml = (source: string, name: string): ReturnType<typeof parseDocument> => {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error(`${name} contains invalid YAML: ${document.errors.map(({ message }) => message).join('; ')}`);
  }
  return document;
};

const validateServices = async (): Promise<void> => {
  const product = parseYaml(await readFile(file('product.yaml'), 'utf8'), 'product.yaml').contents;
  const lock = parseYaml(await readFile(file('services.lock.yaml'), 'utf8'), 'services.lock.yaml').contents;
  if (!isMap(product) || !isMap(lock)) throw new Error('product.yaml and services.lock.yaml must contain YAML mappings');

  const classification = product.get('classification');
  const declared = product.get('services', true);
  const services = lock.get('services', true);
  if (typeof classification !== 'string' || !isSeq(declared) || !isSeq(services)) {
    throw new Error('product.yaml must declare a classification and service list; services.lock.yaml must declare service rows');
  }

  const declaredIds = declared.items.map((item) => isScalar(item) ? item.value : undefined);
  if (declaredIds.some((id) => typeof id !== 'string' || id.length === 0)) {
    throw new Error('product.yaml services must contain non-empty service IDs');
  }
  const expectedIds = new Set(declaredIds as string[]);
  if (expectedIds.size !== declaredIds.length) throw new Error('product.yaml services must not contain duplicate IDs');

  const lockedIds = new Set<string>();
  for (const item of services.items) {
    if (!isMap(item)) throw new Error('services.lock.yaml services must contain mapping rows');
    const id = item.get('id');
    if (typeof id !== 'string' || id.length === 0) throw new Error('services.lock.yaml rows must have non-empty IDs');
    if (!expectedIds.has(id)) throw new Error(`services.lock.yaml contains undeclared service: ${id}`);
    if (lockedIds.has(id)) throw new Error(`services.lock.yaml contains duplicate service: ${id}`);

    const rowClassification = item.get('classification');
    const revisionNode = item.get('revision', true);
    const access = item.get('access');
    if (rowClassification !== classification) throw new Error(`service ${id} classification must match product.yaml`);
    const revision = isScalar(revisionNode)
      ? (typeof revisionNode.value === 'string' ? revisionNode.value : revisionNode.source)
      : undefined;
    if (typeof revision !== 'string' || !/^[0-9a-f]{40}$/u.test(revision)) {
      throw new Error(`service ${id} must pin a full SHA revision`);
    }
    if (access !== 'read-only') throw new Error(`service ${id} snapshot access must be read-only`);
    lockedIds.add(id);
  }

  const missing = [...expectedIds].filter((id) => !lockedIds.has(id));
  if (missing.length > 0) throw new Error(`services.lock.yaml is missing declared services: ${missing.join(', ')}`);
};

const command = process.argv[2] ?? 'validate';
await checkFiles();
if (command === 'doctor') {
  process.stdout.write('product-meta doctor passed (read-only synthetic profile)\n');
} else if (command === 'bootstrap') {
  await mkdir(file('.workspace/services'), { recursive: true });
  await mkdir(file('.workspace/services/credit-calculator'), { recursive: true });
  process.stdout.write('product-meta bootstrap prepared an ignored workspace; service source remains external and read-only\n');
} else if (command === 'validate') {
  await validateServices();
  process.stdout.write('product-meta validate passed\n');
} else if (command === 'start') {
  process.stdout.write('product-meta start is a read-only readiness check; run the pinned service separately\n');
} else {
  throw new Error(`Unknown product-meta command: ${command}`);
}
