module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.eslint.json'],
    },
    plugins: [
        '@typescript-eslint'
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking'
    ],
    rules: {
        "comma-dangle": "off",
        "no-console": "error",
        "no-trailing-spaces": "error",
        "quotes": "off",
        "@typescript-eslint/comma-dangle": "error",
        "@typescript-eslint/member-delimiter-style": "error",
        "@typescript-eslint/naming-convention": "error",
        "@typescript-eslint/no-extra-non-null-assertion": "error",
        "@typescript-eslint/no-confusing-non-null-assertion": "error",
        "@typescript-eslint/prefer-nullish-coalescing": "error",
        "@typescript-eslint/quotes": ["error", "double", {"allowTemplateLiterals": true}]
    }
};