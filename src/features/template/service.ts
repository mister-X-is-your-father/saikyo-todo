import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'
import { mutateWithGuard } from '@/lib/service-mutate'

import { templateItemRepository, templateRepository } from './repository'
import {
  AddTemplateItemInputSchema,
  CreateTemplateInputSchema,
  RemoveTemplateItemInputSchema,
  SoftDeleteTemplateInputSchema,
  type Template,
  type TemplateItem,
  UpdateTemplateInputSchema,
  UpdateTemplateItemInputSchema,
} from './schema'

const NOT_FOUND = 'Template が見つかりません'
const NOT_FOUND_ITEM = 'TemplateItem が見つかりません'

export const templateService = {
  async create(input: unknown): Promise<Result<Template>> {
    const parsed = CreateTemplateInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, ...rest } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const t = await templateRepository.insert(tx, {
        workspaceId,
        name: rest.name,
        description: rest.description,
        kind: rest.kind,
        scheduleCron: rest.scheduleCron ?? null,
        variablesSchema: rest.variablesSchema,
        tags: rest.tags,
        createdBy: user.id,
      })
      await recordAudit(tx, {
        workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'template',
        targetId: t.id,
        action: 'create',
        after: t,
      })
      return ok(t)
    })
  },

  async update(input: unknown): Promise<Result<Template>> {
    const parsed = UpdateTemplateInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await mutateWithGuard<Template>({
      findById: (tx, id) => templateRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const merged = { ...before, ...parsed.data.patch }
        if (
          merged.kind === 'recurring' &&
          (!merged.scheduleCron || merged.scheduleCron.trim() === '')
        ) {
          return err(new ValidationError('recurring の Template には cron 式が必要です'))
        }
        const updated = await templateRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          parsed.data.patch as Partial<Parameters<typeof templateRepository.insert>[1]>,
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'template',
          targetId: updated.id,
          action: 'update',
          before,
          after: updated,
        })
        return ok(updated)
      },
    })
  },

  async softDelete(input: unknown): Promise<Result<Template>> {
    const parsed = SoftDeleteTemplateInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await mutateWithGuard<Template>({
      findById: (tx, id) => templateRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const updated = await templateRepository.softDelete(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'template',
          targetId: updated.id,
          action: 'delete',
          before,
        })
        return ok(updated)
      },
    })
  },

  async list(workspaceId: string, filter: { kind?: 'manual' | 'recurring' } = {}) {
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await templateRepository.list(tx, { workspaceId, ...filter })
    })
  },
}

/**
 * templateItem CRUD は templateId 指定で、service 内部で template→workspaceId を引いて
 * workspace gate を通す (RLS で無関係 WS は findById が null 化するため二重防御)。
 */
async function loadTemplateWorkspace(
  userId: string,
  templateId: string,
): Promise<{ workspaceId: string } | null> {
  return await withUserDb(userId, async (tx) => {
    const t = await templateRepository.findById(tx, templateId)
    return t ? { workspaceId: t.workspaceId } : null
  })
}

async function loadTemplateItemContext(
  userId: string,
  templateItemId: string,
): Promise<{ ti: TemplateItem; workspaceId: string } | null> {
  return await withUserDb(userId, async (tx) => {
    const ti = await templateItemRepository.findById(tx, templateItemId)
    if (!ti) return null
    const t = await templateRepository.findById(tx, ti.templateId)
    if (!t) return null
    return { ti, workspaceId: t.workspaceId }
  })
}

export const templateItemService = {
  async add(input: unknown): Promise<Result<TemplateItem>> {
    const parsed = AddTemplateItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { templateId, ...rest } = parsed.data

    const authUser = await requireUser()
    const ctx = await loadTemplateWorkspace(authUser.id, templateId)
    if (!ctx) return err(new NotFoundError(NOT_FOUND))
    const { user } = await requireWorkspaceMember(ctx.workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const ti = await templateItemRepository.insert(tx, {
        templateId,
        title: rest.title,
        description: rest.description,
        parentPath: rest.parentPath,
        statusInitial: rest.statusInitial,
        dueOffsetDays: rest.dueOffsetDays ?? null,
        isMust: rest.isMust,
        dod: rest.dod ?? null,
        defaultAssignees: rest.defaultAssignees,
        agentRoleToInvoke: rest.agentRoleToInvoke ?? null,
      })
      await recordAudit(tx, {
        workspaceId: ctx.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'template',
        targetId: templateId,
        action: 'add_item',
        after: { templateItemId: ti.id, title: ti.title },
      })
      return ok(ti)
    })
  },

  async update(input: unknown): Promise<Result<TemplateItem>> {
    const parsed = UpdateTemplateItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    const authUser = await requireUser()
    const ctx = await loadTemplateItemContext(authUser.id, parsed.data.id)
    if (!ctx) return err(new NotFoundError(NOT_FOUND_ITEM))
    const { user } = await requireWorkspaceMember(ctx.workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const merged = { ...ctx.ti, ...parsed.data.patch }
      if (merged.isMust && (!merged.dod || merged.dod.trim() === '')) {
        return err(new ValidationError('MUST には DoD が必要です'))
      }
      const updated = await templateItemRepository.update(
        tx,
        parsed.data.id,
        parsed.data.patch as Partial<Parameters<typeof templateItemRepository.insert>[1]>,
      )
      if (!updated) return err(new NotFoundError(NOT_FOUND_ITEM))
      await recordAudit(tx, {
        workspaceId: ctx.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'template',
        targetId: updated.templateId,
        action: 'update_item',
        before: ctx.ti,
        after: updated,
      })
      return ok(updated)
    })
  },

  async remove(input: unknown): Promise<Result<{ id: string }>> {
    const parsed = RemoveTemplateItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    const authUser = await requireUser()
    const ctx = await loadTemplateItemContext(authUser.id, parsed.data.id)
    if (!ctx) return err(new NotFoundError(NOT_FOUND_ITEM))
    const { user } = await requireWorkspaceMember(ctx.workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const removed = await templateItemRepository.remove(tx, parsed.data.id)
      if (!removed) return err(new NotFoundError(NOT_FOUND_ITEM))
      await recordAudit(tx, {
        workspaceId: ctx.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'template',
        targetId: ctx.ti.templateId,
        action: 'remove_item',
        before: ctx.ti,
      })
      return ok({ id: parsed.data.id })
    })
  },

  async listByTemplate(templateId: string) {
    const authUser = await requireUser()
    const ctx = await loadTemplateWorkspace(authUser.id, templateId)
    if (!ctx) throw new NotFoundError(NOT_FOUND)
    const { user } = await requireWorkspaceMember(ctx.workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await templateItemRepository.listByTemplate(tx, templateId)
    })
  },
}
