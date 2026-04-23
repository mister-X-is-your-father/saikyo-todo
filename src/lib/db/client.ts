import 'dotenv/config'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

/**
 * service_role 権限で動く Drizzle クライアント。
 * 用途は **マイグレーション・admin script・worker** のみ。
 * アプリ通常リクエストは `lib/db/scoped-client.ts` (user-scoped) を使うこと。
 */
const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const queryClient = postgres(connectionString, {
  prepare: false, // pg-bouncer 互換
  max: 10,
})

export const db = drizzle({ client: queryClient, casing: 'snake_case' })
export const sql = queryClient
