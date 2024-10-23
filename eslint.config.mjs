// @ts-check

// @ts-expect-error: Import necessary for compatibility with eslint config
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strict,
    ...tseslint.configs.stylistic,
    ...tseslint.configs.recommended,
);
