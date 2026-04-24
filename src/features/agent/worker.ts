/**
 * pg-boss の 'agent-run' キュー handler。
 * 1 job = 1 agent_invocation を実行する。
 *
 * 設計メモ:
 *   - handler 内で throw するとジョブが pg-boss の retry に入ってしまい、
 *     agent_invocation が `failed` 状態なのに再実行される恐れがある。
 *   - そのため runInvocation が Result.err を返しても throw はせず、
 *     ログだけ出してジョブは completed として扱う (invocation 側で errorMessage も既に記録済)。
 *   - Anthropic API の一時エラーによる自動 retry は post-MVP (要: invocation を queued に戻す仕組み)。
 */
import 'server-only'

import type { AgentRunJobData } from '@/lib/jobs/queue'

import { agentService } from './service'

export async function handleAgentRun(
  jobs: Array<{ id: string; data: AgentRunJobData }>,
): Promise<void> {
  for (const job of jobs) {
    const { invocationId } = job.data
    const shortId = invocationId.slice(0, 8)
    try {
      const result = await agentService.runInvocation(invocationId)
      if (!result.ok) {
        console.error(
          `[agent-run] invocation=${shortId} failed: ${result.error.code} ${result.error.message}`,
        )
      } else {
        console.log(
          `[agent-run] invocation=${shortId} completed status=${result.value.status} cost=${result.value.costUsd}`,
        )
      }
    } catch (e) {
      // 想定外例外: Result にすら落ちなかった場合だけここに来る。
      // invocation の状態は不整合の可能性があるので、ジョブは成功扱いにして手動介入を促す。
      console.error(`[agent-run] invocation=${shortId} unexpected throw:`, e)
    }
  }
}
