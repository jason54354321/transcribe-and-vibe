import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default defineConfigWithVueTs(
  {
    ignores: [
      'tests/**',
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'playwright.config.ts',
      'test-results/**',
      'tests/benchmark/results/**',
      'vite.config.ts',
      'backend/.venv/**',
      'public/worker.js',
      '**/*.d.ts',
    ],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
    },
  },
  {
    files: ['src/worker.ts'],
    languageOptions: {
      globals: {
        ...globals.worker,
      },
    },
  },
  eslintConfigPrettier,
)
