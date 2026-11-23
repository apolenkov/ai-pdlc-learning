import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Source parts of `guides/learning-enhancements.css`, in publishing order.
 * The site build concatenates them into the single stylesheet the pages link,
 * so the published CSS keeps one request per page.
 */
export const LEARNING_ENHANCEMENT_PARTS = [
  '01-step-shell-and-platforms.css',
  '02-screenshots-mockups-and-details.css',
  '03-outcomes-route-and-practice.css',
  '04-calculator.css',
  '05-route-navigation-and-gitlab-panels.css',
  '06-course-figures.css',
  '07-model-cue-and-learning-path.css',
  '08-course-map-and-rhythm.css',
  '09-route-hub-layout.css',
  '09-step-layout.css',
] as const;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = resolve(ROOT, 'docs/pages/sdlc-development');

/** Join each stylesheet's parts in cascade order, byte for byte. */
const readCssParts = async (directory: string, parts: readonly string[]): Promise<string> =>
  (await Promise.all(parts.map((part) => readFile(resolve(PAGES, directory, part), 'utf8')))).join(
    '',
  );

export const readLearningEnhancementsCss = (): Promise<string> =>
  readCssParts('guides/learning-enhancements', LEARNING_ENHANCEMENT_PARTS);

export const readLandingCss = (): Promise<string> =>
  readCssParts('landing', ['catalog.css', 'route.css', 'panels.css', 'responsive.css']);
