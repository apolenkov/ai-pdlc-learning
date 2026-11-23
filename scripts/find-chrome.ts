/**
 * @file Locate a system Chrome/Chromium binary for puppeteer-core.
 *
 * Used by the site and map QA scripts. Discovery order:
 *   1. env DTP_PDF_CHROME (explicit override)
 *   2. well-known per-platform install paths
 *   3. `which` over common binary names on PATH
 *
 * Never downloads a browser; when nothing is found it throws an actionable error.
 */

import { execFile } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Whether a path exists and is executable. */
const canExecute = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/** Well-known Chrome/Chromium locations per platform. */
const candidatePaths = (platform: NodeJS.Platform): readonly string[] => {
  if (platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ];
  }
  if (platform === 'win32') {
    return [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
  }
  // linux and others
  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
};

/** Binary names to probe via `which` as a last resort. */
const PATH_NAMES = [
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
] as const;

/** Resolve a binary name on PATH using the system `which`, or null. */
const which = async (name: string): Promise<string | null> => {
  try {
    const { stdout } = await execFileAsync('which', [name]);
    const path = stdout.trim();
    return path.length > 0 ? path : null;
  } catch {
    return null;
  }
};

const NOT_FOUND_MESSAGE = [
  'find-chrome: системный Chrome/Chromium не найден.',
  'Проверки сайта используют системный браузер (puppeteer-core), свой Chromium не скачивается.',
  'Варианты:',
  '  • установите Google Chrome или Chromium, либо',
  '  • укажите путь явно: DTP_PDF_CHROME="/path/to/chrome" npm run qa:pages-release',
].join('\n');

/**
 * Find an executable Chrome/Chromium binary.
 * @returns Absolute path to the browser executable.
 * @throws Error with installation guidance when none is found.
 */
export const findChrome = async (
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> => {
  const override = env.DTP_PDF_CHROME?.trim();
  if (override !== undefined && override.length > 0) {
    if (await canExecute(override)) {
      return override;
    }
    throw new Error(
      `find-chrome: DTP_PDF_CHROME указывает на «${override}», но это не исполняемый файл.`,
    );
  }

  for (const candidate of candidatePaths(platform)) {
    if (await canExecute(candidate)) {
      return candidate;
    }
  }

  for (const name of PATH_NAMES) {
    const resolved = await which(name);
    if (resolved !== null && (await canExecute(resolved))) {
      return resolved;
    }
  }

  throw new Error(NOT_FOUND_MESSAGE);
};
