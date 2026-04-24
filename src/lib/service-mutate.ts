/**
 * Service 層の「自分の workspace 内 row を楽観ロックで更新するパターン」共通化。
 *
 * item / doc / template 等、`{ id, workspaceId }` を持つ entity で同じ手順が必要:
 *   1. requireUser
 *   2. withUserDb (RLS 有効な Tx 開始)
 *   3. findById で before 行を読む (RLS で他 workspace の行は見えない)
 *   4. 無ければ NotFoundError
 *   5. requireWorkspaceMember(before.workspaceId, 'member') で明示ガード
 *   6. fn(tx, before, user) を実行し Result を返す
 *
 * 呼び出し側は findById と 404 メッセージだけ渡す。
 */
import 'server-only'

import { type AuthedUser, requireUser, requireWorkspaceMember } from './auth/guard'
import { type Tx, withUserDb } from './db/scoped-client'
import { NotFoundError } from './errors'
import { err, type Result } from './result'

export interface WorkspaceScopedRow {
  id: string
  workspaceId: string
}

export async function mutateWithGuard<T extends WorkspaceScopedRow>(params: {
  findById: (tx: Tx, id: string) => Promise<T | null>
  id: string
  notFoundMessage: string
  fn: (tx: Tx, before: T, user: AuthedUser) => Promise<Result<T>>
}): Promise<Result<T>> {
  const user = await requireUser()
  return await withUserDb(user.id, async (tx) => {
    const before = await params.findById(tx, params.id)
    if (!before) return err(new NotFoundError(params.notFoundMessage))
    await requireWorkspaceMember(before.workspaceId, 'member')
    return await params.fn(tx, before, user)
  })
}
