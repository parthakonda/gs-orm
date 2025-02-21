module.exports = {
    env: {
      node: true,
      es6: true,
      jest: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
      ecmaVersion: 2018
    },
    rules: {
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
      'semi': ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['warn'],
      'no-trailing-spaces': ['error'],
      'eol-last': ['error', 'always'],
      'no-var': ['error'],
      'prefer-const': ['warn'],
      'comma-dangle': ['error', 'never']
    }
  };