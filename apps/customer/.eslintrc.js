module.exports = {
  root: true,
  extends: ['@repo/eslint-config/nextjs.js'],
  settings: {
    next: {
      rootDir: __dirname,
    },
  },
  rules: {
    // Customer app specific rules
    '@next/next/no-html-link-for-pages': ['error', './src/app'],
  },
};
