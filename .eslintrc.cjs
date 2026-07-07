module.exports = {
  root: true,
  env: { browser: true, node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime'
  ],
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['out', 'dist', 'node_modules', '*.config.js', '*.config.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
    ],
    'react/prop-types': 'off',
    // Cosmetic in JSX text; not worth failing on.
    'react/no-unescaped-entities': 'off',
    // Control chars are stripped intentionally in filename sanitizers.
    'no-control-regex': 'off',
    // The preload bridge uses documented @ts-ignore for global window assigns.
    '@typescript-eslint/ban-ts-comment': 'off'
  }
}
