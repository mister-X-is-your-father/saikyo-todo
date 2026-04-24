/**
 * pg-boss ラッパ。Postgres 内でジョブキューを完結させる (Redis 不要)。
 * 接続は service_role 相当 (DATABASE_URL)。
 *
 * 起動パターン:
 *   Server Action 側: `enqueueJob(...)` が遅延初期化で boss を起動する
 *   Worker プロセス: `src/workers/start.ts` が `registerWorker(...)` 経由で handler を登録
 *
 * テスト: `vi.mock('@/lib/jobs/queue', ...)` で一括差し替え。
 */
import 'server-only'

import type { Job } from 'pg-boss'
import { PgBoss } from 'pg-boss'

/** 全キュー名を一元管理 (createQueue 忘れ防止)。v10+ で明示的作成が必須。 */
export const QUEUE_NAMES = ['agent-run'] as const
export type QueueName = (typeof QUEUE_NAMES)[number]

export interface AgentRunJobData {
  invocationId: string
}

let boss: PgBoss | null = null
let startPromise: Promise<PgBoss> | null = null

function getConnectionString(): string {
  return process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
}

/** pg-boss を起動 (idempotent)。全 queue を createQueue する。 */
export async function startBoss(): Promise<PgBoss> {
  if (boss) return boss
  if (startPromise) return startPromise
  startPromise = (async () => {
    const instance = new PgBoss({
      connectionString: getConnectionString(),
      schema: 'pgboss',
    })
    instance.on('error', (e: unknown) => console.error('[pg-boss] error:', e))
    await instance.start()
    for (const name of QUEUE_NAMES) {
      await instance.createQueue(name)
    }
    boss = instance
    return instance
  })()
  return startPromise
}

/** graceful shutdown。プロセス終了前に呼ぶ。 */
export async function stopBoss(): Promise<void> {
  if (!boss) return
  const b = boss
  boss = null
  startPromise = null
  await b.stop({ graceful: true, timeout: 5_000 })
}

/** Server Action からジョブ送信。wasNew=true のときのみ呼ぶこと (重複投入防止)。 */
export async function enqueueJob<T extends object>(
  name: QueueName,
  data: T,
): Promise<string | null> {
  const b = await startBoss()
  return await b.send(name, data)
}

/** Worker 側: キューに対する handler を登録。handler は `Job[]` (batch) を受ける。 */
export async function registerWorker<T>(
  name: QueueName,
  handler: (jobs: Array<{ id: string; data: T }>) => Promise<void>,
): Promise<string> {
  const b = await startBoss()
  return await b.work<T>(name, async (jobs: Job<T>[]) => {
    await handler(jobs)
  })
}
