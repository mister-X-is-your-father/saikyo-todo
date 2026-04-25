/**
 * Sprint Retrospective worker (Phase 5.3 自動化 + weekly cron)。
 *
 * - sprintService.changeStatus → 'completed' のときに enqueue される
 * - sprint-retro-tick (weekly cron) からも fan-out で enqueue される
 * - 1 ジョブ = 1 sprint の retro 生成
 * - singletonKey で同 sprint 二重実行を抑制
 *
 * エラーは throw せずログに留める (pg-boss 再試行での二重 invoke を避ける)。
 */
import 'server-only'

import { and, eq, gte, isNull, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { sprints } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import { enqueueJob, type SprintRetroJobData } from '@/lib/jobs/queue'

export async function handleSprintRetro(
  jobs: Array<{ id: string; data: SprintRetroJobData }>,
): Promise<void> {
  // 動的 import: pmService → @huggingface/transformers の重い chain を worker 起動時に
  // 即読まないようにする (pm-recovery worker と同じ pattern)
  const { retroService } = await import('@/features/sprint/retro-service')
  for (const job of jobs) {
    const { workspaceId, sprintId, trigger } = job.data
    try {
      const r = await retroService.runForSprint({
        sprintId,
        idempotencyKey: randomUUID(),
      })
      if (!r.ok) {
        console.error(
          `[sprint-retro] failed workspace=${workspaceId} sprint=${sprintId} trigger=${trigger}: ${r.error.code} ${r.error.message}`,
        )
      } else {
        console.log(
          `[sprint-retro] completed workspace=${workspaceId} sprint=${sprintId} trigger=${trigger} cost=${r.value.costUsd}`,
        )
      }
    } catch (e) {
      console.error(
        `[sprint-retro] unexpected workspace=${workspaceId} sprint=${sprintId} trigger=${trigger}`,
        e,
      )
    }
  }
}

/**
 * Weekly cron tick (Mon 09:00 UTC):
 *   - status='completed' AND retro_generated_at IS NULL の Sprint を全件 pickup
 *   - 古すぎる sprint (end_date が `lookbackDays` より前) は再度走らせる価値が低いので除外
 *   - 各 sprint を sprint-retro queue に fan-out (singletonKey で重複抑制済)
 *
 * 通常は changeStatus('completed') の trigger でその場 enqueue されるので、
 * cron が拾うのは worker 落ち / DB トリガ漏れ / 手動 status 変更などの fallback ケースのみ。
 */
export async function handleSprintRetroTick(
  options: { lookbackDays?: number; now?: Date } = {},
): Promise<void> {
  const lookbackDays = options.lookbackDays ?? 30
  const now = options.now ?? new Date()
  const cutoff = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000)
  const cutoffISO = cutoff.toISOString().slice(0, 10) // YYYY-MM-DD (sprints.end_date は date 型)

  const candidates = await adminDb
    .select({
      id: sprints.id,
      workspaceId: sprints.workspaceId,
    })
    .from(sprints)
    .where(
      and(
        eq(sprints.status, 'completed'),
        isNull(sprints.retroGeneratedAt),
        isNull(sprints.deletedAt),
        gte(sprints.endDate, sql`${cutoffISO}::date`),
      ),
    )

  console.log(`[sprint-retro-tick] picked up ${candidates.length} sprint(s)`)

  for (const sp of candidates) {
    try {
      await enqueueJob(
        'sprint-retro',
        {
          workspaceId: sp.workspaceId,
          sprintId: sp.id,
          triggeredAt: now.toISOString(),
          trigger: 'cron' as const,
        },
        { singletonKey: `sprint-retro-${sp.id}` },
      )
    } catch (e) {
      console.error(`[sprint-retro-tick] enqueue failed sprint=${sp.id}`, e)
    }
  }
}
