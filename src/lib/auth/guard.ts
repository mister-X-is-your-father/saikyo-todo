/**
 * Auth ガード: Server Action / RSC の入口で 1 回呼んで、未ログイン or 権限不足を弾く。
 * `cache()` でリクエスト内シングルトン化 (getUser() は network call なので)。
 */
import { cache } from 'react'

import 'server-only'

import { and, eq } from 'drizzle-orm'

import { workspaceMembers } from '@/lib/db/schema'

import { adminDb } from '../db/scoped-client'
import { AuthError, PermissionError } from '../errors'
import { createSupabaseServerClient } from '../supabase/server'

export interface AuthedUser {
  id: string
  email: string | null
}

/**
 * ログイン中ユーザを取得。未ログインなら `AuthError` を throw。
 * リクエストごとに 1 回だけ Supabase に問い合わせる (React.cache 経由)。
 */
export const requireUser = cache(async (): Promise<AuthedUser> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new AuthError()
  return { id: data.user.id, email: data.user.email ?? null }
})

/**
 * Workspace メンバーであることを確認。member ロール以上を要求。
 * memberership がなければ `PermissionError` を throw。
 *
 * 戻り値: ユーザ + workspace 内ロール
 */
export const requireWorkspaceMember = cache(
  async (workspaceId: string, minRole: WorkspaceRole = 'member') => {
    const user = await requireUser()
    // RLS なしで membership 確認 (RLS を通すと無限ループ的に効くため admin 経由)
    const rows = await adminDb
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)),
      )
      .limit(1)
    const member = rows[0]
    if (!member) throw new PermissionError('Workspace のメンバーではありません')
    if (!hasAtLeast(member.role, minRole)) throw new PermissionError('権限が不足しています')
    return { user, role: member.role }
  },
)

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
}

export function hasAtLeast(actual: WorkspaceRole, required: WorkspaceRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required]
}
