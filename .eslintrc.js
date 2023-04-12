/* eslint-env node*/
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.eslint.json"]
  },
  plugins: [
    "@typescript-eslint"
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
    // "@typescript-eslint"
  ],
  rules: {
    "array-bracket-spacing": ["error", "never"],
    "comma-dangle": "off",
    "comma-spacing": ["error", { "before": false, "after": true }],
    "curly": "error",
    "eol-last": "error",
    "eqeqeq": [
      "error",
      "smart"
    ],
    "indent": ["error", 2, { "SwitchCase": 1 }],
    "key-spacing": ["error", { "beforeColon": false }],
    "keyword-spacing": "error",
    "no-console": "error", "no-multi-spaces": "error",
    "no-trailing-spaces": "error",
    "object-curly-spacing": ["error", "always"],
    "prefer-const": "error",
    "quotes": "off",
    "radix": "error",
    "semi": "off",
    "semi-spacing": "error",
    "space-in-parens": ["error", "never"],
    "spaced-comment": [
      "error",
      "always",
      {
        "markers": [
          "/"
        ]
      }
    ],
    "@typescript-eslint/comma-dangle": "error",
    "@typescript-eslint/member-delimiter-style": "error",
    "@typescript-eslint/naming-convention": "error",
    "@typescript-eslint/no-extra-non-null-assertion": "error",
    "@typescript-eslint/no-confusing-non-null-assertion": "error",
    // "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "@typescript-eslint/semi": ["error", "never", {
      "beforeStatementContinuationChars": "never"
    }]
  }
}
