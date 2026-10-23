import tseslint from "typescript-eslint";

// Syntax/correctness checks for the existing TS/TSX codebase. Type checking is
// separate (`npm run typecheck`); this does not claim an accessibility audit.
export default [
  { ignores: ["node_modules/**", ".next/**", "audit/**", "public/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "constructor-super": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-this-before-super": "error",
      "valid-typeof": "error",
    },
  },
];
