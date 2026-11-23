import assert from 'node:assert/strict';
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  main,
  runVoiceOnly,
  buildGraph,
  buildOptions,
  buildPass1Argv,
  buildPass2Argv,
  buildPlan,
  parseArgs,
  parseConfig,
  parseAudioBitrate,
} from '../video/_shared/tools/voice-only.ts';
import { NO_RUN, sandbox, loadFixture } from './voice-only-test-support.ts';

await test('--audio-bitrate: CLI и API принимают только 128k|192k, по умолчанию 128k', () => {
  const c = parseConfig(loadFixture().config, 'pin', '/cfg');
  assert.equal(buildOptions(c, 'pin', {}).audioBitrate, '128k');
  for (const bitrate of ['128k', '192k']) {
    const cli = parseArgs(['--from-pin', '/c.json', '--audio-bitrate', bitrate]);
    assert.equal(buildOptions(c, cli.mode, cli.flags).audioBitrate, bitrate);
    assert.equal(parseAudioBitrate(bitrate), bitrate);
  }
  for (const bad of ['96k', '256k', '192K', '192000', ' 192k', '192k ', '', null, 192000]) {
    assert.throws(() => parseAudioBitrate(bad), /--audio-bitrate/);
    if (typeof bad === 'string')
      assert.throws(() => buildOptions(c, 'pin', { '--audio-bitrate': bad }), /--audio-bitrate/);
  }
  for (const tail of [[], ['--plan-only']])
    assert.throws(() => parseArgs(['--from-pin', '/c.json', '--audio-bitrate', ...tail]), /usage/);
});

await test('192k меняет только -b:a второго прохода: первый проход, граф, видео и metadata неизменны', () => {
  const f = loadFixture();
  const c = parseConfig(f.config, 'pin', '/cfg');
  const p = buildPlan(c, 'pin', f.samples);
  for (const encoder of ['aac', 'aac_at'] as const) {
    for (const ceiling of [null, -5]) {
      const base = buildPass2Argv(c, p, f.measured, '/o.mp4', encoder, ceiling);
      assert.deepEqual(buildPass2Argv(c, p, f.measured, '/o.mp4', encoder, ceiling, '128k'), base);
      const next = buildPass2Argv(c, p, f.measured, '/o.mp4', encoder, ceiling, '192k');
      assert.equal(next.length, base.length);
      assert.deepEqual(
        next.flatMap((t, i) => (t === base[i] ? [] : [i])),
        [base.indexOf('-b:a') + 1],
      );
      assert.equal(next[base.indexOf('-b:a') + 1], '192k');
      assert.equal(next[next.indexOf('-filter_complex') + 1], buildGraph(p, f.measured, ceiling));
      assert.equal(next[next.indexOf('-c') + 1], 'copy');
    }
  }
  assert.deepEqual(buildPass1Argv(c, p), f.pass1Argv);
  // Reflect.apply имитирует нетипизированного JS-потребителя API.
  assert.throws(
    () => Reflect.apply(buildPass2Argv, null, [c, p, f.measured, '/o.mp4', 'aac', null, '256k']),
    /--audio-bitrate/,
  );
});

await test('неверный bitrate API и CLI отклоняется до runner и записи результатов', () => {
  const s = sandbox();
  try {
    const invalid = { ...s.opts, audioBitrate: '256k' };
    assert.throws(
      () => Reflect.apply(runVoiceOnly, null, [s.config(), invalid, 'pin', NO_RUN]),
      /--audio-bitrate/,
    );
    const c = s.config();
    const config = join(s.dir, 'config.json');
    writeFileSync(
      config,
      JSON.stringify({
        schema: 'task671-rollout-config/v1',
        id: c.id,
        pin: c.input,
        video: { timeBase: `1/${c.timescale}`, durationS: c.durationS },
        base: { samples48: c.baseSamples48 },
        expectedDelta16: 80,
        replicas: c.replies,
        results: { root: 'results' },
      }),
    );
    assert.throws(
      () => main(['--from-pin', config, '--audio-bitrate', '256k'], NO_RUN),
      /--audio-bitrate/,
    );
    assert.ok(!readdirSync(s.dir).includes('out'));
    assert.ok(!readdirSync(s.dir).includes('results'));
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});
