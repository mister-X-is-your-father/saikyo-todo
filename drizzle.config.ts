import 'dotenv/config'

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema/*.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Supabase ローカルのデフォルト DB URL (pnpm exec supabase status で確認可)
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
  // Supabase CLI 互換のタイムスタンプ prefix を使うことで、
  // 手書き SQL (例: 0001_extensions.sql) は Drizzle 生成より常に前に実行される。
  migrations: {
    prefix: 'supabase',
  },
  breakpoints: true,
  verbose: true,
  strict: true,
  schemaFilter: ['public'],
})
