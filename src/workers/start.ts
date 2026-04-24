/**
 * Worker プロセスのエントリポイント。
 *
 * 起動:
 *   NODE_OPTIONS="--conditions=react-server" \
 *     pnpm tsx --env-file=.env.local src/workers/start.ts
 *   (pnpm worker でも可)
 *
 * 役割: pg-boss の各キュー handler を登録してジョブを pickup し続ける。
 *   - agent-run  → features/agent/worker.ts
 *   - doc-embed  → features/doc/worker.ts
 *
 * 将来 (researcher / cron 等) でキューが増えたらここに register を追加する。
 */
import 'dotenv/config'

import { registerWorker, startBoss, stopBoss } from '@/lib/jobs/queue'

import { handleAgentRun } from '@/features/agent/worker'
import { handleDocEmbed } from '@/features/doc/worker'

async function main() {
  console.log('[worker] starting pg-boss...')
  await startBoss()
  await registerWorker('agent-run', handleAgentRun)
  await registerWorker('doc-embed', handleDocEmbed)
  console.log('[worker] ready. listening for: agent-run, doc-embed')

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
