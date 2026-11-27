import { examplePagePath } from './example-pages.ts';
import {
  EXAMPLE_MARKDOWN,
  GUIDE_SCRIPTS,
  PUBLIC_GUIDE_BINARY_ASSETS,
  PUBLIC_GUIDE_DOCUMENT_ASSETS,
} from './guide-content.ts';
import { pageOutputPaths, pageRedirects } from './pages-route-manifest.ts';

/** Static files the build copies next to the pages; the guide assets are added by the lists in `SITE_FILE_LIST`. */
const runtimeAssets = [
  'atmosphere-contours.svg',
  'atmosphere.css',
  'course-motion.css',
  'course-motion.js',
  'examples/credit-calculator.js',
  'favicon.ico',
  'favicon.svg',
  'corporate-resources.css',
  'harness-levels.css',
  'stage-maturity.css',
  'harness-levels-bpmn.png',
  'guides/guide.css',
  'guides/metarepository.css',
  'guides/course-home.css',
  'guides/learning-enhancements.css',
  'help-reference.css',
  'landing.css',
  'landing.js',
  'site-nav.css',
] as const;

/** Every file of the built site except the stubs of the retired pages: the build test compares the output with it. */
export const SITE_FILE_LIST = [
  ...pageOutputPaths,
  ...pageRedirects.map(({ outputPath }) => outputPath),
  ...runtimeAssets,
  ...GUIDE_SCRIPTS.map((name) => `guides/${name}.js`),
  ...PUBLIC_GUIDE_BINARY_ASSETS.map((asset) => `guides/${asset}`),
  ...PUBLIC_GUIDE_DOCUMENT_ASSETS.map((asset) => `guides/${asset}`),
  ...EXAMPLE_MARKDOWN.map((asset) => `guides/${examplePagePath(asset)}`),
] as const;
