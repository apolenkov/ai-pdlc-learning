#!/usr/bin/env node
// Гейт звука перед выдачей ролика (TASK-588): earshot critique + отчёт sfx-mix. Не прошёл — ролик не отдаём.
//   node --experimental-strip-types video/_shared/tools/sfx-gate.ts <ролик.mp4> (рядом лежит <ролик>.mp4.sfx.json)
// Единый стандарт громкости роликов сайта и курса (Fable 18.10): −16 ± 1 LUFS, true peak ≤ −1,5 dBTP — в обоих профилях.
// Ролик без музыки (прежний профиль): −16 ± 1 LUFS, true peak ≤ −1,5 dBTP, тишина в конце ≤ 1,5 с,
//   SFX ≥ 9 дБ под пиком голоса, hover ≥ 0,15 с от начала фразы. Критичное «музыка 0 %» не учитывается.
// Ролик с музыкой (решение 008, ключ --music): −16 ± 1 LUFS, true peak ≤ −1,5 dBTP, музыка слышна
//   ≥ 62 % окон, SFX ≥ 9 дБ под голосом, тишина в конце ≤ 1,5 с и дак музыки под голосом 4–6 дБ.
//   Дак принимается только по квитанции (--duck <json>, см. sfx-receipt.ts): непустая, конечные числа,
//   замеров + пропусков = слов alignment, sha256 MP4 и стемов совпадают с файлами. Уровень SFX берётся из
//   стемов (реальная шина эффектов с sfx-gain, а не константы PEAK_DB). Без квитанции PASS ничего не значит.
//   --last-words <film dir> проверяет исходную озвучку и конечный AAC; --last-word-only <film dir> проверяет исходную озвучку без MP4.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { verifyReceipt, wavPeakDb, type DuckReceipt } from './sfx-receipt.ts';
import { checkLastWords, checkLastWordsMp4 } from './sfx-last-word.ts';

const lastOnlyAt = process.argv.indexOf('--last-word-only');
const lastMp4At = process.argv.indexOf('--last-word-mp4');
if (lastOnlyAt >= 0 || lastMp4At >= 0) {
  const at = lastOnlyAt >= 0 ? lastOnlyAt : lastMp4At;
  const film = process.argv[at + 1];
  const finalMp4 = lastMp4At >= 0 ? process.argv[at + 2] : undefined;
  if (!film || (lastMp4At >= 0 && !finalMp4))
    throw new Error(
      'usage: sfx-gate.ts --last-word-only <film dir> | --last-word-mp4 <film dir> <final.mp4>',
    );
  const results = finalMp4 ? checkLastWordsMp4(film, finalMp4) : checkLastWords(film);
  for (const r of results)
    console.log(
      `${r.status}\t${basename(resolve(film, '..'))}\t${r.scene}\t${r.word}\t${r.t0.toFixed(3)}\t${r.t1.toFixed(3)}\t${r.peakDbfs ?? ''}\t${r.reason ?? ''}`,
    );
  process.exit(
    !results.length || results.some((r) => r.status === 'UNKNOWN')
      ? 2
      : results.some((r) => r.status === 'FAIL')
        ? 1
        : 0,
  );
}

const withMusic = process.argv.includes('--music');
const duckAt = process.argv.indexOf('--duck');
const duckFile = duckAt < 0 ? '' : (process.argv[duckAt + 1] ?? '');
const lastAt = process.argv.indexOf('--last-words');
const lastFilm = lastAt < 0 ? '' : (process.argv[lastAt + 1] ?? '');
const mp4 = resolve(process.argv.slice(2).find((a) => a.endsWith('.mp4')) ?? '');
if (!mp4) throw new Error('usage: sfx-gate.ts <film.mp4> [--music] [--duck duck.json]');
const earshot = process.env.EARSHOT_BIN ?? join(homedir(), 'work/earshot/.venv/bin/earshot');
const jsonOut = join(tmpdir(), `sfx-gate-${process.pid}.json`);
execFileSync(earshot, ['--threads', '4', 'critique', mp4, '--out', jsonOut], {
  stdio: ['ignore', 'ignore', 'ignore'],
});
const metrics = new Map(
  (JSON.parse(readFileSync(jsonOut, 'utf8')).metrics as { metric: string; value: number }[]).map(
    (m) => [m.metric, m.value],
  ),
);
const report = (): {
  voicePeakDb: number;
  gainDb: number;
  sfxPeakDb: Record<string, number>;
  events: { kind: string; t: number; phraseStart?: number }[];
} => JSON.parse(readFileSync(`${mp4}.sfx.json`, 'utf8'));
const checks: [string, boolean, string][] = [];
const push = (name: string, ok: boolean, v: string) => checks.push([name, ok, v]);

if (withMusic) {
  const i = metrics.get('lufs_i')!;
  const tp = metrics.get('true_peak')!;
  const music = metrics.get('music_frac') ?? 0;
  let problems = ['нет квитанции (--duck)'];
  let receipt: DuckReceipt | undefined;
  if (duckFile) {
    try {
      ({ problems, r: receipt } = verifyReceipt(
        JSON.parse(readFileSync(resolve(duckFile), 'utf8')),
        mp4,
      ));
    } catch (e) {
      problems = [`квитанция не читается: ${(e as Error).message}`];
    }
  }
  const ok = problems.length === 0 && !!receipt;
  push('громкость −16 ± 1 LUFS', Math.abs(i + 16) <= 1, `${i} LUFS`);
  push('true peak ≤ −1,5 dBTP', tp <= -1.5, `${tp} dBTP`);
  push('музыка слышна ≥ 62 % окон', music >= 0.62, `${Math.round(music * 100)} %`);
  // уровень эффектов — по стемам: шина эффектов уже с реальным sfx-gain и суммой наложенных событий,
  // голос в том же масштабе (мастер-гейн один на всё), поэтому отчётные константы PEAK_DB не нужны
  let sfxMargin = NaN;
  if (ok) sfxMargin = wavPeakDb(receipt!.stems.voice.path) - wavPeakDb(receipt!.stems.sfx.path);
  push(
    'SFX ≥ 9 дБ под голосом (по стемам)',
    sfxMargin >= 9,
    ok ? `${sfxMargin.toFixed(1)} дБ` : 'стемы не подтверждены квитанцией',
  );
  push(
    'тишина в конце ≤ 1,5 с',
    (metrics.get('end_silence_s') ?? 0) <= 1.5,
    `${metrics.get('end_silence_s')} с`,
  );
  push(
    'квитанция дака связана с MP4 и стемами, покрывает все слова',
    ok,
    ok
      ? `${receipt!.words} замеров + ${receipt!.skipped.length} пропусков = ${receipt!.alignmentWords} слов alignment`
      : problems.join('; '),
  );
  push(
    'дак музыки под голосом 4–6 дБ (все слова)',
    ok && receipt!.min >= 4 && receipt!.max <= 6,
    ok
      ? `${receipt!.min.toFixed(2)}…${receipt!.max.toFixed(2)} дБ по ${receipt!.words} словам`
      : 'нет проверенной квитанции',
  );
} else {
  const rep = report();
  const loudestSfx = Math.max(...Object.values(rep.sfxPeakDb)) + rep.gainDb;
  const hovers = rep.events.filter((e) => e.kind === 'hover');
  const hoverGap = hovers.length ? Math.min(...hovers.map((e) => e.t - e.phraseStart!)) : null;
  push(
    'громкость −16 ± 1 LUFS',
    Math.abs(metrics.get('lufs_i')! + 16) <= 1,
    `${metrics.get('lufs_i')} LUFS`,
  );
  push(
    'true peak ≤ −1,5 dBTP',
    metrics.get('true_peak')! <= -1.5,
    `${metrics.get('true_peak')} dBTP`,
  );
  push(
    'тишина в конце ≤ 1,5 с',
    metrics.get('end_silence_s')! <= 1.5,
    `${metrics.get('end_silence_s')} с`,
  );
  push(
    'SFX ≥ 9 дБ под голосом',
    rep.voicePeakDb + rep.gainDb - loudestSfx >= 9,
    `${(rep.voicePeakDb + rep.gainDb - loudestSfx).toFixed(1)} дБ`,
  );
  push(
    'hover ≥ 0,15 с от начала фразы',
    hoverGap === null || hoverGap >= 0.15,
    hoverGap === null ? 'нет hover-событий' : `${hoverGap.toFixed(2)} с`,
  );
}
if (lastFilm) {
  const source = checkLastWords(lastFilm);
  const sourceFailed = source.filter((r) => r.status !== 'PASS');
  push(
    'последнее слово каждой сцены в исходном аудио (> −60 dBFS)',
    source.length > 0 && !sourceFailed.length,
    `${source.length - sourceFailed.length}/${source.length}${sourceFailed.length ? `; ${sourceFailed.map((r) => `${r.scene}:${r.word || r.reason}=${r.peakDbfs ?? '?'}`).join(', ')}` : ''}`,
  );
  const last = checkLastWordsMp4(lastFilm, mp4);
  const failed = last.filter((r) => r.status !== 'PASS');
  push(
    'последнее слово каждой сцены в конечном AAC (> −40 dBFS)',
    last.length > 0 && !failed.length,
    `${last.length - failed.length}/${last.length}${failed.length ? `; ${failed.map((r) => `${r.scene}:${r.word || r.reason}=${r.peakDbfs ?? '?'}`).join(', ')}` : ''}`,
  );
}
for (const [name, ok, v] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${v}`);
process.exit(checks.every((c) => c[1]) ? 0 : 1);
