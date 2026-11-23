import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/**
 * Голосовые исходники block-0 (vo-v3) и block-map (vo-v4): наборы блоков,
 * из которых build-vo собирает закоммиченные scene-*.alignment.json.
 * block-0 копирует блок байт-в-байт, block-map нормализует тайминги (текст тот же).
 */
const SOURCE_ALIGNMENTS: Record<string, { dir: string; blocks: string[] }> = {
  'block-0': {
    dir: 'video/block-0/film/assets/vo-v3',
    blocks: ['0', '0b', '0m', '3', '6'],
  },
  'block-map': {
    dir: 'video/block-map/film/assets/vo-v4',
    blocks: ['0', '0m', '1', '2', '3', '4', '5', '6'],
  },
};

/** JSON alignment: массив characters (речь) одинаков у источника и сцены. */
const charactersOf = (json: string): string => {
  const found = /"characters":\s*(\[[^\]]*\])/u.exec(json);
  assert.ok(found !== null, 'alignment без поля characters');
  return found[1] ?? '';
};

export const checkAlignmentSources = async (tracked: Set<string>): Promise<void> => {
  for (const [name, spec] of Object.entries(SOURCE_ALIGNMENTS)) {
    const expected = spec.blocks.map((block) => `${spec.dir}/block-${block}.alignment.json`).sort();
    const files = [...tracked]
      .filter((path) => path.startsWith(`${spec.dir}/`) && path.endsWith('.alignment.json'))
      .sort();
    assert.deepEqual(
      files,
      expected,
      `ролик ${name}: набор голосовых alignment в Git разошёлся (13 файлов в сумме)`,
    );
    for (const block of spec.blocks) {
      const scene = `video/${name}/film/assets/vo/scene-${block}.alignment.json`;
      assert.ok(tracked.has(scene), `ролик ${name}: нет ${scene}`);
      const [sourceRaw, sceneRaw] = await Promise.all([
        readFile(`${spec.dir}/block-${block}.alignment.json`, 'utf8'),
        readFile(scene, 'utf8'),
      ]);
      assert.equal(
        charactersOf(sourceRaw),
        charactersOf(sceneRaw),
        `ролик ${name}: текст block-${block} разошёлся с закоммиченным alignment`,
      );
      if (name === 'block-0')
        assert.equal(
          sourceRaw,
          sceneRaw,
          `ролик ${name}: block-${block} должен лежать байт-в-байт в scene-${block}`,
        );
    }
  }
};
