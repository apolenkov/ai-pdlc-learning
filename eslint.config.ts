import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'node_modules/**',
    'dist/**',
    '.cache/**',
    '.worktrees/**',
    '.scratch/**',
    'output/**',
  ]),
  {
    files: [
      'scripts/**/*.{ts,js,mjs,cjs}',
      'video/_shared/tools/voice-only*.ts',
      'standards/sdlc-analysis-standard/checks/**/*.{ts,js,mjs,cjs}',
      'docs/pages/sdlc-development/**/*.ts',
      '*.config.ts',
    ],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { project: './tsconfig.eslint.json', tsconfigRootDir: import.meta.dirname },
    },
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': true,
          'ts-check': false,
        },
      ],
      complexity: ['error', 20],
      'max-lines': ['error', { max: 500, skipBlankLines: false, skipComments: false }],
      'max-lines-per-function': [
        'error',
        {
          max: 100,
          skipBlankLines: false,
          skipComments: false,
          IIFEs: true,
        },
      ],
    },
  },
]);
