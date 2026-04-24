/**
 * Worker プロセスのエントリポイント。
 *
 * 起動:
 *   NODE_OPTIONS="--conditions=react-server" \
 *     pnpm tsx --env-file=.env.local src/workers/start.ts
 *   (pnpm worker でも可)
 *
 * 役割: pg-boss の各キュー handler を登録してジョブを pickup し続ける + 定期 cron。
 *   - agent-run            → features/agent/worker.ts
 *   - doc-embed            → features/doc/worker.ts
 *   - researcher-decompose → features/agent/researcher-worker.ts (Template 自動起動用)
 *   - pm-standup-tick      → daily 09:00 UTC fan-out
 *   - pm-standup           → per-workspace standup
 *   - template-cron-tick   → 15 分おき recurring Template instantiate
 *
 * 将来キューが増えたらここに register を追加する。
 */
import 'dotenv/config'

import { registerWorker, scheduleJob, startBoss, stopBoss } from '@/lib/jobs/queue'

import {
  handlePmStandup,
  handlePmStandupTick,
  handleTemplateCronTick,
} from '@/features/agent/cron-workers'
import { handleResearcherDecompose } from '@/features/agent/researcher-worker'
import { handleAgentRun } from '@/features/agent/worker'
import { handleDocEmbed } from '@/features/doc/worker'

async function main() {
  console.log('[worker] starting pg-boss...')
  await startBoss()
  await registerWorker('agent-run', handleAgentRun)
  await registerWorker('doc-embed', handleDocEmbed)
  await registerWorker('researcher-decompose', handleResearcherDecompose)
  await registerWorker('pm-standup', handlePmStandup)
  await registerWorker('pm-standup-tick', async () => {
    await handlePmStandupTick()
  })
  await registerWorker('template-cron-tick', async () => {
    await handleTemplateCronTick()
  })

  // 定期スケジュール登録 (idempotent)。
  // PM Standup: 毎日 09:00 UTC (= 18:00 JST)。TZ 制御は workspace_settings で post-MVP 精緻化。
  await scheduleJob('pm-standup-tick', '0 9 * * *', {})
  // Recurring Template: 15 分おき。cron_run_id UNIQUE で重複展開は DB レベルで防止。
  await scheduleJob('template-cron-tick', '*/15 * * * *', {})

  console.log(
    '[worker] ready. listening for: agent-run, doc-embed, researcher-decompose, pm-standup, pm-standup-tick, template-cron-tick',
  )

  const shutdown = async (signal: string) => {
    console.log(`[worker] received ${signal}, shutting down...`)
    await stopBoss()
    process.exit(0)
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

main().catch((e) => {
  console.error('[worker] failed to start:', e)
  process.exit(1)
})
