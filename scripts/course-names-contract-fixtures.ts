import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

/** Shared setup of the course-names contract tests, split across files to stay under the size limit. */
export const root = resolve(import.meta.dirname, '..');
export const execFileAsync = promisify(execFile);
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
