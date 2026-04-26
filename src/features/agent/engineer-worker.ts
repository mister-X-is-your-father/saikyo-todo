/**
 * Engineer Agent worker (Phase 6.12)。
 *
 * pg-boss 'engineer-run' queue handler。Server Action から enqueue されたジョブを受け、
 * engineerService.runForItem を実行する。失敗してもログのみ (job throw しない =
 * pg-boss retry を抑制)。本番では Sentry / pino でアラート連携する想定。
 */
import 'server-only'

import type { EngineerRunJobData } from '@/lib/jobs/queue'

import { engineerService } from './engineer-service'

export async function handleEngineerRun(
  jobs: Array<{ id: string; data: EngineerRunJobData }>,
): Promise<void> {
  for (const job of jobs) {
    const { workspaceId, itemId, baseBranch, autoPr, triggeredAt } = job.data
    try {
      const result = await engineerService.runForItem({
        workspaceId,
        itemId,
        repoRoot: process.env.SAIKYO_REPO_ROOT ?? process.cwd(),
        baseBranch: baseBranch ?? 'main',
        autoPr: !!autoPr,
        idempotencyKey: job.id ?? `${itemId}-${triggeredAt}`,
      })
      if (!result.ok) {
        console.error(
          `[engineer-worker] failed itemId=${itemId} ws=${workspaceId}: ${result.error.message}`,
        )
      } else {
        console.info(
          `[engineer-worker] completed itemId=${itemId} ws=${workspaceId} files=${result.value.changedFiles.length} pr=${result.value.prUrl ?? '(none)'}`,
        )
      }
    } catch (e) {
      console.error(`[engineer-worker] unexpected error itemId=${itemId} ws=${workspaceId}:`, e)
    }
  }
}
