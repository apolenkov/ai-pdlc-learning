import assert from 'node:assert/strict';
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const standardRoot = fileURLToPath(root);
const repositoryRoot = resolve(standardRoot, '../..');
const read = (file: string): Promise<string> => readFile(new URL(file, root), 'utf8');

const withStandardCopy = async (run: (copy: string) => void | Promise<void>): Promise<void> => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'sdlc standard ü space '));
  const copy = join(temporaryRoot, 'reference package');
  try {
    await cp(standardRoot, copy, { recursive: true });
    await symlink(join(repositoryRoot, 'node_modules'), join(copy, 'node_modules'), 'dir');
    await run(copy);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
};

await test('standard manifest, version and platform contract are coherent', async () => {
  const [manifestText, version, readme, platforms] = await Promise.all([
    read('manifest.json'),
    read('VERSION'),
    read('README.md'),
    read('PLATFORMS.md'),
  ]);
  const manifest: unknown = JSON.parse(manifestText);
  assert.ok(manifest !== null && typeof manifest === 'object');
  assert.ok('schemaVersion' in manifest && typeof manifest.schemaVersion === 'string');
  assert.ok('name' in manifest && typeof manifest.name === 'string');
  assert.ok('version' in manifest && typeof manifest.version === 'string');
  assert.ok('updatePolicy' in manifest && typeof manifest.updatePolicy === 'string');
  assert.ok('protectedProductPaths' in manifest && Array.isArray(manifest.protectedProductPaths));
  assert.ok(
    manifest.protectedProductPaths.every(
      (path: unknown): path is string => typeof path === 'string',
    ),
  );
  assert.equal(manifest.schemaVersion, 'sdlc-analysis-standard/v1');
  assert.equal(manifest.name, 'sdlc-analysis-standard');
  assert.equal(manifest.version, version.trim());
  assert.equal(manifest.updatePolicy, 'explicit-mr-pr');
  assert.ok(manifest.protectedProductPaths.includes('CONTEXT.md'));
  assert.match(readme, /(?:merge requests|запросы на слияние)/iu);
  assert.match(platforms, /macOS/);
  assert.match(platforms, /Windows/);
  assert.match(platforms, /Linux/);
  assert.match(readme, /bootstrap` запускает `doctor`/u);
  assert.match(readme, /будущему\s+контуру/u);
  assert.match(platforms, /из корня метарепозитория/u);
  assert.match(platforms, /Не запускайте `npm ci` в\s+каталоге стандарта/u);
  assert.doesNotMatch(
    `${manifestText}\n${readme}\n${platforms}`,
    /DTP_JIRA_API_TOKEN|Authorization:\s*Bearer|password\s*:/i,
  );
});

await test('standard and product doctor resolve files under paths with spaces and Unicode', async () => {
  await withStandardCopy((copy) => {
    const bootstrapOutput = execSync('npm run bootstrap', { cwd: copy, encoding: 'utf8' });
    const standardOutput = execFileSync(
      process.execPath,
      ['--experimental-strip-types', 'tools/standard-cli.ts', 'doctor'],
      { cwd: copy, encoding: 'utf8' },
    );
    const productRoot = join(copy, 'examples/product-meta');
    const productOutput = execFileSync(
      process.execPath,
      ['--experimental-strip-types', 'tools/product-cli.ts', 'doctor'],
      { cwd: productRoot, encoding: 'utf8' },
    );

    assert.match(bootstrapOutput, /standard doctor passed/u);
    assert.match(standardOutput, /standard doctor passed/u);
    assert.match(productOutput, /product-meta doctor passed/u);
  });
});

await test('product validation checks each declared service row', async () => {
  await withStandardCopy(async (copy) => {
    const productRoot = join(copy, 'examples/product-meta');
    const lockPath = join(productRoot, 'services.lock.yaml');
    const original = await readFile(lockPath, 'utf8');
    const validate = () =>
      spawnSync(
        process.execPath,
        ['--experimental-strip-types', 'tools/product-cli.ts', 'validate'],
        { cwd: productRoot, encoding: 'utf8' },
      );
    const calculatorCore = original.indexOf('  - id: calculator-core');
    assert.notEqual(calculatorCore, -1);
    const prefix = original.slice(0, calculatorCore);
    const coreRow = original.slice(calculatorCore);

    const valid = validate();
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /product-meta validate passed/u);
    await writeFile(
      lockPath,
      prefix +
        coreRow.replace('revision: 0000000000000000000000000000000000000000', 'revision: abc123'),
    );
    const invalidRevision = validate();
    assert.notEqual(invalidRevision.status, 0);
    assert.match(invalidRevision.stderr, /service calculator-core must pin a full SHA revision/u);
    await writeFile(lockPath, prefix + coreRow.replace('access: read-only', 'access: read-write'));
    const writable = validate();
    assert.notEqual(writable.status, 0);
    assert.match(writable.stderr, /service calculator-core snapshot access must be read-only/u);
  });
});

await test('standard validation requires an architecture review decision in the specification header', async () => {
  await withStandardCopy(async (copy) => {
    const templatePath = join(copy, 'templates/specification.md');
    const body = '# Change specification\n\n## Goal\n\nObservable outcome.\n';
    const cases = [
      { header: '', valid: false },
      { header: 'Архитектурный разбор: не требуется', valid: true },
      ...['данные', 'интеграции', 'безопасность', 'производительность', 'спор'].map((trigger) => ({
        header: `Архитектурный разбор: запрошен (${trigger})`,
        valid: true,
      })),
      { header: 'Архитектурный разбор: design.md: [Решение](design.md)', valid: true },
      { header: 'Архитектурный разбор: запрошен ()', valid: false },
      { header: 'Архитектурный разбор: запрошен (другое)', valid: false },
      { header: 'Архитектурный разбор: design.md:', valid: false },
      { header: 'Архитектурный разбор: готово', valid: false },
      {
        header: 'Архитектурный разбор: не требуется\nАрхитектурный разбор: запрошен (данные)',
        valid: false,
      },
    ];
    for (const { header, valid } of cases) {
      await writeFile(templatePath, body.replace('\n\n## Goal', `\n\n${header}\n\n## Goal`));
      const result = spawnSync(
        process.execPath,
        ['--experimental-strip-types', 'tools/standard-cli.ts', 'validate'],
        { cwd: copy, encoding: 'utf8' },
      );
      assert.equal(result.status === 0, valid, `${header || 'missing header'}: ${result.stderr}`);
      if (!valid) assert.match(result.stderr, /Архитектурный разбор/u);
    }
    await writeFile(templatePath, `${body}\nАрхитектурный разбор: не требуется\n`);
    const misplaced = spawnSync(
      process.execPath,
      ['--experimental-strip-types', 'tools/standard-cli.ts', 'validate'],
      { cwd: copy, encoding: 'utf8' },
    );
    assert.notEqual(misplaced.status, 0);
    assert.match(misplaced.stderr, /Архитектурный разбор/u);
  });
});

await test('3-star product metarepository has a complete local contract', async () => {
  const productRoot = new URL('examples/product-meta/', root);
  const readProduct = (file: string): Promise<string> =>
    readFile(new URL(file, productRoot), 'utf8');
  const [readme, makefile, domain, packageJson, gitignore, spec] = await Promise.all([
    readProduct('README.md'),
    readProduct('Makefile'),
    readProduct('DOMAIN.md'),
    readProduct('package.json'),
    readProduct('.gitignore'),
    readProduct('openspec/specs/credit-calculator/spec.md'),
  ]);
  assert.match(readme, /не копируется/u);
  assert.match(makefile, /doctor/);
  assert.match(makefile, /bootstrap/);
  assert.match(makefile, /validate/);
  assert.match(makefile, /start/);
  assert.match(domain, /Ежемесячный платёж/u);
  assert.match(packageJson, /product-cli\.ts/u);
  assert.match(gitignore, /\.workspace\//u);
  assert.match(spec, /Scenario: zero rate/u);
  assert.doesNotMatch(`${readme}\n${domain}\n${packageJson}`, /token|password|secret/i);
});
