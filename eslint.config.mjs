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
  // ----------------------------------------------------------------------
  // 仕組み的バグ予防: Service / Action 層から adminDb (= service_role) を禁止。
  // 通常は withUserDb (RLS 経由) を使う。CLAUDE.md "Repository は scoped Drizzle"。
  // adminDb が必要な特殊 feature (agent_invocations 系 worker / heartbeat / email
  // outbox / sprint pre-mortem 等の "横串で集計する admin 操作") は ignores で除外。
  // ----------------------------------------------------------------------
  {
    files: ['src/features/**/*.ts'],
    ignores: [
      // Agent 系: agent_invocations / agents は service_role 専用テーブル
      'src/features/agent/**',
      // Sprint pre-mortem / retro: ws 横断集計 (admin が PM Agent 起動)
      'src/features/sprint/premortem-service.ts',
      'src/features/sprint/retro-service.ts',
      'src/features/sprint/premortem-worker.ts',
      'src/features/sprint/retro-worker.ts',
      // 通知 generator (heartbeat 系) は service_role でしか書けない
      'src/features/notification/**',
      'src/features/heartbeat/**',
      // Email mock outbox dispatcher (best-effort send-fail-soft)
      'src/features/email/**',
      // Doc embedding worker: workspace_id 横断 + service_role の embed model が必要
      'src/features/doc/embedding.ts',
      // Comment mention 通知の best-effort 別 Tx (service.ts 内 dispatchEmail 経路)
      'src/features/comment/service.ts',
      // Template instantiateForAgent: Agent 経由の admin 操作
      'src/features/template/service.ts',
      // Time-entry sync worker: 外部 system 連携の admin 操作
      'src/features/time-entry/worker.ts',
      // Mock timesheet: dev / playwright 用 (本番では走らない)
      'src/features/mock-timesheet/**',
      // Workspace admin 操作 (member 追加 / seed / 通知発行)
      'src/features/workspace/service.ts',
      'src/features/workspace/seed-templates.ts',
      // Workflow engine: cron / item-event / webhook 経由で起動するため
      // user context を持たない場合がある (worker パターン)。RLS は engine 内で
      // workspace member チェックを別途行うことで担保する。
      'src/features/workflow/engine.ts',
      'src/features/workflow/actions.ts',
      // テストとフィクスチャは無視
      '**/*.test.ts',
      '**/__tests__/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/db/scoped-client',
              importNames: ['adminDb'],
              message:
                'Service / Action 層から adminDb は禁止。withUserDb を使い RLS を効かせること。' +
                '例外的に admin が必要な feature は eslint.config.mjs の allow list に追加。',
            },
          ],
        },
      ],
    },
  },
  // Client Component から service / repository / DB client を直接呼ぶことを禁止。
  // CLAUDE.md "Component から service / repository を直接呼ぶ (Server Action 経由必須)"。
  // Server Component (app/**/page.tsx, layout.tsx) は service を直接呼んで SSR fetch して
  // よい (RSC 想定)。client コンポーネントは src/components/ 配下が中心 (ほぼ 'use client')。
  {
    files: ['src/components/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/service', '@/features/*/repository'],
              message:
                'Client Component から service / repository を直接呼ぶのは禁止。' +
                'Server Action (actions.ts) または hooks (hooks.ts) 経由で呼ぶこと。' +
                'Server Component で SSR fetch するなら src/app/**/page.tsx に置く。',
              // 型のみの import (`import type { Foo } from '...'`) は OK — runtime ではない
              allowTypeImports: true,
            },
            {
              group: ['@/lib/db/scoped-client', '@/lib/db/client'],
              message: 'Client Component から DB client は禁止。Server Action 経由で。',
              allowTypeImports: true,
            },
          ],
        },
      ],
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
