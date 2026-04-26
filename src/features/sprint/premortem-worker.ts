/**
 * Sprint Pre-mortem worker (Phase 6.8)。
 *
 * - sprintService.changeStatus → 'active' のときに enqueue される (premortem_generated_at IS NULL のみ)
 * - 1 ジョブ = 1 sprint の Pre-mortem 生成
 * - singletonKey で同 sprint 二重実行を抑制
 *
 * Sprint planning 中の Pre-mortem 手動起動は service の `runForSprint` を直接呼ぶ
 * (Server Action `runPremortemAction` 経由)。
 */
import 'server-only'

import { randomUUID } from 'node:crypto'

import type { SprintPremortemJobData } from '@/lib/jobs/queue'

export async function handleSprintPremortem(
  jobs: Array<{ id: string; data: SprintPremortemJobData }>,
): Promise<void> {
  const { premortemService } = await import('@/features/sprint/premortem-service')
  for (const job of jobs) {
    const { workspaceId, sprintId, trigger } = job.data
    try {
      const r = await premortemService.runForSprint({
        sprintId,
        idempotencyKey: randomUUID(),
      })
      if (!r.ok) {
        console.error(
          `[sprint-premortem] failed workspace=${workspaceId} sprint=${sprintId} trigger=${trigger}: ${r.error.code} ${r.error.message}`,
        )
      } else {
        console.log(
          `[sprint-premortem] completed workspace=${workspaceId} sprint=${sprintId} trigger=${trigger} cost=${r.value.costUsd}`,
        )
      }
    } catch (e) {
      console.error(
        `[sprint-premortem] unexpected workspace=${workspaceId} sprint=${sprintId} trigger=${trigger}`,
        e,
      )
    }
  }
}
