import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

import '../docs/pages/sdlc-development/guides/guide-stages.ts';
// Importing guide-stages.ts runs the data loader once.
export const guideContent = globalThis.guideContent;

/** Screenshot paths (relative to guides/) per guide, in step order. */
export const guideScreenshotsById: Record<string, string[]> = Object.fromEntries(
  Object.entries(guideContent.stages).map(([id, guide]) => [
    id,
    guide.steps.flatMap((step) =>
      (step.screenshots ?? []).flatMap(({ src, previews }) => [
        src,
        ...(previews ?? []).map((preview) => preview.src),
      ]),
    ),
  ]),
);

// Step screenshots come from the guide data; only images used outside the steps are listed by hand.
export const GUIDE_IMAGES_OUTSIDE_STEPS = [
  'assets/kilo-installed-extension.png',
  'assets/opencode-web-provider-form.png',
];
export const PUBLIC_GUIDE_BINARY_ASSETS: readonly string[] = [
  'examples/legacy-calculator/tz-2021.docx',
  'examples/legacy-calculator/confluence-page.html',
  'examples/legacy-calculator/observed-2026.md',
  'examples/intent-markdown/export-button.svg',
  'examples/intent-markdown/intent.mermaid-1.svg',
  ...GUIDE_IMAGES_OUTSIDE_STEPS,
  ...new Set(Object.values(guideScreenshotsById).flat()),
];

/**
 * Course documents copied unchanged into the published site.
 * `metarepository.md` is the exception: the build assembles it from its parts in
 * `scripts/build-learning-pages.ts` before writing the download.
 */
export const PUBLIC_GUIDE_DOCUMENT_ASSETS = [
  'metarepository.md',
  'examples/intent-plan/intent-template.md',
  'examples/intent-plan/strong-intent.md',
  'examples/intent-plan/weak-complete-intent.md',
  'examples/intent-plan/weak-intent.md',
  'examples/credit-calculator-intents/README.md',
  'examples/credit-calculator-intents/intent-template.md',
  'examples/credit-calculator-intents/intent-2-credit-limit.md',
  'examples/credit-calculator-intents/request-and-answers.md',
  'examples/credit-calculator-intents/intents/clear-calculation-result.md',
  'examples/intent-markdown/intent.md',
] as const;

/** Every example file written in Markdown: each one also gets a readable HTML page (scripts/example-pages.ts). */
export const EXAMPLE_MARKDOWN: readonly string[] = [
  ...PUBLIC_GUIDE_BINARY_ASSETS,
  ...PUBLIC_GUIDE_DOCUMENT_ASSETS,
].filter((asset) => asset.startsWith('examples/') && asset.endsWith('.md'));

/** Guide scripts in load order: the data first, then the renderer (files guides/<name>.ts and .js). */
export const GUIDE_SCRIPTS = ['guide-stages', 'guide-data'] as const;

/** Source text of every guide script, as the browser sees it. */
export const readGuideSource = async (): Promise<string> =>
  (await Promise.all(GUIDE_SCRIPTS.map(readGuideScriptSource))).join('\n');

/** Bundle each entry once as a classic script, including its static JSON and TS imports. */
export const readGuideScriptSource = async (
  name: (typeof GUIDE_SCRIPTS)[number],
): Promise<string> => {
  const result = await build({
    absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
    entryPoints: [
      fileURLToPath(new URL(`../docs/pages/sdlc-development/guides/${name}.ts`, import.meta.url)),
    ],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    charset: 'utf8',
    write: false,
    legalComments: 'none',
  });
  return result.outputFiles[0]!.text;
};
