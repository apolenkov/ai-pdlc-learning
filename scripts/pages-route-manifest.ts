/** Every page of the course site, as output paths relative to the site root. */
export const pageOutputPaths = [
  'index.html',
  'corporate-resources.html',
  'analytics-process-sdd.html',
  'harness-levels.html',
  'roles.html',
  'glossary.html',
  'analysis-maturity-map.html',
  'intent-maturity-map.html',
  'examples/credit-calculator.html',
  'guides/index.html',
  'guides/intent.html',
  'guides/i1-effect.html',
  'guides/i2-bounds.html',
  'guides/i3-plan.html',
  'guides/i4-accept.html',
  'guides/p4-metarepository.html',
  'guides/p1-zachem.html',
  'guides/p2-git.html',
  'guides/p3-sdd.html',
  'guides/s1-git.html',
  'guides/s2-review.html',
  'guides/s3-openspec.html',
  'guides/s4-product.html',
  'guides/s4b-legacy.html',
  'guides/s4a-new.html',
  'guides/s4-team.html',
  'guides/d1-delivery.html',
] as const;

/**
 * Addresses of sections that left the course. Their stub leads to the home of the build's menu row
 * (retiredHome): the landing in the public build, the CustomDev PDLC map one level above the course.
 */
export const retiredPageRedirects = [
  { outputPath: 'environment-scales.html' },
  { outputPath: 'environment-contours.html' },
] as const;

/** Where a retired address leads and what its link says, per menu row (COURSE_NAV). */
export const retiredHome = {
  public: { target: './', label: 'открыть карту PDLC' },
  customdev: { target: '../', label: 'открыть карту PDLC' },
} as const satisfies Record<'public' | 'customdev', { target: string; label: string }>;

/** Previous addresses of the course pages and of the retired AI stages: each one is a stub that forwards to the current page and keeps the #step anchor. */
export const pageRedirects = [
  { outputPath: 'guides/metarepository.html', target: 'p4-metarepository.html' },
  { outputPath: 'guides/stage-1-ai.html', target: 's1-git.html' },
  { outputPath: 'guides/stage-2-ai.html', target: 's2-review.html' },
  { outputPath: 'guides/stage-3-ai.html', target: 's3-openspec.html' },
  { outputPath: 'guides/block-0.html', target: 'p1-zachem.html' },
  { outputPath: 'guides/block-0a.html', target: 'p2-git.html' },
  { outputPath: 'guides/sdd-openspec.html', target: 'p3-sdd.html' },
  { outputPath: 'guides/stage-1.html', target: 's1-git.html' },
  { outputPath: 'guides/stage-2.html', target: 's2-review.html' },
  { outputPath: 'guides/stage-3.html', target: 's3-openspec.html' },
  { outputPath: 'guides/stage-4-team.html', target: 's4-team.html' },
  { outputPath: 'guides/stage-4.html', target: 's4-product.html' },
  { outputPath: 'guides/stage-4-new.html', target: 's4a-new.html' },
  { outputPath: 'guides/stage-4-legacy.html', target: 's4b-legacy.html' },
  { outputPath: 'guides/practicum-delivery.html', target: 'd1-delivery.html' },
  /* Example pages that only pointed to the one intent of the route (Fable review item 9). */
  ...['', 'stage-1/', 'stage-2/', 'stage-3/'].map((stage) => ({
    outputPath: `guides/examples/credit-calculator-intents/${stage ? `${stage}intent-copy` : 'intent-1-error-result'}.html`,
    target: `${stage ? '../' : ''}intents/clear-calculation-result.html`,
  })),
] as const;
