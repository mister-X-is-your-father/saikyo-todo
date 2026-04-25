/**
 * MUST Heartbeat: 期日接近 MUST Item を検出し、workspace member 全員に in-app
 * 通知を冪等に発行する。
 *
 * ステージ (due までの日数で判定):
 *   - 7d: due が 4〜7 日後
 *   - 3d: due が 2〜3 日後
 *   - 1d: due が 0〜1 日後 (期日当日含む)
 *   (Xh 直前の 4 段目は post-MVP — REQUIREMENTS §受け入れ未満)
 *
 * 冪等:
 *   同一 (user, workspace, item, stage) の notification が既に存在する場合 skip。
 *   -> 一日に複数回呼ばれても通知は増えない。
 *
 * 実行権限: pg_cron / worker 経由想定なので adminDb。
 * 通知タイプ: notifications.type = 'heartbeat'。
 */
import 'server-only'

import { and, eq, gte, isNotNull, isNull, lte, sql } from 'drizzle-orm'

import { items, notifications, workspaceMembers } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { enqueueJob } from '@/lib/jobs/queue'
import { err, ok, type Result } from '@/lib/result'

export type HeartbeatStage = '7d' | '3d' | '1d' | 'overdue'

export interface HeartbeatScanResult {
  /** 対象 workspace 内で検出された MUST Item の数 */
  itemsEvaluated: number
  /** 実際に通知を発行した件数 (item × user × stage の合計) */
  notificationsCreated: number
  /** 既存通知で skip された件数 */
  notificationsSkipped: number
}

/**
 * due までの日数 (ISO 'YYYY-MM-DD' 前提、UTC ベース) を計算。
 * 負値なら既に期限切れ。
 */
export function daysUntilDue(dueISO: string, today: Date): number {
  // ISO 'YYYY-MM-DD' → UTC 00:00:00 の Date
  const [y, m, d] = dueISO.split('-').map(Number)
  const due = Date.UTC(y!, m! - 1, d!)
  const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Math.round((due - base) / (24 * 60 * 60 * 1000))
}

/** days → stage マップ。該当無しは null (通知不要)。 */
export function stageForDays(days: number): HeartbeatStage | null {
  if (days < 0) return 'overdue' // 期限超過: PM Recovery 発動対象
  if (days <= 1) return '1d'
  if (days <= 3) return '3d'
  if (days <= 7) return '7d'
  return null
}

/** stage → PM Recovery enqueue 対象か。1d / overdue で発動。 */
function shouldEnqueuePmRecovery(stage: HeartbeatStage): boolean {
  return stage === '1d' || stage === 'overdue'
}

export const heartbeatService = {
  async scanWorkspace(
    workspaceId: string,
    options: { today?: Date } = {},
  ): Promise<Result<HeartbeatScanResult>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const today = options.today ?? new Date()

    return await adminDb.transaction(async (tx) => {
      // MUST + dueDate あり + 未削除 + done 以外
      const rows = await tx
        .select({
          id: items.id,
          dueDate: items.dueDate,
        })
        .from(items)
        .where(
          and(
            eq(items.workspaceId, workspaceId),
            isNull(items.deletedAt),
            eq(items.isMust, true),
            isNotNull(items.dueDate),
            // status done は除外 (audit は status トリガ前提なので done_at も見るべきだが
            //   MVP は status 文字列比較で簡潔に)
            sql`${items.status} != 'done'`,
          ),
        )

      const members = await tx
        .select({ userId: workspaceMembers.userId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId))

      let created = 0
      let skipped = 0
      const pmRecoveryItems: Array<{ itemId: string; stage: HeartbeatStage }> = []

      for (const item of rows) {
        if (!item.dueDate) continue
        const days = daysUntilDue(item.dueDate, today)
        const stage = stageForDays(days)
        if (!stage) continue
        if (shouldEnqueuePmRecovery(stage)) {
          pmRecoveryItems.push({ itemId: item.id, stage })
        }

        for (const { userId } of members) {
          // 同一 (userId, workspaceId, itemId, stage) の heartbeat 通知が既にあるか
          const existing = await tx
            .select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, userId),
                eq(notifications.workspaceId, workspaceId),
                eq(notifications.type, 'heartbeat'),
                sql`${notifications.payload}->>'itemId' = ${item.id}`,
                sql`${notifications.payload}->>'stage' = ${stage}`,
              ),
            )
            .limit(1)
          if (existing.length > 0) {
            skipped += 1
            continue
          }
          await tx.insert(notifications).values({
            userId,
            workspaceId,
            type: 'heartbeat',
            payload: {
              itemId: item.id,
              stage,
              dueDate: item.dueDate,
              daysUntilDue: days,
            } as never,
          })
          created += 1
        }
      }

      // PM Recovery を pg-boss queue に投入 (失敗しても scan 全体は成立させる)。
      // singletonKey で同一 (item, stage) の重複 enqueue を 1 日スパンで抑制。
      const todayKey = today.toISOString().slice(0, 10)
      for (const { itemId, stage } of pmRecoveryItems) {
        try {
          await enqueueJob(
            'pm-recovery',
            {
              workspaceId,
              itemId,
              stage,
              triggeredAt: today.toISOString(),
            },
            {
              singletonKey: `pm-recovery-${workspaceId}-${itemId}-${stage}-${todayKey}`,
            },
          )
        } catch (e) {
          // enqueue 失敗は致命的ではない (scan は idempotent に再実行される)
          console.error(`[heartbeat] pm-recovery enqueue failed item=${itemId}`, e)
        }
      }

      return ok({
        itemsEvaluated: rows.length,
        notificationsCreated: created,
        notificationsSkipped: skipped,
      })
    })
  },

  /** ユーザ視点の未読 heartbeat 件数 (Dashboard バッジ用)。 */
  async unreadCount(workspaceId: string, userId: string): Promise<number> {
    const rows = await adminDb
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
          eq(notifications.type, 'heartbeat'),
          isNull(notifications.readAt),
        ),
      )
    return rows[0]?.count ?? 0
  },

  /** 未読 heartbeat の最新リスト (Dashboard 一覧用)。 */
  async listUnread(workspaceId: string, userId: string, limit = 20) {
    return await adminDb
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
          eq(notifications.type, 'heartbeat'),
          isNull(notifications.readAt),
        ),
      )
      .orderBy(sql`${notifications.createdAt} desc`)
      .limit(limit)
  },
}

// 未使用 import 抑止 (将来のフィルタ追加用に keep)
void gte
void lte
