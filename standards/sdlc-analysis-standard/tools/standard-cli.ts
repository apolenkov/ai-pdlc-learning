import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const path = (name: string): string => fileURLToPath(new URL(name, root));

const requiredFiles = [
  'manifest.json',
  'VERSION',
  'README.md',
  'PLATFORMS.md',
  'templates/specification.md',
  'templates/gitlab/merge_request_templates/Default.md',
  'schemas/standard-manifest.schema.json',
  'checks/contract.test.ts',
];

export const doctor = async (): Promise<string[]> => {
  const missing: string[] = [];
  for (const file of requiredFiles) {
    try {
      await readFile(path(file));
    } catch {
      missing.push(file);
    }
  }
  return missing;
};

const command = process.argv[2] ?? 'validate';
const missing = await doctor();
if (command === 'doctor') {
  if (missing.length > 0) throw new Error(`Missing standard files: ${missing.join(', ')}`);
  process.stdout.write('SDLC analysis standard doctor passed\n');
} else if (command === 'validate') {
  if (missing.length > 0)
    throw new Error(`Cannot validate standard; missing: ${missing.join(', ')}`);
  const version = (await readFile(path('VERSION'), 'utf8')).trim();
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version))
    throw new Error(`Invalid standard version: ${version}`);
  const manifest = JSON.parse(await readFile(path('manifest.json'), 'utf8')) as {
    version?: string;
  };
  if (manifest.version !== version) throw new Error('VERSION and manifest.version differ');
  const specification = await readFile(path('templates/specification.md'), 'utf8');
  const header = specification.split(/^##\s/mu)[0] ?? '';
  const reviews = [...header.matchAll(/^Архитектурный разбор:[ \t]*(.*)$/gmu)];
  const decision = reviews[0]?.[1]?.trim() ?? '';
  if (
    reviews.length !== 1 ||
    !/^(?:не требуется|запрошен \((?:данные|интеграции|безопасность|производительность|спор)\)|design\.md: \S[^\r\n]*)$/u.test(
      decision,
    )
  ) {
    throw new Error(
      'templates/specification.md: в шапке требуется одно поле «Архитектурный разбор»: не требуется | запрошен (<признак>) | design.md: <ссылка>',
    );
  }
  process.stdout.write(`SDLC analysis standard ${version} validated\n`);
} else {
  throw new Error(`Unknown command: ${command}`);
}
