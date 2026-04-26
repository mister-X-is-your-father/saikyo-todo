import 'server-only'

import { and, eq } from 'drizzle-orm'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { profiles, workspaceMembers, workspaces } from '@/lib/db/schema'
import { adminDb, withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { buildAppHref, notifyInviteEmail } from '@/features/email/notify'
import { notificationRepository } from '@/features/notification/repository'
import type { InvitePayload } from '@/features/notification/schema'
import { dispatchSlack } from '@/features/slack/dispatcher'

import {
  callCreateWorkspaceRpc,
  findMyWorkspaces,
  findWorkspaceMembers,
  findWorkspaceStatuses,
} from './repository'
import { type CreateWorkspaceInput, CreateWorkspaceInputSchema } from './schema'
import { seedSampleTemplate } from './seed-templates'

type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'viewer'

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

  async listMembers(workspaceId: string) {
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await findWorkspaceMembers(tx, workspaceId)
    })
  },

  /**
   * 既存ユーザを workspace に追加する (admin 操作)。
   * 同時に被招待者宛の `invite` 通知を best-effort で発行。
   *
   * - 呼び出し元は admin/owner ロールを保持していること (`requireWorkspaceMember(_, 'admin')` で強制)
   * - 既に member の場合は ConflictError
   * - notification insert は失敗しても membership 追加は確定させる
   *
   * 注: 招待 token を介した未登録ユーザ向け招待フローは workspaceInvitations テーブル側で
   *     扱う設計だが、本 method は「既存ユーザを直接追加する admin 操作」専用。
   */
  async addMember(input: {
    workspaceId: string
    userId: string
    role?: WorkspaceMemberRole
  }): Promise<Result<{ workspaceId: string; userId: string; role: WorkspaceMemberRole }>> {
    if (!input.workspaceId || !input.userId) {
      return err(new ValidationError('workspaceId と userId は必須です'))
    }
    const role: WorkspaceMemberRole = input.role ?? 'member'
    const { user: actor } = await requireWorkspaceMember(input.workspaceId, 'admin')

    try {
      await adminDb.transaction(async (tx) => {
        // 既に member か?
        const [existing] = await tx
          .select({ userId: workspaceMembers.userId })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, input.workspaceId),
              eq(workspaceMembers.userId, input.userId),
            ),
          )
          .limit(1)
        if (existing) throw new ConflictError('既にこの workspace のメンバーです')

        await tx.insert(workspaceMembers).values({
          workspaceId: input.workspaceId,
          userId: input.userId,
          role,
        })

        await recordAudit(tx, {
          workspaceId: input.workspaceId,
          actorType: 'user',
          actorId: actor.id,
          targetType: 'workspace_member',
          targetId: input.userId,
          action: 'add_member',
          after: { userId: input.userId, role },
        })
      })
    } catch (e) {
      if (e instanceof ConflictError) return err(e)
      throw e
    }

    // 通知発行は best-effort (membership は既に commit 済)
    let emailContext: { workspaceName: string; invitedBy: string } | null = null
    try {
      await adminDb.transaction(async (tx) => {
        const [ws] = await tx
          .select({ name: workspaces.name })
          .from(workspaces)
          .where(eq(workspaces.id, input.workspaceId))
          .limit(1)
        if (!ws) throw new NotFoundError('Workspace not found')

        const [actorProfile] = await tx
          .select({ displayName: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.id, actor.id))
          .limit(1)

        const invitedBy = actorProfile?.displayName ?? 'unknown'
        const payload: InvitePayload = {
          workspaceId: input.workspaceId,
          workspaceName: ws.name,
          invitedBy,
          role,
        }
        await notificationRepository.insert(tx, {
          userId: input.userId,
          workspaceId: input.workspaceId,
          type: 'invite',
          payload: payload as unknown as Record<string, unknown>,
        })
        emailContext = { workspaceName: ws.name, invitedBy }
      })
    } catch (e) {
      console.error('[workspace] invite notification emit failed', e)
    }

    if (emailContext) {
      const ctx = emailContext as { workspaceName: string; invitedBy: string }
      // Phase 6.15 iter 34: Slack dispatch を email と並列に追加 (POST_MVP "Slack 通知")。
      // best-effort: dispatchSlack は内部で握り潰すので Promise.all で十分。
      await Promise.all([
        notifyInviteEmail({
          userId: input.userId,
          workspaceId: input.workspaceId,
          workspaceName: ctx.workspaceName,
          invitedBy: ctx.invitedBy,
          role,
          href: buildAppHref({ workspaceId: input.workspaceId }),
        }),
        dispatchSlack({
          workspaceId: input.workspaceId,
          type: 'invite',
          text: `*${ctx.invitedBy}* が *${ctx.workspaceName}* に新メンバー (role=${role}) を招待しました`,
          linkUrl: buildAppHref({ workspaceId: input.workspaceId }),
          linkLabel: 'workspace を開く',
        }),
      ])
    }

    return ok({ workspaceId: input.workspaceId, userId: input.userId, role })
  },
}
