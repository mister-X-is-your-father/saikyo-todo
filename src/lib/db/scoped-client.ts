/**
 * user-scoped Drizzle: トランザクション内で `request.jwt.claims` を SET LOCAL し、
 * RLS が `auth.uid()` 等で正しく動くようにする。
 *
 * 通常の Repository は **必ず** これを使う。service_role の `db` はマイグレーション
 * と admin スクリプト専用。
 *
 * 使い方:
 *   const result = await withUserDb(userId, async (tx) => {
 *     return await tx.select().from(items).where(eq(items.workspaceId, workspaceId))
 *   })
 */
import 'server-only'

import { sql } from 'drizzle-orm'

import { db } from './client'

/** Drizzle トランザクションの型 (postgres-js driver 由来を inference で取得)。 */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * authenticated ロール + JWT claim sub をセットして、与えられた fn をトランザクション内で実行。
 *
 * @param userId   Supabase auth.users.id (`requireUser()` の結果から渡す)
 * @param fn       Drizzle トランザクションを受け取って結果を返す関数
 */
export async function withUserDb<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    const claims = JSON.stringify({ sub: userId, role: 'authenticated' })
    // is_local=true で current transaction だけに効く
    await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`)
    await tx.execute(sql`set local role authenticated`)
    return await fn(tx)
  })
}

/**
 * service_role を維持したまま操作する場合 (audit 削除・migration ヘルパ等)。
 * 通常使用禁止。**Service 層から直接呼んではならない**。
 */
export const adminDb = db
