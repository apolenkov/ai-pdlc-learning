import { RuleConfigSeverity, type UserConfig } from '@commitlint/types';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [RuleConfigSeverity.Disabled],
    'scope-enum': [
      RuleConfigSeverity.Error,
      'always',
      [
        'course',
        'guides',
        'examples',
        'standards',
        'skills',
        'site',
        'scripts',
        'docs',
        'licensing',
        'repo',
        'ci',
        'deps',
      ],
    ],
  },
};

export default config;
