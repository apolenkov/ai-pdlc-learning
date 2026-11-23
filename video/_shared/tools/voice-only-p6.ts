// Приёмка P6 сборщика «только голос» (см. voice-only.ts): окно, замер готового файла (argv и разбор вывода), вердикт.
// Чистые функции без запуска процессов.
import { must } from './voice-only-plan.ts';

export const P6_WINDOW = { integratedMin: -16.5, integratedMax: -15.5, truePeakMax: -1.5 };

/**
 * Приёмка P6. `output_i` и `output_tp` из loudnorm сняты до ограничителя и кодера, поэтому по ним одним готовый файл
 * не принять: громкость I (`encodedIntegratedLufs`) и true peak (`encodedTruePeakDb`) берутся повторным замером ebur128
 * готового файла после кодера. Приёмка идёт по готовому файлу и дополнительно по output_i/output_tp loudnorm; замеры
 * обязательны, без них вердикт не выносится.
 */
export function p6(
  o: Record<string, string>,
  encodedTruePeakDb: number,
  encodedIntegratedLufs: number,
): { pass: boolean; reasons: string[] } {
  const { integratedMin: lo, integratedMax: hi, truePeakMax: tpMax } = P6_WINDOW;
  const reasons: string[] = [];
  const outside = (v: number): boolean => !(v >= lo && v <= hi);
  if (!(encodedTruePeakDb <= tpMax))
    reasons.push(`true peak готового файла ${encodedTruePeakDb} > ${tpMax}`);
  if (outside(encodedIntegratedLufs))
    reasons.push(`громкость I готового файла ${encodedIntegratedLufs} вне [${lo}, ${hi}]`);
  const i = Number(o['output_i']);
  const tp = Number(o['output_tp']);
  if (outside(i)) reasons.push(`output_i ${i} вне [${lo}, ${hi}]`);
  if (!(tp <= tpMax)) reasons.push(`output_tp ${tp} > ${tpMax}`);
  return { pass: reasons.length === 0, reasons };
}

/** true peak и громкость I готового файла (ebur128 peak=true, метаданные на stdout): тот же замер, что у независимого qc. */
export function buildTruePeakArgv(file: string): string[] {
  return [
    '-n',
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    '-threads',
    '1',
    '-protocol_whitelist',
    'file',
    '-i',
    file,
    '-map',
    '0:a:0',
    '-af',
    'ebur128=peak=true:metadata=1:framelog=quiet,ametadata=mode=print:file=-',
    '-f',
    'null',
    '-',
  ];
}
/** Последнее значение lavfi.r128.I — громкость всего готового файла в LUFS (то же, что снимает независимый qc). */
export function parseIntegratedLufs(stdout: string, what: string): number {
  let last: number | null = null;
  for (const m of stdout.matchAll(/^lavfi\.r128\.I=(-?[0-9.]+)$/gm)) last = Number(m[1]);
  must(last !== null && Number.isFinite(last), `${what}: нет lavfi.r128.I в выводе ebur128`);
  return last ?? Number.NaN;
}
/** Последнее значение lavfi.r128.true_peak (линейное) → dBTP; полная тишина — −200. */
export function parseTruePeakDb(stdout: string, what: string): number {
  let last: number | null = null;
  for (const m of stdout.matchAll(/^lavfi\.r128\.true_peak=(-?[0-9.]+(?:e-?[0-9]+)?|-?inf)$/gm))
    last = (m[1] ?? '').endsWith('inf') ? 0 : Number(m[1]);
  must(last !== null && !Number.isNaN(last), `${what}: нет lavfi.r128.true_peak в выводе ebur128`);
  return last !== null && last > 0 ? Math.round(20000 * Math.log10(last)) / 1000 : -200;
}
