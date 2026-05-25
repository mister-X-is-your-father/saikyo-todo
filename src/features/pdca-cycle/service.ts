/**
 * queue: PDCA P-1 substrate — pdca_cycles のビジネスロジック (権限 / 楽観ロック / audit)。
 *
 * phase 進行ルール (advancePhase):
 *   plan → do | check (skip do)  -- D を skip して直接 C は禁止 (= must do)
 *   do → check
 *   check → act
 *   act → closed
 *   逆方向は禁止 (= ConflictError)
 *
 * UI / Server Action は次 iter (PDCA P-2 以降) で追加。本 commit は service skeleton のみ。
 */
import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { isAllowedPdcaPhaseTransition } from './phase-helpers'
import { pdcaCycleRepository } from './repository'
import {
  AdvancePdcaCyclePhaseInputSchema,
  CreatePdcaCycleInputSchema,
  LinkItemToCycleInputSchema,
  ListPdcaCyclesInputSchema,
  type PdcaCycle,
  type PdcaCycleItem,
  type PdcaCycleStatus,
  UnlinkItemFromCycleInputSchema,
  UpdatePdcaCycleInputSchema,
} from './schema'

function phaseTimestampsFor(
  current: PdcaCycle,
  to: PdcaCycleStatus,
  now: Date,
): Partial<
  Pick<
    PdcaCycle,
    'planFinishedAt' | 'doStartedAt' | 'doFinishedAt' | 'checkStartedAt' | 'checkFinishedAt'
  >
> {
  const t: ReturnType<typeof phaseTimestampsFor> = {}
  if (current.status === 'plan' && (to === 'do' || to === 'check')) t.planFinishedAt = now
  if (to === 'do') t.doStartedAt = now
  if (current.status === 'do' && to === 'check') t.doFinishedAt = now
  if (to === 'check') t.checkStartedAt = now
  if (current.status === 'check' && to === 'act') t.checkFinishedAt = now
  return t
}

export const pdcaCycleService = {
  async list(input: unknown): Promise<Result<PdcaCycle[]>> {
    const parsed = ListPdcaCyclesInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    await requireWorkspaceMember(data.workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const rows = await pdcaCycleRepository.list(tx, data)
      return ok(rows)
    })
  },

  async get(id: string): Promise<Result<{ cycle: PdcaCycle; items: PdcaCycleItem[] }>> {
    if (!id) return err(new ValidationError('id 必須'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const cycle = await pdcaCycleRepository.findById(tx, id)
      if (!cycle) return err(new NotFoundError('PDCA cycle が見つかりません'))
      await requireWorkspaceMember(cycle.workspaceId, 'viewer')
      const items = await pdcaCycleRepository.listItems(tx, id)
      return ok({ cycle, items })
    })
  },

  async create(input: unknown): Promise<Result<PdcaCycle>> {
    const parsed = CreatePdcaCycleInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    await requireWorkspaceMember(data.workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const row = await pdcaCycleRepository.insert(tx, {
        workspaceId: data.workspaceId,
        ownerId: user.id,
        title: data.title,
        hypothesis: data.hypothesis,
        targetMetric: data.targetMetric,
        targetValue: data.targetValue,
      })
      await recordAudit(tx, {
        workspaceId: data.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'pdca_cycle',
        targetId: row.id,
        action: 'create',
        after: row,
      })
      return ok(row)
    })
  },

  async update(input: unknown): Promise<Result<PdcaCycle>> {
    const parsed = UpdatePdcaCycleInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await pdcaCycleRepository.findById(tx, data.id)
      if (!before) return err(new NotFoundError('PDCA cycle が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')
      if (before.status === 'closed') {
        return err(new ValidationError('closed cycle は編集できません'))
      }

      const updated = await pdcaCycleRepository.updateWithLock(
        tx,
        data.id,
        data.expectedVersion,
        data.patch,
      )
      if (!updated) return err(new ConflictError())
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'pdca_cycle',
        targetId: updated.id,
        action: 'update',
        before,
        after: updated,
      })
      return ok(updated)
    })
  },

  async advancePhase(input: unknown): Promise<Result<PdcaCycle>> {
    const parsed = AdvancePdcaCyclePhaseInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await pdcaCycleRepository.findById(tx, data.id)
      if (!before) return err(new NotFoundError('PDCA cycle が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')

      if (!isAllowedPdcaPhaseTransition(before.status, data.to)) {
        return err(new ValidationError(`${before.status} → ${data.to} は許可されていません`))
      }

      const updated = await pdcaCycleRepository.advancePhase(
        tx,
        data.id,
        data.expectedVersion,
        data.to,
        phaseTimestampsFor(before, data.to, new Date()),
      )
      if (!updated) return err(new ConflictError())
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'pdca_cycle',
        targetId: updated.id,
        action: 'advance_phase',
        before: { status: before.status },
        after: { status: updated.status },
      })
      return ok(updated)
    })
  },

  async linkItem(input: unknown): Promise<Result<PdcaCycleItem>> {
    const parsed = LinkItemToCycleInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const cycle = await pdcaCycleRepository.findById(tx, data.cycleId)
      if (!cycle) return err(new NotFoundError('PDCA cycle が見つかりません'))
      await requireWorkspaceMember(cycle.workspaceId, 'member')
      if (cycle.status === 'closed') {
        return err(new ValidationError('closed cycle に item を追加できません'))
      }

      const row = await pdcaCycleRepository.linkItem(tx, {
        cycleId: data.cycleId,
        itemId: data.itemId,
        role: data.role,
        addedByUserId: user.id,
        sortKey: data.sortKey,
      })
      await recordAudit(tx, {
        workspaceId: cycle.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'pdca_cycle_item',
        targetId: row.itemId,
        action: 'link',
        after: { cycleId: row.cycleId, itemId: row.itemId, role: row.role },
      })
      return ok(row)
    })
  },

  async unlinkItem(input: unknown): Promise<Result<{ cycleId: string; itemId: string }>> {
    const parsed = UnlinkItemFromCycleInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const cycle = await pdcaCycleRepository.findById(tx, data.cycleId)
      if (!cycle) return err(new NotFoundError('PDCA cycle が見つかりません'))
      await requireWorkspaceMember(cycle.workspaceId, 'member')

      const removed = await pdcaCycleRepository.unlinkItem(tx, data.cycleId, data.itemId)
      if (!removed) return err(new NotFoundError('link が見つかりません'))
      await recordAudit(tx, {
        workspaceId: cycle.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'pdca_cycle_item',
        targetId: data.itemId,
        action: 'unlink',
        before: { cycleId: data.cycleId, itemId: data.itemId },
      })
      return ok({ cycleId: data.cycleId, itemId: data.itemId })
    })
  },
}
