import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierConfig from 'eslint-config-prettier/flat'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. React / Next built-in
            ['^react', '^next'],
            // 2. Side-effect imports
            ['^\\u0000'],
            // 3. External libraries
            ['^@?\\w'],
            // 4. @/lib/*
            ['^@/lib(/.*|$)'],
            // 5. @/features/*
            ['^@/features(/.*|$)'],
            // 6. @/components/* and @/plugins/*
            ['^@/(components|plugins|app|env|styles)(/.*|$)'],
            // 7. Relative
            ['^\\.\\.(?!/?$)', '^\\.\\./?$', '^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            // 8. Style imports
            ['^.+\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
  prettierConfig,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'drizzle/**',
    'supabase/**',
    'node_modules/**',
    'coverage/**',
    // Serwist 生成物 (PWA Service Worker)
    'public/sw.js',
    'public/sw.js.map',
    'public/swe-worker-*.js',
  ]),
])

export default eslintConfig
