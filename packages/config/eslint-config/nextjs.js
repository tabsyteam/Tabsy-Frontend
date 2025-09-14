module.exports = {
  extends: [
    "./react.js",
    "next/core-web-vitals",
    "plugin:tailwindcss/recommended"
  ],
  plugins: ["tailwindcss"],
  rules: {
    // Next.js specific rules
    "@next/next/no-html-link-for-pages": "error",
    "@next/next/no-img-element": "error",
    "@next/next/no-duplicate-head": "error",
    
    // Tailwind CSS rules
    "tailwindcss/classnames-order": "warn",
    "tailwindcss/no-custom-classname": "off",
    "tailwindcss/no-contradicting-classname": "error",
    
    // Performance rules for Next.js
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["../"],
            message: "Relative imports are not allowed. Use absolute imports instead."
          }
        ]
      }
    ]
  },
  settings: {
    tailwindcss: {
      config: "./tailwind.config.js",
      format: "auto"
    }
  }
};
