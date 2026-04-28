/**
 * Engineer Agent worker (Phase 6.12 + 6.15 iter 245)。
 *
 * pg-boss 'engineer-run' queue handler。Server Action から enqueue されたジョブを受け、
 * 環境変数 `SAIKYO_ENGINEER_USE_CLOUD_SANDBOX` でローカル / クラウド経路を分岐:
 *   - local (default): `engineerService.runForItem` で git worktree + 子 prosess
 *   - cloud: `runEngineerInCloudSandbox` で e2b microVM 経由 (フル自動 α、main 直 push)
 *
 * 失敗してもログのみ (job throw しない = pg-boss retry を抑制)。本番では Sentry /
 * pino でアラート連携する想定。
 */
import 'server-only'

import { adminDb } from '@/lib/db/scoped-client'
import type { EngineerRunJobData } from '@/lib/jobs/queue'

import { itemRepository } from '@/features/item/repository'

import { chooseEngineerRunner, runEngineerInCloudSandbox } from './cloud-engineer-adapter'
import { buildUserMessage, engineerService } from './engineer-service'

export async function handleEngineerRun(
  jobs: Array<{ id: string; data: EngineerRunJobData }>,
): Promise<void> {
  for (const job of jobs) {
    const { workspaceId, itemId, baseBranch, autoPr, triggeredAt } = job.data
    const runner = chooseEngineerRunner()
    try {
      if (runner === 'cloud') {
        await runViaCloudSandbox({
          jobId: job.id,
          workspaceId,
          itemId,
          triggeredAt,
        })
      } else {
        await runViaLocal({
          jobId: job.id,
          workspaceId,
          itemId,
          baseBranch,
          autoPr,
          triggeredAt,
        })
      }
    } catch (e) {
      console.error(
        `[engineer-worker] unexpected error itemId=${itemId} ws=${workspaceId} runner=${runner}:`,
        e,
      )
    }
  }
}

async function runViaLocal(args: {
  jobId: string
  workspaceId: string
  itemId: string
  baseBranch?: string | null
  autoPr?: boolean
  triggeredAt: string
}): Promise<void> {
  const result = await engineerService.runForItem({
    workspaceId: args.workspaceId,
    itemId: args.itemId,
    repoRoot: process.env.SAIKYO_REPO_ROOT ?? process.cwd(),
    baseBranch: args.baseBranch ?? 'main',
    autoPr: !!args.autoPr,
    idempotencyKey: args.jobId ?? `${args.itemId}-${args.triggeredAt}`,
  })
  if (!result.ok) {
    console.error(
      `[engineer-worker:local] failed itemId=${args.itemId} ws=${args.workspaceId}: ${result.error.message}`,
    )
  } else {
    console.info(
      `[engineer-worker:local] completed itemId=${args.itemId} ws=${args.workspaceId} files=${result.value.changedFiles.length} pr=${result.value.prUrl ?? '(none)'}`,
    )
  }
}

async function runViaCloudSandbox(args: {
  jobId: string
  workspaceId: string
  itemId: string
  triggeredAt: string
}): Promise<void> {
  // Item 取得 (worker は server context、admin で OK。verify は cloud 内で走る)
  const item = await adminDb.transaction((tx) => itemRepository.findById(tx, args.itemId))
  if (!item) {
    console.error(`[engineer-worker:cloud] item not found itemId=${args.itemId}`)
    return
  }
  if (item.workspaceId !== args.workspaceId) {
    console.error(
      `[engineer-worker:cloud] item ws mismatch itemId=${args.itemId} expected=${args.workspaceId} got=${item.workspaceId}`,
    )
    return
  }

  const prompt = buildUserMessage(item.title, item.description ?? '', item.dod)
  try {
    const out = await runEngineerInCloudSandbox({
      invocationId: args.jobId ?? `${args.itemId}-${args.triggeredAt}`,
      workspaceId: args.workspaceId,
      itemId: args.itemId,
      prompt,
      // verify は default 'fast'、autoMergeToMain も default true (フル自動 α)
    })
    if (out.exitCode === 0 && out.exitReason === 'completed') {
      console.info(
        `[engineer-worker:cloud] completed itemId=${args.itemId} ws=${args.workspaceId} sandbox=${out.sandboxId} duration=${out.durationMs}ms`,
      )
    } else {
      console.error(
        `[engineer-worker:cloud] failed itemId=${args.itemId} ws=${args.workspaceId} reason=${out.exitReason} exitCode=${out.exitCode} err=${out.errorMessage ?? '(none)'}`,
      )
    }
  } catch (e) {
    // CloudEngineerEnvError 等はここに来る (env 不備 → fail-fast)
    console.error(
      `[engineer-worker:cloud] env / setup error itemId=${args.itemId} ws=${args.workspaceId}:`,
      e,
    )
  }
}
