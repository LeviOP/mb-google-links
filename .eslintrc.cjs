module.exports = {
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    root: true,
    rules: {
        "indent": ["error", 4],
        "arrow-spacing": ["error", { before: true, after: true }],
        "arrow-parens": ["error", "always"],
        "quotes": ["error", "double", { avoidEscape: false }],
        "semi": ["error", "always"],
        "object-curly-spacing": ["error", "always"],
        "comma-dangle": "error",
        "no-trailing-spaces": "error"
    }
};
