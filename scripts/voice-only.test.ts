import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildGraph,
  ceilingFilter,
  ceilingLimit,
  buildOptions,
  buildPass1Argv,
  buildPass2Argv,
  buildPlan,
  extractLoudnorm,
  mp3Samples48,
  p6,
  parseArgs,
  parseIntegratedLufs,
  parseTruePeakDb,
  buildTruePeakArgv,
  parseConfig,
  parseMeasured,
} from '../video/_shared/tools/voice-only.ts';
import { loadFixture, loudnorm, probeJson } from './voice-only-test-support.ts';

// ---------- argv токен в токен с принятым r3 ----------
await test('--from-pin на данных r3: argv обоих проходов совпадает с принятым stage3-remux/COMMANDS.json', () => {
  const f = loadFixture();
  const c = parseConfig(f.config, 'pin', '/cfg');
  assert.equal(c.delta, 240);
  const plan = buildPlan(c, 'pin', f.samples);
  assert.deepEqual(buildPass1Argv(c, plan), f.pass1Argv);
  const out = '/some/where/block-r3-720p.voice-only.candidate.mp4';
  assert.deepEqual(buildPass2Argv(c, plan, f.measured, out), [...f.pass2Argv.slice(0, -1), out]);
  assert.equal(plan.base, 14707200);
  assert.deepEqual(
    plan.rows.map((r) => r.delay),
    [
      240, 360240, 1670640, 2400240, 3677040, 4872240, 6081840, 7905840, 9158640, 10310640,
      12413040, 13694640,
    ],
  );
  assert.ok(
    plan.rows.every((r) => r.trimTo === null),
    'у r3 обрезки нет',
  );
  assert.equal(plan.minGap, 71999);
  assert.equal(plan.lastEnd, 14554868);
});

await test('argv: запрещённые токены и afade отсутствуют, видео копией, три -map', () => {
  const f = loadFixture();
  const c = parseConfig(f.config, 'pin', '/cfg');
  const argv2 = buildPass2Argv(c, buildPlan(c, 'pin', f.samples), f.measured, '/o.mp4');
  for (const t of ['-shortest', '-t', '-to', '-ss', '-vf', '-af', '-y'])
    assert.ok(!argv2.includes(t), t);
  assert.ok(!argv2.join(' ').includes('afade'));
  const at = argv2.indexOf('-map');
  assert.deepEqual(argv2.slice(at, at + 6), ['-map', '0', '-map', '-0:a', '-map', '[aout]']);
  assert.ok(argv2.includes('-copytb') && argv2.includes('-avoid_negative_ts'));
  assert.ok(argv2.includes('+bitexact') && argv2.includes('-c') && argv2.includes('copy'));
  assert.equal(argv2[argv2.indexOf('-video_track_timescale') + 1], '15360');
  assert.equal(argv2[argv2.indexOf('-movflags') + 1], '+faststart');
  assert.equal(argv2[0], '-n');
});

// ---------- режимы и δ ----------
await test('δ: --from-pin берёт expectedDelta16 × 3 (80 → 240), --from-render требует 0', () => {
  const f = loadFixture();
  assert.equal(parseConfig(f.config, 'pin', '/cfg').delta, 240);
  assert.throws(() => parseConfig(f.config, 'render', '/cfg'), /δ = 0/);
  const zero = parseConfig({ ...f.config, expectedDelta16: 0 }, 'render', '/cfg');
  assert.equal(zero.delta, 0);
  const p0 = buildPlan(zero, 'render', f.samples);
  assert.equal(p0.rows[0]?.delay, 0);
  assert.equal(p0.rows[1]?.delay, 360000);
  assert.throws(
    () => parseConfig({ ...f.config, expectedDelta16: 1601 }, 'pin', '/cfg'),
    /expectedDelta16/,
  );
});

// ---------- помощники ----------
interface Spec {
  start: number;
  dur: number;
  mp3: number;
}
function build(specs: Spec[], base = 100000, extra: Record<string, unknown> = {}) {
  const c = parseConfig(
    {
      schema: 'task671-rollout-config/v1',
      id: 't',
      pin: { path: 'in.mp4', sha256: 'c'.repeat(64), size: 5 },
      video: { timeBase: '1/15360', packets: 1, durationS: base / 48000 },
      base: { samples48: base },
      expectedDelta16: 80,
      replicas: specs.map((s, i) => ({
        id: `vo-${i + 1}`,
        path: `${i}.mp3`,
        sha256: 'a'.repeat(64),
        dataStart: s.start,
        dataDuration: s.dur,
        volume: 1,
      })),
      results: { root: 'results' },
      ...extra,
    },
    'pin',
    '/cfg',
  );
  return { c, mp3: specs.map((s) => s.mp3) };
}
const A: Spec = { start: 0, dur: 1, mp3: 48000 };
const B: Spec = { start: 1.5, dur: 0.5, mp3: 24000 };
const plan = (specs: Spec[], base?: number) => {
  const b = build(specs, base);
  return buildPlan(b.c, 'pin', b.mp3);
};

// ---------- обрезка по data-duration ----------
await test('MP3 длиннее data-duration: atrim по data-duration; в пределах 0,01 с — без обрезки', () => {
  const b = build([
    { ...A, mp3: 60000 },
    { ...B, mp3: 24000 + 480 },
  ]);
  const p = buildPlan(b.c, 'pin', b.mp3);
  assert.equal(p.rows[0]?.trimTo, 48000);
  assert.equal(p.rows[0]?.length, 48000);
  assert.equal(p.rows[1]?.trimTo, null);
  const g = buildGraph(p, null);
  assert.match(g, /channel_layouts=mono,atrim=end_sample=48000,ashowinfo@vo01,/);
  assert.match(g, /channel_layouts=mono,ashowinfo@vo02,adelay=delays=72240S/);
  assert.equal((g.match(/atrim=end_sample/g) ?? []).length, 2, 'atrim: основа и реплика 1');
});

await test('replicaTrimToleranceS управляет допуском обрезки', () => {
  const tight = build([{ ...A, mp3: 48100 }, B], 100000, { replicaTrimToleranceS: 0 });
  assert.equal(buildPlan(tight.c, 'pin', tight.mp3).rows[0]?.trimTo, 48000);
  const loose = build([{ ...A, mp3: 48100 }, B]);
  assert.equal(buildPlan(loose.c, 'pin', loose.mp3).rows[0]?.trimTo, null);
});

await test('обрезка освобождает зазор: без неё было бы наложение, при data-duration длиннее — оно есть', () => {
  assert.equal(plan([{ ...A, mp3: 90000 }, B]).rows[0]?.length, 48000); // конец 48240 < 72240
  assert.throws(
    () => plan([{ ...A, dur: 2, mp3: 90000 }, B]),
    /заходит на реплику 2 на 18000 отсчётов/,
  );
});

await test('перекрытие: касание допустимо, наложение на 1 отсчёт отклоняется', () => {
  assert.equal(plan([{ start: 0, dur: 1.5, mp3: 72000 }, B]).minGap, 0); // конец 72240 == начало
  assert.throws(() => plan([{ start: 0, dur: 1.5, mp3: 72001 }, B]), /на 1 отсчётов/);
});

await test('граница длины основы: конец последней реплики == основа допустим, +1 — нет', () => {
  // вторая реплика: начало 72240, длина 24000, конец 96240
  assert.equal(plan([A, B], 96240).lastEnd, 96240);
  assert.throws(() => plan([A, B], 96239), /за пределами основы 96239/);
});

await test('порядок и длительность: задержки растут; video.durationS сверяется с base.samples48', () => {
  assert.throws(() => plan([A, { ...B, start: 0 }]), /не растёт/);
  const b = build([A, B]);
  b.c.durationS += 0.002;
  assert.throws(() => buildPlan(b.c, 'pin', b.mp3), /video\.durationS/);
});

await test('конфиг: схема, SHA в нижнем регистре, «..» в пути, timeBase 1/N, usage', () => {
  const f = loadFixture();
  assert.throws(() => parseConfig({ ...f.config, schema: 'x' }, 'pin', '/cfg'), /schema/);
  assert.throws(() => parseConfig({}, 'pin', '/cfg'), /schema/);
  assert.throws(
    () => parseConfig({ ...f.config, video: { timeBase: '2/15360', durationS: 1 } }, 'pin', '/c'),
    /timeBase/,
  );
  const bad = (k: string, v: unknown) =>
    build([A, B], 100000, {
      replicas: [
        {
          id: 'a',
          path: 'a.mp3',
          sha256: 'a'.repeat(64),
          dataStart: 0,
          dataDuration: 1,
          volume: 1,
          [k]: v,
        },
      ],
    });
  assert.throws(() => bad('sha256', 'A'.repeat(64)), /SHA-256/);
  assert.throws(() => bad('path', '../a.mp3'), /«\.\.»/);
  assert.throws(() => parseArgs(['--from-pin']), /usage/);
  assert.throws(() => parseArgs(['--x', 'c.json']), /usage/);
  assert.throws(() => parseArgs(['--from-pin', 'c.json', '--out-dir']), /usage/);
  assert.equal(parseArgs(['--from-render', 'c.json', '--plan-only']).mode, 'render');
  assert.equal(parseArgs(['--from-pin', 'c.json', '--out-dir', 'o']).flags['--out-dir'], 'o');
});

await test('опции: ffmpeg по умолчанию — принятая сборка; --ffmpeg требует SHA; outFile — имя файла', () => {
  const { c } = build([A, B]);
  const o = buildOptions(c, 'pin', {});
  assert.equal(o.ffmpeg.sha256, '768609fb3f463ff9272bebac61478515f19e43c5343b0c60dde2e6230c40013e');
  assert.equal(o.outFile, 't-720p.voice-only.candidate.mp4');
  assert.equal(o.outDir, '/cfg/results/build');
  assert.throws(() => buildOptions(c, 'pin', { '--ffmpeg': '/x/ffmpeg' }), /--ffmpeg-sha256/);
  assert.throws(() => buildOptions(c, 'pin', { '--out-file': 'a/b.mp4' }), /без каталога/);
  assert.equal(buildOptions(c, 'render', {}).outFile, 't.voice-only.mp4');
});

// ---------- длина MP3 ----------
await test('длина MP3: метод r3 (пакеты − skip − padding), floor + 1 как n48Max; значения r3 воспроизводятся', () => {
  assert.equal(mp3Samples48(JSON.parse(probeJson(264600)), 'vo-01'), 288001); // 6,0 с
  assert.equal(mp3Samples48(JSON.parse(probeJson(1134703)), 'vo-02'), 1235051);
  assert.equal(mp3Samples48(JSON.parse(probeJson(599387)), 'vo-03'), 652395);
  assert.throws(() => mp3Samples48({ streams: [], packets: [] }, 'x'), /один поток mp3/);
  assert.throws(() => mp3Samples48('x', 'x'), /не объект/);
});

// ---------- loudnorm ----------
await test('loudnorm: один полный JSON, строгие десятичные, P6', () => {
  const o = extractLoudnorm(loudnorm('linear'), 'p');
  assert.equal(parseMeasured(o, 'p').input_i, '-19.09');
  assert.throws(() => extractLoudnorm(loudnorm('linear') + loudnorm('linear'), 'p'), /ровно один/);
  assert.throws(() => extractLoudnorm('no json', 'p'), /ровно один/);
  for (const bad of ['-inf', 'nan', '1e3', '--1', '']) {
    assert.throws(() => parseMeasured({ ...o, input_i: bad }, 'p'), /десятичное/);
  }
  assert.throws(() => parseMeasured({ ...o, input_lra: '120.0' }, 'p'), /вне/);
  assert.equal(p6({ output_i: '-16.31', output_tp: '-2.50' }, -2.4, -16.2).pass, true);
  assert.equal(p6({ output_i: '-17.2', output_tp: '-1.0' }, -2.4, -16.2).reasons.length, 2);
});

await test('--audio-encoder: по умолчанию aac; aac_at принимается; прочее отклоняется', () => {
  const c = parseConfig(loadFixture().config, 'pin', '/cfg');
  assert.equal(buildOptions(c, 'pin', {}).encoder, 'aac');
  assert.equal(buildOptions(c, 'pin', { '--audio-encoder': 'aac_at' }).encoder, 'aac_at');
  assert.throws(
    () => buildOptions(c, 'pin', { '--audio-encoder': 'libfdk_aac' }),
    /aac или aac_at/,
  );
  assert.deepEqual(parseArgs(['--from-pin', '/c.json', '--audio-encoder', 'aac_at']).flags, {
    '--audio-encoder': 'aac_at',
  });
  assert.throws(() => parseArgs(['--from-pin', '/c.json', '--audio-encoder']), /usage/);
});

await test('aac_at меняет в argv второго прохода ровно один токен (кодер); остальное токен в токен', () => {
  const f = loadFixture();
  const c = parseConfig(f.config, 'pin', '/cfg');
  const plan = buildPlan(c, 'pin', f.samples);
  const out = '/x/y.mp4';
  const a = buildPass2Argv(c, plan, f.measured, out);
  const b = buildPass2Argv(c, plan, f.measured, out, 'aac_at');
  assert.equal(a.length, b.length);
  const idx = a.flatMap((t, i) => (t === b[i] ? [] : [i]));
  assert.equal(idx.length, 1);
  assert.deepEqual([a[idx[0] ?? 0], b[idx[0] ?? 0]], ['aac', 'aac_at']);
  assert.equal(a[(idx[0] ?? 0) - 1], '-c:a');
  assert.deepEqual(buildPass2Argv(c, plan, f.measured, out, 'aac'), a);
  assert.deepEqual(buildPass1Argv(c, plan), f.pass1Argv);
});

await test('замер true peak готового файла: argv только читает; последнее значение, тишина = −200, пустой вывод — ошибка', () => {
  const argv = buildTruePeakArgv('/x/y.mp4');
  assert.ok(argv.includes('-n') && argv.includes('-nostdin') && !argv.includes('-y'));
  assert.ok(
    argv.includes('ebur128=peak=true:metadata=1:framelog=quiet,ametadata=mode=print:file=-'),
  );
  const tp = parseTruePeakDb('lavfi.r128.true_peak=0.5\nlavfi.r128.true_peak=0.912011\n', 'x');
  assert.equal(tp, Math.round(20000 * Math.log10(0.912011)) / 1000);
  assert.equal(parseTruePeakDb('lavfi.r128.true_peak=0.000000\n', 'x'), -200);
  assert.equal(parseTruePeakDb('lavfi.r128.true_peak=-inf\n', 'x'), -200);
  assert.throws(() => parseTruePeakDb('nothing\n', 'x'), /нет lavfi\.r128\.true_peak/);
});

await test('p6: true peak готового файла выше −1,5 — отказ с причиной', () => {
  const ok = { output_i: '-16.1', output_tp: '-2.5' };
  assert.equal(p6(ok, -1.6, -16.2).pass, true);
  assert.equal(p6(ok, -1.5, -16.2).pass, true);
  const bad = p6(ok, -0.81, -16.2);
  assert.equal(bad.pass, false);
  assert.match(bad.reasons.join(), /true peak готового файла -0\.81 > -1\.5/);
  assert.equal(bad.reasons.length, 1);
});

await test('громкость I готового файла: последнее значение lavfi.r128.I; пустой вывод — ошибка', () => {
  assert.equal(parseIntegratedLufs('lavfi.r128.I=-30.5\nlavfi.r128.I=-17.052\n', 'x'), -17.052);
  assert.throws(() => parseIntegratedLufs('lavfi.r128.true_peak=0.5\n', 'x'), /нет lavfi\.r128\.I/);
});

await test('p6: громкость I готового файла вне [−16,5; −15,5] — отказ с причиной, даже если output_i loudnorm в окне', () => {
  const ok = { output_i: '-16.1', output_tp: '-2.5' };
  assert.equal(p6(ok, -2.4, -16.0).pass, true);
  assert.equal(p6(ok, -2.4, -16.5).pass, true);
  assert.equal(p6(ok, -2.4, -15.5).pass, true);
  const bad = p6(ok, -2.4, -17.052);
  assert.equal(bad.pass, false);
  assert.match(bad.reasons.join(), /громкость I готового файла -17\.052 вне \[-16\.5, -15\.5\]/);
  assert.equal(bad.reasons.length, 1);
});

await test('--pre-encoder-ceiling-db: по умолчанию выключен; значение парсится и проверяется по диапазону', () => {
  const c = parseConfig(loadFixture().config, 'pin', '/cfg');
  assert.equal(buildOptions(c, 'pin', {}).preEncoderCeilingDb, null);
  assert.equal(
    buildOptions(c, 'pin', { '--pre-encoder-ceiling-db': '-5.0' }).preEncoderCeilingDb,
    -5,
  );
  for (const bad of ['5', '-0x5', 'abc', '-1.4', '-25', '--5', '']) {
    assert.throws(
      () => buildOptions(c, 'pin', { '--pre-encoder-ceiling-db': bad }),
      /(?:ceiling|потолок|dBFS)/,
      bad,
    );
  }
  assert.deepEqual(parseArgs(['--from-pin', '/c.json', '--pre-encoder-ceiling-db', '-5.0']).flags, {
    '--pre-encoder-ceiling-db': '-5.0',
  });
  assert.throws(() => parseArgs(['--from-pin', '/c.json', '--pre-encoder-ceiling-db']), /usage/);
});

await test('потолок −5,0 dBFS: предел 10^(X/20), звено alimiter строго после loudnorm и перед кодером', () => {
  assert.equal(ceilingLimit(-5), 0.5623413252);
  assert.equal(ceilingFilter(-5), 'alimiter=limit=0.5623413252:level=disabled:latency=1');
  assert.throws(() => ceilingLimit(Number.NaN), /вне/);
  const f = loadFixture();
  const c = parseConfig(f.config, 'pin', '/cfg');
  const plan = buildPlan(c, 'pin', f.samples);
  const plain = buildGraph(plan, f.measured);
  const capped = buildGraph(plan, f.measured, -5);
  assert.equal(buildGraph(plan, f.measured, null), plain);
  assert.equal(
    capped,
    plain.replace(/\[aout\]$/, ',alimiter=limit=0.5623413252:level=disabled:latency=1[aout]'),
  );
  assert.match(capped, /loudnorm=[^;]*,aresample=48000,alimiter=[^;]*\[aout\]$/);
  assert.equal((capped.match(/alimiter/g) ?? []).length, 1);
});

await test('потолок меняет в argv второго прохода только граф; первый проход, кодер и прочее токен в токен', () => {
  const f = loadFixture();
  const c = parseConfig(f.config, 'pin', '/cfg');
  const plan = buildPlan(c, 'pin', f.samples);
  const out = '/x/y.mp4';
  const a = buildPass2Argv(c, plan, f.measured, out);
  const b = buildPass2Argv(c, plan, f.measured, out, 'aac', -5);
  assert.equal(a.length, b.length);
  const idx = a.flatMap((t, i) => (t === b[i] ? [] : [i]));
  assert.equal(idx.length, 1);
  assert.equal(a[(idx[0] ?? 0) - 1], '-filter_complex');
  assert.equal(b[idx[0] ?? 0], buildGraph(plan, f.measured, -5));
  assert.ok(b.includes('aac') && !b.includes('-af') && !b.includes('-shortest'));
  assert.deepEqual(buildPass2Argv(c, plan, f.measured, out, 'aac', null), a);
  assert.deepEqual(buildPass1Argv(c, plan), f.pass1Argv);
});
