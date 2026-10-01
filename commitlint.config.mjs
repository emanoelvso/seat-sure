export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // `refac` is the project's prefix for refactors, so it's added to the conventional types
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refac',
        'chore',
        'docs',
        'test',
        'build',
        'ci',
        'perf',
        'style',
        'revert',
      ],
    ],
  },
};
