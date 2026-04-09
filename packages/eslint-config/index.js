module.exports = {
  extends: ["eslint:recommended"],
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  ignorePatterns: ["dist/", "node_modules/", ".next/"],
  rules: {
    // Shared rules
  },
};
