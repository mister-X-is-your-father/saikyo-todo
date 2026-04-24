/**
 * Day 15 P2 PoC: pg-boss + worker による enqueue → pickup → runInvocation の E2E 確認。
 *
 * フロー:
 *   1. admin で user+workspace を作る
 *   2. worker を**このプロセス内で**起動 (registerWorker)
 *   3. agentInvocations を直接 INSERT して boss に送信 (enqueue 相当)
 *   4. polling で row が completed / failed になるのを待つ
 *   5. cleanup (stopBoss + user 削除)
 *
 * 前提: ANTHROPIC_API_KEY が .env.local にあること。未設定なら skip。
 *
 * 実行:
 *   NODE_OPTIONS="--conditions=react-server" \
 *     pnpm tsx --env-file=.env.local scripts/poc-worker.ts
 */
import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { db } from '@/lib/db/client'
import { agentInvocations } from '@/lib/db/schema'
import { enqueueJob, registerWorker, startBoss, stopBoss } from '@/lib/jobs/queue'

import { agentService } from '@/features/agent/service'
import { handleAgentRun } from '@/features/agent/worker'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function waitForTerminal(
  id: string,
  timeoutMs = 60_000,
): Promise<{ status: string; elapsedMs: number; row: typeof agentInvocations.$inferSelect }> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const [row] = await db
      .select()
      .from(agentInvocations)
      .where(eq(agentInvocations.id, id))
      .limit(1)
    if (row && (row.status === 'completed' || row.status === 'failed')) {
      return { status: row.status, elapsedMs: Date.now() - started, row }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`timeout waiting for invocation ${id}`)
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[skip] ANTHROPIC_API_KEY 未設定。end-to-end は叩かず終了。')
    return
  }

  const stamp = Date.now()
  const email = `worker-poc-${stamp}@example.com`
  const password = 'password1234'

  console.log('[1] setup: user + workspace + worker 起動')
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Worker PoC' },
  })
  if (created.error || !created.data.user) throw created.error
  const userId = created.data.user.id

  const userClient = createClient(SUPABASE_URL, ANON_KEY)
  await userClient.auth.signInWithPassword({ email, password })
  const { data: wsId, error: wsErr } = await userClient.rpc('create_workspace', {
    ws_name: 'Worker PoC',
    ws_slug: `worker-poc-${stamp}`,
  })
  if (wsErr) throw wsErr

  await startBoss()
  await registerWorker('agent-run', handleAgentRun)
  console.log(`    user=${userId.slice(0, 8)} ws=${(wsId as string).slice(0, 8)} worker=ready`)

  try {
    console.log('[2] ensureAgent + INSERT queued invocation')
    const agent = await agentService.ensureAgent(wsId as string, 'pm')
    const [row] = await db
      .insert(agentInvocations)
      .values({
        agentId: agent.id,
        workspaceId: wsId as string,
        status: 'queued',
        input: {
          messages: [{ role: 'user', content: '「最強TODO」を一言で表現してください。' }],
          maxTokens: 80,
        },
        model: 'claude-haiku-4-5',
        idempotencyKey: randomUUID(),
      })
      .returning()
    if (!row) throw new Error('insert failed')
    console.log(`    invocation id=${row.id.slice(0, 8)}`)

    console.log('[3] pg-boss にジョブ送信')
    const jobId = await enqueueJob('agent-run', { invocationId: row.id })
    console.log(`    job id=${jobId}`)

    console.log('[4] worker による完了を待機 (polling, max 60s)')
    const { status, elapsedMs, row: fresh } = await waitForTerminal(row.id)
    const output = fresh.output as { text: string } | null
    console.log(
      `    status=${status} elapsed=${elapsedMs}ms tokens=${fresh.inputTokens}/${fresh.outputTokens} cost=${fresh.costUsd}`,
    )
    console.log(`    output: ${output?.text.slice(0, 80) ?? '(none)'}`)
    if (status !== 'completed') throw new Error(`expected completed, got ${status}`)

    console.log('\nAll checks PASSED. 🎉')
  } finally {
    await stopBoss().catch(() => {})
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('PoC failed:', e)
    process.exit(1)
  })
