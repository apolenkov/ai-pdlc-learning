import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  parseMeasured,
  runVoiceOnly,
  sha256Text,
  type Runner,
} from '../video/_shared/tools/voice-only.ts';
import {
  NO_RUN,
  FF_PROBE,
  sandbox,
  isRec,
  loudnorm,
  fake,
  probeJson,
  result,
  truePeakOut,
} from './voice-only-test-support.ts';

// ---------- запуск с подменой процесса ----------

await test('полный прогон с подменой ffmpeg: два запуска, argv/SHA/тип нормализации в квитанции, запись только в outDir', () => {
  const s = sandbox();
  try {
    const calls: string[][] = [];
    const r = runVoiceOnly(s.config(), s.opts, 'pin', fake(calls), () => '2026-10-24T00:00:00Z');
    assert.equal(calls.length, 2);
    assert.equal(r['status'], 'BUILT');
    assert.equal(r['normalizationType'], 'dynamic');
    assert.deepEqual(r['argv1'], calls[0]);
    assert.deepEqual(r['argv2'], calls[1]);
    assert.equal(r['argv1Sha256'], sha256Text(JSON.stringify(calls[0])));
    assert.deepEqual(
      r['measured'],
      parseMeasured(
        {
          input_i: '-19.09',
          input_tp: '-1.52',
          input_lra: '3.30',
          input_thresh: '-29.23',
          target_offset: '0.31',
        },
        't',
      ),
    );
    assert.match(
      calls[1]?.join(' ') ?? '',
      /measured_I=-19\.09:measured_TP=-1\.52:measured_LRA=3\.30:measured_thresh=-29\.23:offset=0\.31:linear=true/,
    );
    assert.equal(r['inputsUnchanged'], true);
    assert.deepEqual(readdirSync(s.opts.outDir).sort(), [
      'fake.mp4',
      'fake.mp4.pass1.stderr.log',
      'fake.mp4.pass2.stderr.log',
      'fake.mp4.receipt.json',
    ]);
    assert.deepEqual(readdirSync(s.dir).sort(), ['a.mp3', 'b.mp3', 'ffmpeg', 'in.mp4', 'out']);
    const receipt: unknown = JSON.parse(
      readFileSync(join(s.opts.outDir, 'fake.mp4.receipt.json'), 'utf8'),
    );
    assert.ok(isRec(receipt) && isRec(receipt['output']));
    assert.equal(receipt['output']['sha256'], sha256Text('mp4-bytes-aac'));
    assert.equal(receipt['schema'], 'voice-only-receipt/v2');
    assert.equal(receipt['encoder'], 'aac');
    assert.equal(receipt['audioBitrate'], '128k');
    assert.equal(receipt['fallbackReason'], null);
    assert.equal(receipt['encodedTruePeakDb'], r['encodedTruePeakDb']);
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('негатив: подмена одного MP3 другим файлом роняет сверку SHA до запуска ffmpeg', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, 'b.mp3'), 'from another film');
    assert.throws(
      () => runVoiceOnly(s.config(), s.opts, 'pin', NO_RUN),
      /SHA до не сходится: .*b\.mp3/,
    );
    assert.deepEqual(readdirSync(s.dir).sort(), ['a.mp3', 'b.mp3', 'ffmpeg', 'in.mp4']);
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('негатив: подмена пина и ffmpeg также роняет сверку SHA', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, 'in.mp4'), 'other');
    assert.throws(
      () => runVoiceOnly(s.config(), s.opts, 'pin', NO_RUN),
      /SHA до не сходится: .*in\.mp4/,
    );
    writeFileSync(join(s.dir, 'in.mp4'), 'video');
    writeFileSync(join(s.dir, 'ffmpeg'), 'patched');
    assert.throws(
      () => runVoiceOnly(s.config(), s.opts, 'pin', NO_RUN),
      /SHA до не сходится: .*ffmpeg/,
    );
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('вход изменился во время прогона: SHA после не сходится, квитанции нет', () => {
  const s = sandbox();
  try {
    const run = fake([], 'linear', () => writeFileSync(join(s.dir, 'a.mp3'), 'mutated'));
    assert.throws(() => runVoiceOnly(s.config(), s.opts, 'pin', run), /SHA после не сходится/);
    assert.ok(!readdirSync(s.opts.outDir).includes('fake.mp4.receipt.json'));
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('повтор: второй прогон в тот же outDir отклонён, ffmpeg не вызывается', () => {
  const s = sandbox();
  try {
    runVoiceOnly(s.config(), s.opts, 'pin', fake([]));
    const again: Runner = (program) => {
      if (program === FF_PROBE) return result('', probeJson(44100));
      throw new Error('ffmpeg must not be called');
    };
    assert.throws(() => runVoiceOnly(s.config(), s.opts, 'pin', again), /уже есть/);
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('ошибка первого прохода: остановка без второго запуска и без retry', () => {
  const s = sandbox();
  try {
    const calls: string[][] = [];
    const run: Runner = (program, argv) => {
      if (program === FF_PROBE) return result('', probeJson(44100));
      calls.push(argv);
      return { status: 1, signal: null, stdout: '', stderr: 'boom', error: null };
    };
    assert.throws(() => runVoiceOnly(s.config(), s.opts, 'pin', run), /pass1 завершился.*boom/);
    assert.equal(calls.length, 1);
    assert.ok(!readdirSync(s.opts.outDir).includes('fake.mp4'));
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('P6 не сошёлся: статус BUILT_P6_FAIL в квитанции, результат оставлен', () => {
  const s = sandbox();
  try {
    const run: Runner = (program, argv) => {
      if (program === FF_PROBE) return result('', probeJson(44100));
      if (argv.some((t) => t.startsWith('ebur128='))) return result('', truePeakOut(-2.4));
      if (!argv.includes('-f')) writeFileSync(argv[argv.length - 1] ?? '', 'x');
      return result(loudnorm('dynamic', '-18.0', '-0.5'));
    };
    assert.equal(runVoiceOnly(s.config(), s.opts, 'pin', run)['status'], 'BUILT_P6_FAIL');
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('потолок задан, loudnorm output_i −16,10, ebur128 I −17,05: BUILT_P6_FAIL с причиной про громкость готового файла', () => {
  const s = sandbox();
  try {
    const run: Runner = (program, argv) => {
      if (program === FF_PROBE) return result('', probeJson(44100));
      if (argv.some((t) => t.startsWith('ebur128='))) return result('', truePeakOut(-2.4, -17.05));
      if (!argv.includes('-f')) writeFileSync(argv[argv.length - 1] ?? '', 'x');
      return result(loudnorm('dynamic', '-16.10', '-2.50'));
    };
    const r = runVoiceOnly(s.config(), { ...s.opts, preEncoderCeilingDb: -5 }, 'pin', run);
    assert.equal(r['status'], 'BUILT_P6_FAIL');
    assert.equal(r['encodedIntegratedLufs'], -17.05);
    assert.ok(isRec(r['p6']));
    assert.match(String(r['p6']['reasons']), /громкость I готового файла -17\.05 вне/);
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('output_i loudnorm вне окна при готовом файле в окне: BUILT_P6_FAIL, обе проверки в силе', () => {
  const s = sandbox();
  try {
    const run: Runner = (program, argv) => {
      if (program === FF_PROBE) return result('', probeJson(44100));
      if (argv.some((t) => t.startsWith('ebur128='))) return result('', truePeakOut(-2.4, -16.2));
      if (!argv.includes('-f')) writeFileSync(argv[argv.length - 1] ?? '', 'x');
      return result(loudnorm('dynamic', '-17.20', '-2.50'));
    };
    const r = runVoiceOnly(s.config(), s.opts, 'pin', run);
    assert.equal(r['status'], 'BUILT_P6_FAIL');
    assert.ok(isRec(r['p6']));
    assert.match(String(r['p6']['reasons']), /output_i -17\.2 вне/);
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('вывод ebur128 без lavfi.r128.I: остановка без квитанции', () => {
  const s = sandbox();
  try {
    const run: Runner = (program, argv) => {
      if (program === FF_PROBE) return result('', probeJson(44100));
      if (argv.some((t) => t.startsWith('ebur128=')))
        return result('', 'lavfi.r128.true_peak=0.5\n');
      if (!argv.includes('-f')) writeFileSync(argv[argv.length - 1] ?? '', 'x');
      return result(loudnorm('dynamic'));
    };
    assert.throws(() => runVoiceOnly(s.config(), s.opts, 'pin', run), /нет lavfi\.r128\.I/);
    assert.ok(!readdirSync(s.opts.outDir).includes('fake.mp4.receipt.json'));
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('замер готового файла упал: остановка без квитанции', () => {
  const s = sandbox();
  try {
    const inner = fake([]);
    const run: Runner = (program, argv, o) =>
      argv.some((t) => t.startsWith('ebur128='))
        ? { status: 1, signal: null, stdout: '', stderr: 'ebur128 boom', error: null }
        : inner(program, argv, o);
    assert.throws(
      () => runVoiceOnly(s.config(), s.opts, 'pin', run),
      /замер true peak и громкости готового файла завершился с ошибкой.*ebur128 boom/,
    );
    assert.ok(!readdirSync(s.opts.outDir).includes('fake.mp4.receipt.json'));
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('обрезка в прогоне: MP3 1,5 с при data-duration 1 с режется atrim, ffprobe вызывается на каждую реплику', () => {
  const s = sandbox();
  try {
    const calls: string[][] = [];
    const probed: string[] = [];
    const run: Runner = (program, argv, o) => {
      if (program === FF_PROBE) {
        probed.push(argv[argv.length - 1] ?? '');
        return result('', probeJson(argv.includes('a.mp3') ? 66150 : 22050));
      }
      return fake(calls)(program, argv, o);
    };
    runVoiceOnly(s.config(), s.opts, 'pin', run);
    assert.deepEqual(probed, ['a.mp3', 'b.mp3']);
    assert.match(calls[0]?.join(' ') ?? '', /atrim=end_sample=48000,ashowinfo@vo01/);
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('192k: один второй проход с aac, receipt явный; pass1, граф и копирование видео прежние', () => {
  const s = sandbox();
  try {
    const base: string[][] = [];
    runVoiceOnly(s.config(), { ...s.opts, outDir: join(s.dir, 'base') }, 'pin', fake(base));
    const calls: string[][] = [];
    const r = runVoiceOnly(s.config(), { ...s.opts, audioBitrate: '192k' }, 'pin', fake(calls));
    assert.equal(calls.length, 2);
    assert.equal(r['status'], 'BUILT');
    assert.equal(r['audioBitrate'], '192k');
    assert.equal(r['encoder'], 'aac');
    assert.equal(r['fallback'], null);
    assert.deepEqual(calls[0], base[0]);
    const a = base[1] ?? [];
    const b = calls[1] ?? [];
    assert.equal(b.length, a.length);
    assert.deepEqual(
      b.flatMap((t, i) => (t === a[i] ? [] : [i])),
      [a.indexOf('-b:a') + 1, a.length - 1],
    );
    assert.equal(b[b.indexOf('-b:a') + 1], '192k');
    assert.equal(b[b.indexOf('-filter_complex') + 1], a[a.indexOf('-filter_complex') + 1]);
    assert.equal(b[b.indexOf('-c') + 1], 'copy');
    const receipt: unknown = JSON.parse(
      readFileSync(join(s.opts.outDir, 'fake.mp4.receipt.json'), 'utf8'),
    );
    assert.ok(isRec(receipt));
    assert.equal(receipt['audioBitrate'], '192k');
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('192k передаётся запасному aac_at без изменения прежней логики retry', () => {
  const s = sandbox();
  try {
    const calls: string[][] = [];
    const r = runVoiceOnly(
      s.config(),
      { ...s.opts, audioBitrate: '192k' },
      'pin',
      fake(calls, 'linear', undefined, { aac: -0.8, aac_at: -2.1 }),
    );
    assert.equal(calls.length, 3);
    assert.equal(r['audioBitrate'], '192k');
    assert.equal(r['encoder'], 'aac_at');
    assert.equal(r['status'], 'BUILT');
    const a = calls[1] ?? [];
    const b = calls[2] ?? [];
    assert.equal(a[a.indexOf('-b:a') + 1], '192k');
    assert.equal(b[b.indexOf('-b:a') + 1], '192k');
    assert.deepEqual(
      b.flatMap((t, i) => (t === a[i] ? [] : [i])),
      [a.indexOf('-c:a') + 1],
    );
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

// ---------- кодер AAC (--audio-encoder aac|aac_at) и запасной путь при TP > −1,5 ----------
const spectator = (): { calls: string[][]; enc: string[] } => ({ calls: [], enc: [] });

await test('кодер aac, true peak готового файла в норме: пересборки нет, encoder=aac, fallbackReason=null', () => {
  const s = sandbox();
  try {
    const t = spectator();
    const r = runVoiceOnly(
      s.config(),
      s.opts,
      'pin',
      fake(t.calls, 'dynamic', undefined, { aac: -1.6 }, t.enc),
    );
    assert.equal(r['status'], 'BUILT');
    assert.equal(r['encoder'], 'aac');
    assert.equal(r['requestedEncoder'], 'aac');
    assert.equal(r['fallbackReason'], null);
    assert.equal(r['fallback'], null);
    assert.equal(r['encodedTruePeakDb'] !== null && Number(r['encodedTruePeakDb']) < -1.59, true);
    assert.deepEqual(t.enc, ['aac']);
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('кодер aac дал TP > −1,5: второй проход пересобран с aac_at, причина в квитанции, отклонённый результат рядом', () => {
  const s = sandbox();
  try {
    const t = spectator();
    const r = runVoiceOnly(
      s.config(),
      s.opts,
      'pin',
      fake(t.calls, 'dynamic', undefined, { aac: -0.81, aac_at: -2.1 }, t.enc),
    );
    assert.deepEqual(t.enc, ['aac', 'aac_at']);
    assert.equal(t.calls.length, 3); // pass1, pass2 aac, pass2 aac_at
    assert.equal(r['status'], 'BUILT');
    assert.equal(r['encoder'], 'aac_at');
    assert.equal(r['requestedEncoder'], 'aac');
    assert.match(String(r['fallbackReason']), /-0\.81 dBTP > -1\.5 при кодере aac/);
    assert.equal(
      r['encodedTruePeakDb'] !== null && Math.abs(Number(r['encodedTruePeakDb']) + 2.1) < 1e-3,
      true,
    );
    const a2 = r['argv2'];
    assert.ok(Array.isArray(a2));
    assert.equal(a2[a2.indexOf('-c:a') + 1], 'aac_at');
    assert.deepEqual(a2, t.calls[2]);
    const fb = r['fallback'];
    assert.ok(isRec(fb) && Array.isArray(fb['argv2']));
    assert.equal(fb['argv2'][fb['argv2'].indexOf('-c:a') + 1], 'aac');
    assert.equal(
      fb['encodedTruePeakDb'] !== null && Math.abs(Number(fb['encodedTruePeakDb']) + 0.81) < 1e-3,
      true,
    );
    assert.deepEqual(readdirSync(s.opts.outDir).sort(), [
      'fake.aac-rejected.mp4',
      'fake.mp4',
      'fake.mp4.aac-rejected.pass2.stderr.log',
      'fake.mp4.pass1.stderr.log',
      'fake.mp4.pass2.stderr.log',
      'fake.mp4.receipt.json',
    ]);
    assert.equal(readFileSync(join(s.opts.outDir, 'fake.mp4'), 'utf8'), 'mp4-bytes-aac_at');
    assert.equal(
      readFileSync(join(s.opts.outDir, 'fake.aac-rejected.mp4'), 'utf8'),
      'mp4-bytes-aac',
    );
    // кроме кодера и пути результата, argv обоих попыток совпадают токен в токен
    const fbArgv: unknown[] = fb['argv2'];
    assert.deepEqual(
      fbArgv.filter((tok, i) => tok !== a2[i]),
      ['aac'],
    );
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('запрошен aac_at: сразу aac_at, пересборки нет; TP выше порога и с aac_at — BUILT_P6_FAIL с причиной', () => {
  const s = sandbox();
  try {
    const t = spectator();
    const r = runVoiceOnly(
      s.config(),
      { ...s.opts, encoder: 'aac_at' },
      'pin',
      fake(t.calls, 'dynamic', undefined, { aac_at: -1.2 }, t.enc),
    );
    assert.deepEqual(t.enc, ['aac_at']);
    assert.equal(r['encoder'], 'aac_at');
    assert.equal(r['fallbackReason'], null);
    assert.equal(r['status'], 'BUILT_P6_FAIL');
    assert.match(JSON.stringify(r['p6']), /true peak готового файла -1\.2/);
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('aac_at не помог (TP всё ещё > −1,5): BUILT_P6_FAIL, одна пересборка, без повторов', () => {
  const s = sandbox();
  try {
    const t = spectator();
    const r = runVoiceOnly(
      s.config(),
      s.opts,
      'pin',
      fake(t.calls, 'dynamic', undefined, { aac: -0.5, aac_at: -0.9 }, t.enc),
    );
    assert.deepEqual(t.enc, ['aac', 'aac_at']);
    assert.equal(r['status'], 'BUILT_P6_FAIL');
    assert.equal(r['encoder'], 'aac_at');
    assert.ok(typeof r['fallbackReason'] === 'string');
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('потолок перед кодером: один заход с aac, звено в argv и квитанции; запасного пути нет даже при TP > −1,5', () => {
  const s = sandbox();
  try {
    const t = spectator();
    const r = runVoiceOnly(
      s.config(),
      { ...s.opts, preEncoderCeilingDb: -5 },
      'pin',
      fake(t.calls, 'dynamic', undefined, { aac: -3.2 }, t.enc),
    );
    assert.deepEqual(t.enc, ['aac']);
    assert.equal(t.calls.length, 2);
    assert.equal(r['status'], 'BUILT');
    assert.equal(r['encoder'], 'aac');
    assert.equal(r['preEncoderCeilingDb'], -5);
    assert.equal(
      r['preEncoderCeilingFilter'],
      'alimiter=limit=0.5623413252:level=disabled:latency=1',
    );
    assert.match(
      String(t.calls[1]?.join(' ')),
      /aresample=48000,alimiter=limit=0\.5623413252:level=disabled:latency=1\[aout\]/,
    );
    assert.ok(!String(t.calls[0]?.join(' ')).includes('alimiter'), 'в первом проходе звена нет');
    const t2 = spectator();
    const bad = runVoiceOnly(
      s.config(),
      { ...s.opts, outFile: 'fake2.mp4', preEncoderCeilingDb: -5 },
      'pin',
      fake(t2.calls, 'dynamic', undefined, { aac: -0.9, aac_at: -2.1 }, t2.enc),
    );
    assert.deepEqual(t2.enc, ['aac']);
    assert.equal(bad['status'], 'BUILT_P6_FAIL');
    assert.equal(bad['fallback'], null);
    assert.equal(bad['fallbackReason'], null);
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});

await test('без потолка в квитанции preEncoderCeilingDb = null и звена в argv нет', () => {
  const s = sandbox();
  try {
    const calls: string[][] = [];
    const r = runVoiceOnly(s.config(), s.opts, 'pin', fake(calls));
    assert.equal(r['preEncoderCeilingDb'], null);
    assert.equal(r['preEncoderCeilingFilter'], null);
    assert.ok(!String(calls[1]?.join(' ')).includes('alimiter'));
  } finally {
    rmSync(s.dir, { recursive: true });
  }
});
