/**
 * pg-boss の 'researcher-decompose' キュー handler。
 * 1 job = 1 Item の分解 (researcherService.decomposeItem) を実行する。
 *
 * Template 展開時に `agent_role_to_invoke='researcher'` が付いた子 Item について
 * 自動起動する用。UI からは使わず、裏で pickup される。
 *
 * エラー扱いは `agent-run` worker と同方針: throw せずログのみ
 * (pg-boss retry で二重実行を招かないため)。
 */
import 'server-only'

import { randomUUID } from 'node:crypto'

import type { ResearcherDecomposeJobData } from '@/lib/jobs/queue'

import { researcherService } from './researcher-service'

export async function handleResearcherDecompose(
  jobs: Array<{ id: string; data: ResearcherDecomposeJobData }>,
): Promise<void> {
  for (const job of jobs) {
    const { workspaceId, itemId, reason } = job.data
    const shortItem = itemId.slice(0, 8)
    try {
      const result = await researcherService.decomposeItem({
        workspaceId,
        itemId,
        idempotencyKey: randomUUID(),
        ...(reason ? { extraHint: `自動起動: ${reason}` } : {}),
      })
      if (!result.ok) {
        console.error(
          `[researcher-decompose] item=${shortItem} failed: ${result.error.code} ${result.error.message}`,
        )
      } else {
        console.log(
          `[researcher-decompose] item=${shortItem} completed iterations=${result.value.iterations} cost=${result.value.costUsd}`,
        )
      }
    } catch (e) {
      console.error(`[researcher-decompose] item=${shortItem} unexpected throw:`, e)
    }
  }
}
