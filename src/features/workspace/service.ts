import 'server-only'

import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { callCreateWorkspaceRpc, findMyWorkspaces, findWorkspaceStatuses } from './repository'
import { type CreateWorkspaceInput, CreateWorkspaceInputSchema } from './schema'
import { seedSampleTemplate } from './seed-templates'

export const workspaceService = {
  async create(input: CreateWorkspaceInput): Promise<Result<{ id: string }>> {
    const parsed = CreateWorkspaceInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const user = await requireUser()
    let id: string
    try {
      id = await withUserDb(user.id, async (tx) => {
        return await callCreateWorkspaceRpc(tx, parsed.data)
      })
    } catch (e) {
      // slug uniq 違反など
      if (e instanceof Error && /workspaces_slug_uniq|duplicate key/.test(e.message)) {
        return err(new ConflictError('その slug は既に使われています'))
      }
      throw e
    }
    // サンプル Template を自動投入 (失敗しても ws 作成は成立させる)
    await seedSampleTemplate(id, user.id)
    return ok({ id })
  },

  async listForCurrentUser() {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      return await findMyWorkspaces(tx, user.id)
    })
  },

  async listStatuses(workspaceId: string) {
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await findWorkspaceStatuses(tx, workspaceId)
    })
  },
}
