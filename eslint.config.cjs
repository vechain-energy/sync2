const js = require('@eslint/js')
const globals = require('globals')
const tseslint = require('typescript-eslint')
const vue = require('eslint-plugin-vue')
const vueParser = require('vue-eslint-parser')

module.exports = tseslint.config(
    {
        linterOptions: {
            reportUnusedDisableDirectives: 'off'
        }
    },
    {
        ignores: [
            'dist/**',
            '.quasar/**',
            'node_modules/**',
            'src-cordova/**',
            '*.d.ts'
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...vue.configs['flat/essential'],
    {
        files: ['**/*.{js,cjs,ts,vue}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ga: 'readonly',
                cordova: 'readonly',
                __statics: 'readonly',
                Capacitor: 'readonly',
                chrome: 'readonly'
            }
        },
        rules: {
            'arrow-parens': 'off',
            'generator-star-spacing': 'off',
            'indent': 'off',
            'no-empty': 'off',
            'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
            'no-undef': 'off',
            'no-inner-declarations': 'off',
            'no-void': 'off',
            'no-useless-constructor': 'off',
            'one-var': 'off',
            'prefer-promise-reject-errors': 'off',
            'quotes': 'off',
            'space-before-function-paren': ['error', {
                anonymous: 'always',
                named: 'never',
                asyncArrow: 'always'
            }],
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/member-delimiter-style': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-empty-interface': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            'vue/multi-word-component-names': 'off',
            'vue/no-deprecated-delete-set': 'off',
            'vue/no-deprecated-dollar-listeners-api': 'off',
            'vue/no-deprecated-dollar-scopedslots-api': 'off',
            'vue/no-deprecated-events-api': 'off',
            'vue/no-deprecated-model-definition': 'off',
            'vue/no-mutating-props': 'off',
            'vue/no-reserved-component-names': 'off',
            'vue/no-v-for-template-key-on-child': 'off',
            'vue/require-valid-default-prop': 'off'
        }
    },
    {
        files: ['**/*.{ts,vue}'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                project: './tsconfig.eslint.json',
                tsconfigRootDir: __dirname,
                extraFileExtensions: ['.vue'],
                ecmaVersion: 2022,
                sourceType: 'module'
            }
        }
    },
    {
        files: ['test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
)
