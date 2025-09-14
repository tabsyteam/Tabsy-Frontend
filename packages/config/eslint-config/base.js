module.exports = {
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "eslint-config-prettier"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import", "prettier"],
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: "module"
  },
  env: {
    browser: true,
    node: true,
    es6: true
  },
  settings: {
    "import/resolver": {
      typescript: {}
    }
  },
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/prefer-const": "error",
    
    // Import rules
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external", 
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true
        }
      }
    ],
    "import/no-unresolved": "error",
    "import/no-cycle": "error",
    
    // General rules
    "no-console": "warn",
    "no-debugger": "error",
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-arrow-callback": "error",
    
    // Prettier integration
    "prettier/prettier": "error"
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "coverage/",
    "*.min.js"
  ]
};
