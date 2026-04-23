import 'server-only'

import { and, eq, isNull, sql } from 'drizzle-orm'

import { workspaceMembers, workspaces } from '@/lib/db/schema'
import { type Tx } from '@/lib/db/scoped-client'

/**
 * RPC `create_workspace` を呼んで workspace + 設定 + デフォルト status を一括作成。
 * SECURITY DEFINER で auth.uid() を見るため、tx に JWT claims が SET されている必要あり。
 */
export async function callCreateWorkspaceRpc(
  tx: Tx,
  input: { name: string; slug: string },
): Promise<string> {
  const result = (await tx.execute(
    sql`select public.create_workspace(${input.name}, ${input.slug}) as id`,
  )) as unknown as Array<{ id: string }>
  const row = result[0]
  if (!row?.id) throw new Error('create_workspace RPC が ID を返しませんでした')
  return row.id
}

/** 自分が所属している (deleted_at IS NULL の) workspace 一覧。 */
export async function findMyWorkspaces(tx: Tx, userId: string) {
  return await tx
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
      ownerId: workspaces.ownerId,
      createdAt: workspaces.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
    .orderBy(workspaces.createdAt)
}
