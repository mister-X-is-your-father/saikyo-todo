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
 *   - pm-standup-tick      → 15 分おき TZ-aware fan-out (workspace ごとに 09:00 ローカル発火)
 *   - pm-standup           → per-workspace standup
 *   - template-cron-tick   → 15 分おき recurring Template instantiate
 *   - sprint-retro-tick    → 15 分おき TZ-aware fan-out (workspace ごとに Mon 09:00 ローカル発火)
 *
 * 将来キューが増えたらここに register を追加する。
 */
import 'dotenv/config'

import { registerWorker, scheduleJob, startBoss, stopBoss } from '@/lib/jobs/queue'

import {
  handlePmRecovery,
  handlePmStandup,
  handlePmStandupTick,
  handleTemplateCronTick,
} from '@/features/agent/cron-workers'
import { handleResearcherDecompose } from '@/features/agent/researcher-worker'
import { handleAgentRun } from '@/features/agent/worker'
import { handleDocEmbed } from '@/features/doc/worker'
import { handleSprintPremortem } from '@/features/sprint/premortem-worker'
import { handleSprintRetro, handleSprintRetroTick } from '@/features/sprint/retro-worker'
import { createTimeEntryWorker } from '@/features/time-entry/worker'

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
  await registerWorker('pm-recovery', handlePmRecovery)
  await registerWorker('sprint-retro', handleSprintRetro)
  await registerWorker('sprint-retro-tick', async () => {
    await handleSprintRetroTick()
  })
  await registerWorker('sprint-premortem', handleSprintPremortem)
  await registerWorker('template-cron-tick', async () => {
    await handleTemplateCronTick()
  })
  await registerWorker('time-entry-sync', createTimeEntryWorker())

  // 定期スケジュール登録 (idempotent)。
  //
  // PM Standup / Sprint Retro は **TZ-aware fan-out** を採用:
  //   - pg-boss schedule は 15 分おきに tick だけ発火
  //   - handler が各 workspace の `workspace_settings.timezone` を見て、ローカライズした
  //     standup_cron (`0 9 * * *`) / weekly retro cron (`0 9 * * 1`) が
  //     前回処理以降に発火していれば fan-out
  //   → JST の workspace は 18:00 UTC (= 09:00 JST) 近傍の tick で発火、
  //      America/New_York なら 13:00 / 14:00 UTC (DST 依存)。
  //   遅延は最大 15 分。daily / weekly fan-out には十分。
  //
  // Recurring Template: 既に 15 分おき。cron_run_id UNIQUE で重複展開は DB レベルで防止。
  await scheduleJob('pm-standup-tick', '*/15 * * * *', {})
  await scheduleJob('template-cron-tick', '*/15 * * * *', {})
  await scheduleJob('sprint-retro-tick', '*/15 * * * *', {})

  console.log(
    '[worker] ready. listening for: agent-run, doc-embed, researcher-decompose, pm-standup, pm-standup-tick, pm-recovery, sprint-retro, sprint-retro-tick, sprint-premortem, template-cron-tick, time-entry-sync',
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
