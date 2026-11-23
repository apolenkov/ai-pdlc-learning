/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Import cycles make modules impossible to load and test in isolation.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'browser-code-not-to-node-scripts',
      severity: 'error',
      comment:
        'Code under docs/pages ships to the browser and may import build-time scripts only for types.',
      from: { path: '^docs/pages' },
      to: { path: '^(scripts|standards)/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'not-to-test-from-production',
      severity: 'error',
      comment: 'Production modules must not depend on test files.',
      from: { pathNot: '\\.test\\.[cm]?[jt]s$|-test-support\\.ts$' },
      to: { path: '\\.test\\.[cm]?[jt]s$' },
    },
    {
      name: 'not-to-private-or-generated',
      severity: 'error',
      comment:
        'Public sources must not reach into build output or corporate material (docs/BOUNDARIES.md).',
      from: {},
      to: { path: '^(dist|coverage|\\.worktrees)/|(^|/)customdev/' },
    },
    {
      name: 'browser-code-not-to-node-core',
      severity: 'error',
      comment: 'Browser code cannot use Node built-ins.',
      from: { path: '^docs/pages' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.pages.json' },
  },
};
