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
    "@typescript-eslint/no-explicit-any": "off",
    "react-hooks/set-state-in-effect": "off",
    "react/no-unescaped-entities": "off",
    "@next/next/no-img-element": "off",
  },
};
