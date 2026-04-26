/**
 * Sprint Retrospective worker (Phase 5.3 自動化 + weekly cron)。
 *
 * - sprintService.changeStatus → 'completed' のときに enqueue される
 * - sprint-retro-tick (TZ-aware weekly cron) からも fan-out で enqueue される
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

import { shouldFireForWorkspace } from '@/features/agent/cron-tz'

/** Default weekly cron used when a workspace has no settings row. */
const DEFAULT_RETRO_CRON = '0 9 * * 1'
const DEFAULT_TIMEZONE = 'Asia/Tokyo'

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
 * 15 分おきの tick (TZ-aware fallback fan-out)。
 *
 *   - 各 workspace の `workspace_settings.timezone` でローカライズした
 *     weekly cron (`0 9 * * 1` 既定) が「前回の retro 生成以降に発火」したかを判定
 *   - 発火した workspace についてのみ status='completed' AND retro_generated_at IS NULL
 *     の Sprint (lookback 内) を fan-out する
 *
 * 通常は changeStatus('completed') の trigger でその場 enqueue されるので、
 * cron が拾うのは worker 落ち / DB トリガ漏れ / 手動 status 変更などの fallback ケースのみ。
 *
 * lastFiredAt は workspace 内で直近に retro_generated_at が立った sprint の値を採用。
 * (= 前回の Mon 09:00 fan-out で生成した retro が cutoff になる)
 */
export async function handleSprintRetroTick(
  options: { lookbackDays?: number; now?: Date } = {},
): Promise<void> {
  const lookbackDays = options.lookbackDays ?? 30
  const now = options.now ?? new Date()
  const cutoff = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000)
  const cutoffISO = cutoff.toISOString().slice(0, 10) // YYYY-MM-DD (sprints.end_date は date 型)

  // 1) どの workspace で今 tick が発火するべきかを TZ-aware で評価。
  type WsRow = {
    id: string
    timezone: string | null
    last_fired_at: string | null
  }
  const wsRows = await adminDb.execute<WsRow>(
    sql`
      select
        w.id,
        s.timezone,
        (
          select max(sp.retro_generated_at)::text
          from public.sprints sp
          where sp.workspace_id = w.id
            and sp.retro_generated_at is not null
        ) as last_fired_at
      from public.workspaces w
      left join public.workspace_settings s on s.workspace_id = w.id
      where w.deleted_at is null
    `,
  )
  const workspaces = wsRows as unknown as Array<WsRow>
  const firingWorkspaceIds = new Set<string>()
  for (const w of workspaces) {
    const tz = w.timezone ?? DEFAULT_TIMEZONE
    const lastFiredAt = w.last_fired_at ? new Date(w.last_fired_at) : null
    const should = shouldFireForWorkspace({
      cronExpr: DEFAULT_RETRO_CRON,
      tz,
      now,
      lastFiredAt,
    })
    if (should) firingWorkspaceIds.add(w.id)
  }

  if (firingWorkspaceIds.size === 0) {
    console.log(
      `[sprint-retro-tick] evaluated ${workspaces.length} ws, none firing at ${now.toISOString()}`,
    )
    return
  }

  // 2) 該当 workspace の中から retro 未生成 sprint (lookback 内) を全部拾う。
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

  const picked = candidates.filter((c) => firingWorkspaceIds.has(c.workspaceId))
  console.log(
    `[sprint-retro-tick] firing ws=${firingWorkspaceIds.size}, picked ${picked.length} sprint(s)`,
  )

  for (const sp of picked) {
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
