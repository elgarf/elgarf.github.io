const js = require("@eslint/js");
const importPlugin = require("eslint-plugin-import");
const sonarjs = require("eslint-plugin-sonarjs");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "tools/vendor/**",
      "tools/editor/main.js"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        URL: "readonly",
        Blob: "readonly",
        FileReader: "readonly",
        DOMParser: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        ResizeObserver: "readonly",
        MutationObserver: "readonly",
        Worker: "readonly",
        performance: "readonly",
        Image: "readonly",
        bootstrap: "readonly",
        EasyMDE: "readonly",
        QRCode: "readonly"
      }
    },
    plugins: {
      import: importPlugin,
      sonarjs
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-undef": "off",
      "import/no-unresolved": "off",
      "sonarjs/no-duplicate-string": "off"
    }
  }
];
