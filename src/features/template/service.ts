import 'server-only'

import { eq } from 'drizzle-orm'

import { type ActorType, recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { items, templateInstantiations } from '@/lib/db/schema'
import { adminDb, type Tx, withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { enqueueJob } from '@/lib/jobs/queue'
import { err, ok, type Result } from '@/lib/result'
import { mutateWithGuard } from '@/lib/service-mutate'

import { buildInstantiationPlan } from './instantiate-plan'
import { templateItemRepository, templateRepository } from './repository'
import {
  AddTemplateItemInputSchema,
  CreateTemplateInputSchema,
  type InstantiateResult,
  InstantiateTemplateInputSchema,
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

  /**
   * Template を実 Item ツリーに展開 (instantiate)。
   * - Mustache 変数展開 (title / description / dod) — HTML escape は OFF
   * - dueOffsetDays → 実 due_date = today + offset
   * - template_items.parent_path (template 世界の ltree) を items 世界に翻訳
   * - 全挿入を 1 Tx で実行 (部分成功させない)
   * - cron_run_id 指定時は UNIQUE 制約で多重防止 (既存なら ConflictError)
   */
  async instantiate(input: unknown): Promise<Result<InstantiateResult>> {
    const parsed = InstantiateTemplateInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    const authUser = await requireUser()
    const ctx = await loadTemplateWorkspace(authUser.id, parsed.data.templateId)
    if (!ctx) return err(new NotFoundError(NOT_FOUND))
    const { user } = await requireWorkspaceMember(ctx.workspaceId, 'member')

    const txResult = await withUserDb(user.id, async (tx) =>
      _instantiateInTx(tx, {
        templateId: parsed.data.templateId,
        workspaceId: ctx.workspaceId,
        variables: parsed.data.variables,
        cronRunId: parsed.data.cronRunId ?? null,
        rootTitleOverride: parsed.data.rootTitleOverride ?? null,
        actor: { type: 'user', id: user.id },
      }),
    )
    if (!txResult.ok) return txResult
    // Tx commit 後: agent_role_to_invoke 付き Item を自動起動キューに投入
    await _enqueueAutoInvocations(ctx.workspaceId, txResult.value.autoInvocations)
    return ok({
      instantiationId: txResult.value.instantiationId,
      rootItemId: txResult.value.rootItemId,
      createdItemCount: txResult.value.createdItemCount,
    })
  },

  /**
   * Agent が `instantiate_template` tool から呼ぶ版。
   * - adminDb を使う (Agent は service_role)
   * - actor は 'agent' + agentId、audit も actor_type='agent'
   * - workspace 整合 (template.workspace_id === 指定 workspaceId) を二重防御で確認
   * - 既存 `instantiate` と内部 Tx ロジックは `_instantiateInTx` を共有
   */
  async instantiateForAgent(params: {
    templateId: string
    workspaceId: string
    agentId: string
    variables?: Record<string, unknown>
    cronRunId?: string | null
    rootTitleOverride?: string | null
  }): Promise<Result<InstantiateResult>> {
    if (!params.templateId || !params.workspaceId || !params.agentId) {
      return err(new ValidationError('templateId / workspaceId / agentId は必須です'))
    }
    const txResult = await adminDb.transaction(async (tx) => {
      // workspace 整合チェック (越境防止)
      const template = await templateRepository.findById(tx, params.templateId)
      if (!template) return err(new NotFoundError(NOT_FOUND))
      if (template.workspaceId !== params.workspaceId) {
        return err(new ValidationError('Template が指定 workspace に属していません'))
      }
      return await _instantiateInTx(tx, {
        templateId: params.templateId,
        workspaceId: params.workspaceId,
        variables: params.variables ?? {},
        cronRunId: params.cronRunId ?? null,
        rootTitleOverride: params.rootTitleOverride ?? null,
        actor: { type: 'agent', id: params.agentId },
      })
    })
    if (!txResult.ok) return txResult
    await _enqueueAutoInvocations(params.workspaceId, txResult.value.autoInvocations)
    return ok({
      instantiationId: txResult.value.instantiationId,
      rootItemId: txResult.value.rootItemId,
      createdItemCount: txResult.value.createdItemCount,
    })
  },
}

/** Template 展開の内部結果。auto 起動用の item リストを外に返すため公開 interface と分ける。 */
interface InternalInstantiateResult extends InstantiateResult {
  autoInvocations: Array<{ itemId: string; role: string }>
}

/**
 * agent_role_to_invoke 付きの Item を pg-boss に投入する。失敗しても
 * instantiate 全体は成立させる (enqueueJob 失敗のみログ)。
 * 現状 role='researcher' のみ対応。拡張時はここで分岐する。
 */
async function _enqueueAutoInvocations(
  workspaceId: string,
  list: Array<{ itemId: string; role: string }>,
): Promise<void> {
  for (const { itemId, role } of list) {
    if (role !== 'researcher') {
      console.warn(`[template] unsupported agent_role_to_invoke=${role} skipped (item=${itemId})`)
      continue
    }
    try {
      await enqueueJob('researcher-decompose', {
        workspaceId,
        itemId,
        reason: 'template-instantiate',
      })
    } catch (e) {
      console.error(
        `[template] enqueue researcher-decompose failed workspace=${workspaceId} item=${itemId}`,
        e,
      )
    }
  }
}

/**
 * 共通 instantiate ロジック (user / agent 両方から呼ばれる)。
 * Tx は呼び出し側が用意する (withUserDb or adminDb.transaction)。
 * actor と instantiatedBy UUID の関係: templateInstantiations.instantiated_by は
 * historically user id だったが、MVP では agent id も許容する (どちらも uuid)。
 */
async function _instantiateInTx(
  tx: Tx,
  p: {
    templateId: string
    workspaceId: string
    variables: Record<string, unknown>
    cronRunId: string | null
    rootTitleOverride: string | null
    actor: { type: ActorType; id: string }
  },
): Promise<Result<InternalInstantiateResult>> {
  // cron_run_id 冪等チェック
  if (p.cronRunId) {
    const existing = await tx
      .select({ id: templateInstantiations.id })
      .from(templateInstantiations)
      .where(eq(templateInstantiations.cronRunId, p.cronRunId))
      .limit(1)
    if (existing.length > 0) {
      return err(new ConflictError('この cron_run_id は既に展開済みです'))
    }
  }

  const template = await templateRepository.findById(tx, p.templateId)
  if (!template) return err(new NotFoundError(NOT_FOUND))
  const tItems = await templateItemRepository.listByTemplate(tx, template.id)

  const plan = buildInstantiationPlan({
    template: { name: template.name },
    templateItems: tItems,
    variables: p.variables,
    today: new Date(),
    rootTitleOverride: p.rootTitleOverride ?? undefined,
  })

  await tx.insert(items).values({
    id: plan.rootItem.id,
    workspaceId: p.workspaceId,
    title: plan.rootItem.title,
    description: plan.rootItem.description,
    status: plan.rootItem.status,
    parentPath: plan.rootItem.parentPath,
    isMust: plan.rootItem.isMust,
    dod: plan.rootItem.dod,
    dueDate: plan.rootItem.dueDate,
    createdByActorType: p.actor.type,
    createdByActorId: p.actor.id,
  })
  for (const c of plan.children) {
    await tx.insert(items).values({
      id: c.id,
      workspaceId: p.workspaceId,
      title: c.title,
      description: c.description,
      status: c.status,
      parentPath: c.parentPath,
      isMust: c.isMust,
      dod: c.dod,
      dueDate: c.dueDate,
      createdByActorType: p.actor.type,
      createdByActorId: p.actor.id,
    })
  }

  const [inst] = await tx
    .insert(templateInstantiations)
    .values({
      templateId: template.id,
      variables: p.variables,
      instantiatedBy: p.actor.id,
      rootItemId: plan.rootItem.id,
      cronRunId: p.cronRunId,
    })
    .returning()
  if (!inst) return err(new ConflictError('instantiation 作成に失敗しました'))

  await recordAudit(tx, {
    workspaceId: p.workspaceId,
    actorType: p.actor.type,
    actorId: p.actor.id,
    targetType: 'template',
    targetId: template.id,
    action: 'instantiate',
    after: {
      instantiationId: inst.id,
      rootItemId: plan.rootItem.id,
      itemCount: 1 + plan.children.length,
      cronRunId: p.cronRunId,
    },
  })

  // agent_role_to_invoke 付きの child を拾う (root には無い前提)
  const autoInvocations: Array<{ itemId: string; role: string }> = []
  for (const c of plan.children) {
    if (c.agentRoleToInvoke) {
      autoInvocations.push({ itemId: c.id, role: c.agentRoleToInvoke })
    }
  }

  return ok({
    instantiationId: inst.id,
    rootItemId: plan.rootItem.id,
    createdItemCount: 1 + plan.children.length,
    autoInvocations,
  })
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
