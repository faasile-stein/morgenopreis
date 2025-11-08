module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting
        'refactor', // Code refactoring
        'test',     // Tests
        'chore',    // Maintenance
        'ci',       // CI/CD changes
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'api',
        'web',
        'mobile',
        'drupal',
        'shared',
        'database',
        'infra',
        'ci',
      ],
    ],
  },
};
