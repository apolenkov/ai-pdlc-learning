import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  BANNER,
  GENERATED_ATTR,
  ROOT,
  applyHunks,
  generated,
  kitDrift,
  kitFatal,
  targetDir,
  targets,
} from '../video/_shared/build-kit.mjs';
import { drift } from '../video/_shared/sync.mjs';

// Фикстура: списки и варианты копируются, порождаемые kit.js собираются общим источником
// во временный каталог. Мутации ниже правят только фикстуру, рабочие копии не трогаются.
const withFixture = (check: (root: typeof ROOT) => void) => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-fixture-'));
  cpSync(ROOT.targets, join(dir, 'targets'), { recursive: true });
  cpSync(ROOT.variants, join(dir, 'variants'), { recursive: true });
  const root = {
    ...ROOT,
    video: join(dir, 'video'),
    targets: join(dir, 'targets'),
    variants: join(dir, 'variants'),
  };
  mkdirSync(root.video);
  for (const film of targets(root)) {
    const kitDir = targetDir(film, root);
    mkdirSync(kitDir, { recursive: true });
    writeFileSync(join(kitDir, 'kit.js'), generated(film, root));
    writeFileSync(join(kitDir, '.gitattributes'), GENERATED_ATTR);
  }
  try {
    check(root);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

await test('общие tools и kit роликов совпадают с эталоном video/_shared (node video/_shared/sync.mjs)', () => {
  assert.deepEqual(drift(), []);
});

await test('порождаемые kit.js совпадают с частями и вариантами video/_shared/kit (node video/_shared/build-kit.mjs)', () => {
  assert.deepEqual(kitDrift(), []);
});

await test('applyHunks: совпавший хунк заменяет строки со сдвигом', () => {
  assert.equal(
    applyHunks('a\nb\nc\n', [{ start: 1, remove: ['a'], add: ['A', 'A2'] }]),
    'A\nA2\nb\nc\n',
  );
});

await test('applyHunks: несовпавший хунк рвёт сборку', () => {
  assert.throws(
    () => applyHunks('a\nb\nc\n', [{ start: 2, remove: ['x'], add: ['y'] }]),
    /хунк 1 \(строка 2\) не совпал с эталоном/u,
  );
});

await test('фикстура со списками и порождёнными копиями проходит проверку', () => {
  withFixture((root) => {
    assert.deepEqual(kitDrift(root), []);
  });
});

await test('kitDrift: копия с баннером вне списков — расхождение', () => {
  withFixture((root) => {
    const list = join(root.targets, 'lane-4.txt');
    writeFileSync(list, readFileSync(list, 'utf8').replace(/^block-r1\n/mu, ''));
    writeFileSync(
      join(targetDir('block-r1', root), 'kit.js'),
      `${BANNER}/* копия после выпадения из списка */\n`,
    );
    const found = kitDrift(root);
    assert.ok(
      found.some(
        (line) => line.includes('block-r1') && line.includes('нет ни в одном списке полос'),
      ),
      found.join('\n'),
    );
  });
});

await test('kitDrift: конфиг без строки в списках — сирота', () => {
  withFixture((root) => {
    // block-0a — ручная копия варианта H, ни в одну полосу не входит: конфиг для неё — сирота.
    writeFileSync(join(root.targets, 'block-0a.json'), `${JSON.stringify({ variant: 'H' })}\n`);
    const found = kitDrift(root);
    assert.ok(
      found.some(
        (line) => line.includes('block-0a') && line.includes('не указан ни в одном списке полос'),
      ),
      found.join('\n'),
    );
  });
});

await test('kitDrift: ролик в двух списках полос — расхождение', () => {
  withFixture((root) => {
    const list = join(root.targets, 'lane-1.txt');
    writeFileSync(list, `${readFileSync(list, 'utf8')}block-r1\n`);
    const found = kitDrift(root);
    assert.ok(
      found.some((line) => line.includes('block-r1') && line.includes('указан дважды')),
      found.join('\n'),
    );
  });
});

await test('kitFatal: конфиг ролика без bodySha256 — расхождение', () => {
  withFixture((root) => {
    writeFileSync(join(root.targets, 'block-r1.json'), `${JSON.stringify({ variant: 'B' })}\n`);
    const found = kitFatal(root);
    assert.ok(
      found.some((line) => line.includes('block-r1') && line.includes('нет bodySha256')),
      found.join('\n'),
    );
  });
});

await test('kitFatal: вариант без bodySha256 — расхождение', () => {
  withFixture((root) => {
    const file = join(root.variants, 'F.json');
    writeFileSync(file, readFileSync(file, 'utf8').replace(/\s*"bodySha256": "[0-9a-f]+",/u, ''));
    assert.ok(
      kitFatal(root).some(
        (line) => line.includes('variants/F.json') && line.includes('нет bodySha256'),
      ),
    );
  });
});
