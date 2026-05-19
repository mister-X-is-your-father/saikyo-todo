import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { positionBetween, positionsBetween } from '@/lib/db/fractional-position'
import { moveSubtree } from '@/lib/db/ltree'
import { fullPathOf } from '@/lib/db/ltree-path'
import { items, workspaceMembers } from '@/lib/db/schema'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'
import { mutateWithGuard } from '@/lib/service-mutate'

import { dispatchItemEvent } from '@/features/workflow/dispatcher'

import { groupAssigneesByItemId } from './group-assignees'
import { violatesMustDodInvariant } from './must-dod'
import { type AssigneeRef, itemRepository } from './repository'
import {
  CreateItemInputSchema,
  type Item,
  MoveItemInputSchema,
  ReorderItemInputSchema,
  SoftDeleteItemInputSchema,
  UpdateItemInputSchema,
  UpdateStatusInputSchema,
} from './schema'

const NOT_FOUND = 'Item が見つかりません'

export const itemService = {
  async create(input: unknown): Promise<Result<Item>> {
    const parsed = CreateItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, ...rest } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'member')

    const r = await withUserDb(user.id, async (tx) => {
      // parentItemId が指定されたら parent_path = fullPathOf(parent) で配下に作成
      let parentPath: string | undefined
      if (rest.parentItemId) {
        const parent = await itemRepository.findById(tx, rest.parentItemId)
        if (!parent) return err(new NotFoundError('親 Item が見つかりません'))
        if (parent.workspaceId !== workspaceId) {
          return err(new ValidationError('別 workspace の Item を親に指定できません'))
        }
        parentPath = fullPathOf({ id: parent.id, parentPath: parent.parentPath })
      }
      // position は sibling の最大値の後ろ (末尾追加) を計算する。
      // 旧仕様は DB default 'a0' を使っていたため bulk 追加時に全 child が同じ
      // position になり、numbered 表示や DnD 並び替えで挿入順依存になっていた。
      // (FEEDBACK_QUEUE.md: subtask-graph e2e で発覚)
      const maxPos = await itemRepository.findMaxPositionAmongSiblings(
        tx,
        workspaceId,
        parentPath ?? null,
      )
      const newPosition = positionBetween(maxPos, null)
      const item = await itemRepository.insert(tx, {
        workspaceId,
        title: rest.title,
        description: rest.description,
        status: rest.status,
        startDate: rest.startDate ?? null,
        dueDate: rest.dueDate ?? null,
        dueTime: rest.dueTime ?? null,
        scheduledFor: rest.scheduledFor ?? null,
        priority: rest.priority,
        isMust: rest.isMust,
        dod: rest.dod ?? null,
        position: newPosition,
        ...(parentPath !== undefined ? { parentPath } : {}),
        createdByActorType: 'user',
        createdByActorId: user.id,
      })
      await recordAudit(tx, {
        workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item',
        targetId: item.id,
        action: 'create',
        after: item,
      })
      return ok(item)
    })
    // Phase 6.15 iter153: item-event trigger 'create' を fire-and-forget で dispatch。
    // tx 抜けた後 (= item commit 済) に発火させる。失敗しても item 作成は成功扱い。
    if (r.ok) {
      void dispatchItemEvent(workspaceId, 'create', r.value).catch((e: unknown) => {
        console.warn('[item.create] dispatchItemEvent failed', e)
      })
    }
    return r
  },

  async update(input: unknown): Promise<Result<Item>> {
    const parsed = UpdateItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    const r = await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const updated = await itemRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          parsed.data.patch as Partial<Parameters<typeof itemRepository.insert>[1]>,
        )
        if (!updated) return err(new ConflictError())
        if (violatesMustDodInvariant(updated)) {
          return err(new ValidationError('MUST には DoD が必要です'))
        }
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'update',
          before,
          after: updated,
        })
        return ok(updated)
      },
    })
    if (r.ok) {
      void dispatchItemEvent(r.value.workspaceId, 'update', r.value).catch((e: unknown) => {
        console.warn('[item.update] dispatchItemEvent failed', e)
      })
    }
    return r
  },

  async updateStatus(input: unknown): Promise<Result<Item>> {
    const parsed = UpdateStatusInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    const r = await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        // DoD 最終化: MUST を done type の status に遷移する時は DoD 必須。
        // 通常は create/update の invariant で満たされるが、admin 直接更新や
        // schema 変更に対する二重防御 (belt-and-suspenders)。
        const newType = await itemRepository.findStatusType(
          tx,
          before.workspaceId,
          parsed.data.status,
        )
        if (newType === 'done' && violatesMustDodInvariant(before)) {
          return err(new ValidationError('MUST を done にするには DoD が必要です'))
        }

        const patch: Partial<Parameters<typeof itemRepository.insert>[1]> = {
          status: parsed.data.status,
        }
        if (parsed.data.position) patch.position = parsed.data.position
        const updated = await itemRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          patch,
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'status_change',
          before: { status: before.status, position: before.position },
          after: { status: updated.status, position: updated.position },
        })
        return ok(updated)
      },
    })
    if (r.ok) {
      void dispatchItemEvent(r.value.workspaceId, 'status_change', r.value).catch((e: unknown) => {
        console.warn('[item.updateStatus] dispatchItemEvent failed', e)
      })
    }
    return r
  },

  /**
   * ワンクリック完了 / 未完了トグル。workspace の type='done' status に遷移。
   * MUST+DoD invariant は updateStatus 側で保証。
   */
  async toggleComplete(input: {
    id: string
    expectedVersion: number
    complete: boolean
  }): Promise<Result<Item>> {
    const r = await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: input.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const targetKey = input.complete
          ? await itemRepository.findDoneStatusKey(tx, before.workspaceId)
          : await itemRepository.findTodoStatusKey(tx, before.workspaceId)
        if (!targetKey) return err(new ValidationError('遷移先 status が見つかりません'))
        if (input.complete && violatesMustDodInvariant(before)) {
          return err(new ValidationError('MUST を done にするには DoD が必要です'))
        }
        const updated = await itemRepository.updateWithLock(tx, input.id, input.expectedVersion, {
          status: targetKey,
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: input.complete ? 'complete' : 'uncomplete',
          before: { status: before.status },
          after: { status: updated.status },
        })
        return ok(updated)
      },
    })
    // complete のみ event 発火 (uncomplete は item-event 仕様に無い)
    if (r.ok && input.complete) {
      void dispatchItemEvent(r.value.workspaceId, 'complete', r.value).catch((e: unknown) => {
        console.warn('[item.toggleComplete] dispatchItemEvent failed', e)
      })
    }
    return r
  },

  async move(input: unknown): Promise<Result<Item>> {
    const parsed = MoveItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        // 別 workspace への移動を拒否 (Alice が複数 ws に居る場合、RLS だけでは防げない)
        if (parsed.data.newParentItemId !== null) {
          const newParent = await itemRepository.findById(tx, parsed.data.newParentItemId)
          if (!newParent) return err(new NotFoundError('新 parent Item が見つかりません'))
          if (newParent.workspaceId !== before.workspaceId) {
            return err(new ValidationError('別 workspace の item には移動できません'))
          }
        }
        // moveSubtree が throw した場合は Tx が rollback される (NotFoundError / ValidationError)
        await moveSubtree(tx, before.id, parsed.data.newParentItemId)
        const updated = await itemRepository.findById(tx, before.id)
        if (!updated) return err(new NotFoundError('移動後の Item が見つかりません'))
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'move',
          before: { parentPath: before.parentPath },
          after: { parentPath: updated.parentPath },
        })
        return ok(updated)
      },
    })
  },

  async reorder(input: unknown): Promise<Result<Item>> {
    const parsed = ReorderItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    if (parsed.data.prevSiblingId === null && parsed.data.nextSiblingId === null) {
      return err(new ValidationError('prev / next のどちらかは必要です'))
    }

    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const [prev, next] = await Promise.all([
          parsed.data.prevSiblingId
            ? itemRepository.findById(tx, parsed.data.prevSiblingId)
            : Promise.resolve(null),
          parsed.data.nextSiblingId
            ? itemRepository.findById(tx, parsed.data.nextSiblingId)
            : Promise.resolve(null),
        ])
        if (parsed.data.prevSiblingId && !prev)
          return err(new NotFoundError('prev sibling が見つかりません'))
        if (parsed.data.nextSiblingId && !next)
          return err(new NotFoundError('next sibling が見つかりません'))
        for (const sib of [prev, next]) {
          if (!sib) continue
          if (sib.workspaceId !== before.workspaceId) {
            return err(new ValidationError('別 workspace の sibling は指定できません'))
          }
          if (sib.parentPath !== before.parentPath) {
            return err(new ValidationError('同じ親の下の sibling のみ指定できます'))
          }
          if (sib.id === before.id) {
            return err(new ValidationError('自分自身を sibling 指定できません'))
          }
        }

        // Legacy bug で sibling 同士に同 position ('a0' 等) が残っているケースがある。
        // generateKeyBetween は prev>=next で throw するので、collision を検知したら
        // **bucket rebalance** を実行: 同 parent の全 sibling を pull → (position, id)
        // 順 (= 現状の表示順) に sort → 期待 target index に activeItem を挿入 → N 個の
        // 位置を均等に再生成 → 全 sibling を batch UPDATE (audit / version は moved item
        // のみ、他は data healing なので skip)。これでユーザが「ドラッグした位置に
        // 行かない」問題が根治される (collision でも display order を尊重して配置)。
        let newPosition: string
        const prevPos = prev?.position ?? null
        const nextPos = next?.position ?? null
        const collision =
          prevPos !== null && nextPos !== null && prevPos.localeCompare(nextPos) >= 0
        if (collision) {
          // Bucket rebalance path
          const siblings = await tx
            .select()
            .from(items)
            .where(
              and(
                eq(items.workspaceId, before.workspaceId),
                eq(items.parentPath, before.parentPath),
                isNull(items.deletedAt),
              ),
            )
          // 表示順 = (position, id) の **byte-order (ASCII)** stable sort
          // `localeCompare` だと fractional-indexing が生成する 'Zz' (大文字始まり、
          // 'a0' の前) が誤って後ろに sort される。compareSiblings と同じ ASCII 比較を使う。
          siblings.sort((a, b) => {
            if (a.position < b.position) return -1
            if (a.position > b.position) return 1
            if (a.id < b.id) return -1
            if (a.id > b.id) return 1
            return 0
          })
          const fromIdx = siblings.findIndex((s) => s.id === before.id)
          if (fromIdx < 0) {
            return err(new ValidationError('item not found in siblings (rebalance)'))
          }
          // arrayMove: activeItem を取り出して target index に挿入
          const moved = siblings.splice(fromIdx, 1)[0]!
          const prevIdxAfter = prev ? siblings.findIndex((s) => s.id === prev.id) : -1
          const nextIdxAfter = next ? siblings.findIndex((s) => s.id === next.id) : -1
          let toIdx: number
          if (prevIdxAfter >= 0) toIdx = prevIdxAfter + 1
          else if (nextIdxAfter >= 0) toIdx = nextIdxAfter
          else toIdx = siblings.length
          siblings.splice(toIdx, 0, moved)
          // N 個の position を均等生成 ('a0', 'a1', ..., 'an')
          const newPositions = positionsBetween(null, null, siblings.length)
          // moved item 以外の sibling を batch UPDATE (audit / version は省略 = data healing)
          for (let i = 0; i < siblings.length; i++) {
            const s = siblings[i]!
            if (s.id === before.id) continue
            const newPos = newPositions[i]!
            if (newPos === s.position) continue // 同じなら skip
            await tx.update(items).set({ position: newPos }).where(eq(items.id, s.id))
          }
          newPosition = newPositions[toIdx]!
        } else {
          // 通常 path: prev/next の間に新 position を生成
          try {
            newPosition = positionBetween(prevPos, nextPos)
          } catch (e) {
            return err(new ValidationError(`position 計算に失敗: ${(e as Error).message}`))
          }
        }

        const updated = await itemRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          { position: newPosition },
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'reorder',
          before: { position: before.position },
          after: { position: updated.position },
        })
        return ok(updated)
      },
    })
  },

  async softDelete(input: unknown): Promise<Result<Item>> {
    const parsed = SoftDeleteItemInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const updated = await itemRepository.softDelete(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'delete',
          before,
        })
        return ok(updated)
      },
    })
  },

  /**
   * Archive (POST_MVP "アーカイブビュー" の操作)。`archived_at` を NOW にセット。
   * 既に archived な item は ValidationError。soft delete とは別軸 (deleted_at とは独立)。
   */
  async archive(input: { id: string; expectedVersion: number }): Promise<Result<Item>> {
    if (!input.id) return err(new ValidationError('id 必須'))
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: input.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        if (before.archivedAt) return err(new ValidationError('既にアーカイブ済みです'))
        const updated = await itemRepository.updateWithLock(tx, input.id, input.expectedVersion, {
          archivedAt: new Date(),
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'archive',
          before: { archivedAt: before.archivedAt },
          after: { archivedAt: updated.archivedAt },
        })
        return ok(updated)
      },
    })
  },

  /**
   * Phase 6.15 iter 48 — Gantt baseline スナップショット取得。
   * current の startDate / dueDate を baseline_start_date / baseline_end_date に写す。
   * 両方の日付が無い item には設定不可 (ValidationError)。
   * Sprint 開始時 / 計画凍結時に呼び出される想定。
   */
  async setBaseline(input: { id: string; expectedVersion: number }): Promise<Result<Item>> {
    if (!input.id) return err(new ValidationError('id 必須'))
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: input.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        if (!before.startDate || !before.dueDate) {
          return err(new ValidationError('startDate / dueDate 両方が必要です'))
        }
        const takenAt = new Date()
        const updated = await itemRepository.updateWithLock(tx, input.id, input.expectedVersion, {
          baselineStartDate: before.startDate,
          baselineEndDate: before.dueDate,
          baselineTakenAt: takenAt,
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'set_baseline',
          before: {
            baselineStartDate: before.baselineStartDate,
            baselineEndDate: before.baselineEndDate,
          },
          after: {
            baselineStartDate: updated.baselineStartDate,
            baselineEndDate: updated.baselineEndDate,
            baselineTakenAt: takenAt.toISOString(),
          },
        })
        return ok(updated)
      },
    })
  },

  /**
   * Phase 6.15 iter 53 — baseline をクリア (3 列を NULL に戻す)。
   * baseline 未設定の item に呼ぶと ValidationError。
   */
  async clearBaseline(input: { id: string; expectedVersion: number }): Promise<Result<Item>> {
    if (!input.id) return err(new ValidationError('id 必須'))
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: input.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        if (!before.baselineStartDate && !before.baselineEndDate && !before.baselineTakenAt) {
          return err(new ValidationError('baseline 未設定です'))
        }
        const updated = await itemRepository.updateWithLock(tx, input.id, input.expectedVersion, {
          baselineStartDate: null,
          baselineEndDate: null,
          baselineTakenAt: null,
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'clear_baseline',
          before: {
            baselineStartDate: before.baselineStartDate,
            baselineEndDate: before.baselineEndDate,
          },
          after: { baselineStartDate: null, baselineEndDate: null },
        })
        return ok(updated)
      },
    })
  },

  /**
   * iter520 (queue TC-2): TaskChute 打刻 ▶ — items.started_at = now() (まだ null のときのみ)。
   * 既に started_at があれば「既に着手済」 ValidationError (二重打刻防止、UI で分岐済の前提)。
   * doneAt とは独立 (status 遷移とは別軸)。
   */
  async markStarted(input: { id: string; expectedVersion: number }): Promise<Result<Item>> {
    if (!input.id) return err(new ValidationError('id 必須'))
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: input.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        if (before.startedAt) return err(new ValidationError('既に着手済みです'))
        const now = new Date()
        const updated = await itemRepository.updateWithLock(tx, input.id, input.expectedVersion, {
          startedAt: now,
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'mark_started',
          before: { startedAt: before.startedAt },
          after: { startedAt: now.toISOString() },
        })
        return ok(updated)
      },
    })
  },

  /**
   * iter520 (queue TC-2): TaskChute 打刻 ■ — items.completed_at = now()。
   * doneAt とは別軸 (status=done 遷移は別 path)。
   * 既に completed_at があれば「既に完了打刻済」 ValidationError。
   */
  async markCompleted(input: { id: string; expectedVersion: number }): Promise<Result<Item>> {
    if (!input.id) return err(new ValidationError('id 必須'))
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: input.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        if (before.completedAt) return err(new ValidationError('既に完了打刻済みです'))
        const now = new Date()
        const updated = await itemRepository.updateWithLock(tx, input.id, input.expectedVersion, {
          completedAt: now,
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'mark_completed',
          before: { completedAt: before.completedAt },
          after: { completedAt: now.toISOString() },
        })
        return ok(updated)
      },
    })
  },

  /**
   * iter520 (queue TC-2): 打刻のリセット (started_at / completed_at を NULL に戻す)。
   * UI で「打刻取消」用、admin なしで本人 reset 可能。
   */
  async clearChuteMarks(input: { id: string; expectedVersion: number }): Promise<Result<Item>> {
    if (!input.id) return err(new ValidationError('id 必須'))
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: input.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        if (!before.startedAt && !before.completedAt) {
          return err(new ValidationError('打刻されていません'))
        }
        const updated = await itemRepository.updateWithLock(tx, input.id, input.expectedVersion, {
          startedAt: null,
          completedAt: null,
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'clear_chute_marks',
          before: { startedAt: before.startedAt, completedAt: before.completedAt },
          after: { startedAt: null, completedAt: null },
        })
        return ok(updated)
      },
    })
  },

  /**
   * iter (queue WT-1): 連絡待ち state を set。GTD Waiting For を時間軸 + 通知 channel 統合で管理。
   * 詳細: ~/.claude/plans/saikyo-waiting-mode-plan.md
   */
  async setWaitingFor(input: unknown): Promise<Result<Item>> {
    const { SetWaitingForInputSchema } = await import('./schema')
    const parsed = SetWaitingForInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const updated = await itemRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          { waitingFor: parsed.data.state as unknown as Record<string, unknown> },
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'set_waiting_for',
          before: { waitingFor: before.waitingFor },
          after: { waitingFor: updated.waitingFor },
        })
        return ok(updated)
      },
    })
  },

  /** iter (queue WT-1): 連絡待ち state を解除 (= 返答が来た)。 */
  async clearWaitingFor(input: { id: string; expectedVersion: number }): Promise<Result<Item>> {
    if (!input.id) return err(new ValidationError('id 必須'))
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: input.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        if (!before.waitingFor) {
          return err(new ValidationError('連絡待ち状態ではありません'))
        }
        const updated = await itemRepository.updateWithLock(tx, input.id, input.expectedVersion, {
          waitingFor: null,
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'clear_waiting_for',
          before: { waitingFor: before.waitingFor },
          after: { waitingFor: null },
        })
        return ok(updated)
      },
    })
  },

  /** Unarchive (アーカイブ復元)。archived_at を NULL に戻す。 */
  async unarchive(input: { id: string; expectedVersion: number }): Promise<Result<Item>> {
    if (!input.id) return err(new ValidationError('id 必須'))
    return await mutateWithGuard<Item>({
      findById: (tx, id) => itemRepository.findById(tx, id),
      id: input.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        if (!before.archivedAt) return err(new ValidationError('archive されていません'))
        const updated = await itemRepository.updateWithLock(tx, input.id, input.expectedVersion, {
          archivedAt: null,
        })
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'unarchive',
          before: { archivedAt: before.archivedAt },
          after: { archivedAt: null },
        })
        return ok(updated)
      },
    })
  },

  async list(workspaceId: string, filter: { status?: string; isMust?: boolean } = {}) {
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await itemRepository.list(tx, { workspaceId, ...filter })
    })
  },

  /**
   * Item の assignees を置換。
   * - actor_type='user' の場合は workspace member であることをチェック (RLS では防げない)
   * - actor_type='agent' は agent レコード存在を信頼 (agent は system 管理)
   */
  async setAssignees(itemId: string, assignees: AssigneeRef[]): Promise<Result<AssigneeRef[]>> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await itemRepository.findById(tx, itemId)
      if (!before) return err(new NotFoundError(NOT_FOUND))
      await requireWorkspaceMember(before.workspaceId, 'member')

      const userAssignees = assignees.filter((a) => a.actorType === 'user')
      if (userAssignees.length > 0) {
        // workspace_members の RLS は「自分が member の ws」を全 member 返すので、
        // scoped tx で十分 (adminDb 不要)。同じ tx を使うことでトランザクション境界も揃う。
        const memberRows = await tx
          .select({ userId: workspaceMembers.userId })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, before.workspaceId))
        const memberIds = new Set(memberRows.map((r) => r.userId))
        for (const a of userAssignees) {
          if (!memberIds.has(a.actorId)) {
            return err(
              new ValidationError('workspace の member ではないユーザは assign できません'),
            )
          }
        }
      }
      const prevAssignees = await itemRepository.listAssignees(tx, itemId)
      await itemRepository.setAssignees(tx, itemId, assignees)
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item',
        targetId: itemId,
        action: 'set_assignees',
        before: prevAssignees,
        after: assignees,
      })
      return ok(assignees)
    })
  },

  /**
   * Item の tags を置換。workspace が一致しない tag は弾く。
   */
  async setTags(itemId: string, tagIds: string[]): Promise<Result<string[]>> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await itemRepository.findById(tx, itemId)
      if (!before) return err(new NotFoundError(NOT_FOUND))
      await requireWorkspaceMember(before.workspaceId, 'member')

      const tagsOk = await itemRepository.tagsBelongToWorkspace(tx, before.workspaceId, tagIds)
      if (!tagsOk) {
        return err(new ValidationError('別 workspace の tag は指定できません'))
      }
      const prevTagIds = await itemRepository.listTagIds(tx, itemId)
      await itemRepository.setTags(tx, itemId, tagIds)
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'item',
        targetId: itemId,
        action: 'set_tags',
        before: prevTagIds,
        after: tagIds,
      })
      return ok(tagIds)
    })
  },

  async listAssignees(itemId: string): Promise<AssigneeRef[]> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, itemId)
      if (!item) return []
      await requireWorkspaceMember(item.workspaceId, 'viewer')
      return await itemRepository.listAssignees(tx, itemId)
    })
  },

  /**
   * iter474: sprint 配下 items の assignees を bulk fetch して itemId ごとに
   * group 化。Sprint swim-lane Gantt UI の getAssignees callback 用 (N+1
   * query 回避)。要 viewer 権限。RLS で見えない items は inner join で
   * 結果から落ちる (情報漏洩なし)。grouping は pure helper に分離 (test deterministic)。
   */
  async listAssigneesForSprintItems(
    workspaceId: string,
    sprintId: string,
  ): Promise<Record<string, AssigneeRef[]>> {
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const rows = await itemRepository.listAssigneesForSprintItems(tx, sprintId)
      return groupAssigneesByItemId(rows)
    })
  },

  /**
   * iter476: workspace 全 items の assignees を bulk fetch (member-capacity
   * P0 entry 3 UI bind 用、sprint 横断、N+1 回避)。要 viewer 権限、grouping
   * は pure helper 共通化。
   */
  async listAssigneesForWorkspace(workspaceId: string): Promise<Record<string, AssigneeRef[]>> {
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const rows = await itemRepository.listAssigneesForWorkspace(tx, workspaceId)
      return groupAssigneesByItemId(rows)
    })
  },

  async listTagIds(itemId: string): Promise<string[]> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const item = await itemRepository.findById(tx, itemId)
      if (!item) return []
      await requireWorkspaceMember(item.workspaceId, 'viewer')
      return await itemRepository.listTagIds(tx, itemId)
    })
  },

  /**
   * 複数 Item の status を一括更新。
   * 1 件ずつ version を取って楽観ロック付きで update。
   * 戻り値: 成功した id / 失敗した { id, reason } を仕分けた Result。
   * 部分成功を許容 (= 1 件失敗しても残りは反映)。
   */
  async bulkUpdateStatus(
    workspaceId: string,
    ids: string[],
    status: string,
  ): Promise<Result<{ succeeded: string[]; failed: { id: string; reason: string }[] }>> {
    if (ids.length === 0) {
      return ok({ succeeded: [], failed: [] })
    }
    const { user } = await requireWorkspaceMember(workspaceId, 'member')
    return await withUserDb(user.id, async (tx) => {
      const succeeded: string[] = []
      const failed: { id: string; reason: string }[] = []
      for (const id of ids) {
        const before = await itemRepository.findById(tx, id)
        if (!before) {
          failed.push({ id, reason: 'not_found' })
          continue
        }
        if (before.workspaceId !== workspaceId) {
          failed.push({ id, reason: 'wrong_workspace' })
          continue
        }
        const newType = await itemRepository.findStatusType(tx, workspaceId, status)
        if (!newType) {
          failed.push({ id, reason: 'unknown_status' })
          continue
        }
        if (newType === 'done' && violatesMustDodInvariant(before)) {
          failed.push({ id, reason: 'must_without_dod' })
          continue
        }
        const updated = await itemRepository.updateWithLock(tx, id, before.version, { status })
        if (!updated) {
          failed.push({ id, reason: 'conflict' })
          continue
        }
        await recordAudit(tx, {
          workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: updated.id,
          action: 'bulk_status_change',
          before: { status: before.status },
          after: { status: updated.status },
        })
        succeeded.push(id)
      }
      return ok({ succeeded, failed })
    })
  },

  /**
   * 複数 Item の soft delete 一括。楽観ロックで 1 件ずつ削除 (race 時はスキップ)。
   */
  async bulkSoftDelete(
    workspaceId: string,
    ids: string[],
  ): Promise<Result<{ succeeded: string[]; failed: { id: string; reason: string }[] }>> {
    if (ids.length === 0) {
      return ok({ succeeded: [], failed: [] })
    }
    const { user } = await requireWorkspaceMember(workspaceId, 'member')
    return await withUserDb(user.id, async (tx) => {
      const succeeded: string[] = []
      const failed: { id: string; reason: string }[] = []
      for (const id of ids) {
        const before = await itemRepository.findById(tx, id)
        if (!before) {
          failed.push({ id, reason: 'not_found' })
          continue
        }
        if (before.workspaceId !== workspaceId) {
          failed.push({ id, reason: 'wrong_workspace' })
          continue
        }
        const deleted = await itemRepository.softDelete(tx, id, before.version)
        if (!deleted) {
          failed.push({ id, reason: 'conflict' })
          continue
        }
        await recordAudit(tx, {
          workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'item',
          targetId: deleted.id,
          action: 'bulk_delete',
          before,
        })
        succeeded.push(id)
      }
      return ok({ succeeded, failed })
    })
  },
}
