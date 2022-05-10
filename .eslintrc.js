module.exports = {
  root: true,
  plugins: ["@typescript-eslint"],
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  rules: {
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
  },
  parser: "@typescript-eslint/parser",
};
