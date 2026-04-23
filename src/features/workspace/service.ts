import 'server-only'

import { requireUser } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { callCreateWorkspaceRpc, findMyWorkspaces } from './repository'
import { type CreateWorkspaceInput, CreateWorkspaceInputSchema } from './schema'

export const workspaceService = {
  async create(input: CreateWorkspaceInput): Promise<Result<{ id: string }>> {
    const parsed = CreateWorkspaceInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const user = await requireUser()
    try {
      const id = await withUserDb(user.id, async (tx) => {
        return await callCreateWorkspaceRpc(tx, parsed.data)
      })
      return ok({ id })
    } catch (e) {
      // slug uniq 違反など
      if (e instanceof Error && /workspaces_slug_uniq|duplicate key/.test(e.message)) {
        return err(new ConflictError('その slug は既に使われています'))
      }
      throw e
    }
  },

  async listForCurrentUser() {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      return await findMyWorkspaces(tx, user.id)
    })
  },
}
