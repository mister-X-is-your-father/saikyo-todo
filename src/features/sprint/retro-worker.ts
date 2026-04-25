/**
 * Sprint Retrospective worker (Phase 5.3 自動化)。
 *
 * - sprintService.changeStatus → 'completed' のときに enqueue される
 * - 1 ジョブ = 1 sprint の retro 生成
 * - singletonKey で同 sprint 二重実行を抑制
 *
 * エラーは throw せずログに留める (pg-boss 再試行での二重 invoke を避ける)。
 */
import 'server-only'

import { randomUUID } from 'node:crypto'

import type { SprintRetroJobData } from '@/lib/jobs/queue'

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
