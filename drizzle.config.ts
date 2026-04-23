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
  // 番号 prefix で順序保証 + RLS / extension の手書き SQL も同フォルダに置けるよう
  // breakpoints: false を採用 (Drizzle Kit の `--breakpoints` は migration 内 statement 区切り)
  breakpoints: true,
  verbose: true,
  strict: true,
  schemaFilter: ['public'],
})
