/**
 * Day 15 P1 PoC: agentService.runInvocation で実 Anthropic API を叩く。
 *
 * enqueue は Server Action 用 (Next.js cookies 依存) なので、ここでは
 *   1. admin で user+workspace を作る
 *   2. ensureAgent (adminDb 経由なので認証不要)
 *   3. agent_invocations を直接 INSERT (= enqueue 相当)
 *   4. runInvocation(id) を呼ぶ → 実 Anthropic 呼び出し
 *   5. 完了後の row を確認 (status / tokens / cost)
 *
 * 実行:
 *   NODE_OPTIONS="--conditions=react-server" \
 *     pnpm tsx --env-file=.env.local scripts/poc-agent.ts
 *
 * 前提: ANTHROPIC_API_KEY と SUPABASE_SERVICE_ROLE_KEY が .env.local にあること。
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

import { db } from '@/lib/db/client'
import { agentInvocations } from '@/lib/db/schema'

import { agentService } from '@/features/agent/service'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[skip] ANTHROPIC_API_KEY 未設定。実 API は叩かずに終了。')
    return
  }

  const stamp = Date.now()
  const email = `agent-poc-${stamp}@example.com`
  const password = 'password1234'

  console.log('[1] setup: user + workspace')
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Agent PoC' },
  })
  if (created.error || !created.data.user) throw created.error
  const userId = created.data.user.id

  const userClient = createClient(SUPABASE_URL, ANON_KEY)
  await userClient.auth.signInWithPassword({ email, password })
  const { data: wsId, error: wsErr } = await userClient.rpc('create_workspace', {
    ws_name: 'Agent PoC',
    ws_slug: `agent-poc-${stamp}`,
  })
  if (wsErr) throw wsErr
  console.log(`    user=${userId.slice(0, 8)} ws=${(wsId as string).slice(0, 8)}`)

  try {
    console.log('[2] ensureAgent(pm)')
    const agent = await agentService.ensureAgent(wsId as string, 'pm')
    console.log(`    agent id=${agent.id.slice(0, 8)} role=${agent.role}`)

    console.log('[3] INSERT agent_invocations (queued)')
    const idempotencyKey = randomUUID()
    const [row] = await db
      .insert(agentInvocations)
      .values({
        agentId: agent.id,
        workspaceId: wsId as string,
        status: 'queued',
        input: {
          messages: [{ role: 'user', content: '「最強TODO」を一行で紹介してください。' }],
          maxTokens: 200,
        },
        model: 'claude-haiku-4-5',
        idempotencyKey,
      })
      .returning()
    if (!row) throw new Error('insert agent_invocations failed')
    console.log(`    invocation id=${row.id.slice(0, 8)}`)

    console.log('[4] runInvocation (実 Anthropic 呼び出し)')
    const t0 = Date.now()
    const result = await agentService.runInvocation(row.id)
    const elapsed = Date.now() - t0
    if (!result.ok) throw new Error(`runInvocation failed: ${result.error.message}`)
    const inv = result.value
    console.log(`    status=${inv.status} elapsed=${elapsed}ms`)
    console.log(`    tokens: in=${inv.inputTokens} out=${inv.outputTokens}`)
    console.log(`    cost_usd=${inv.costUsd}`)
    const output = inv.output as { text: string; stopReason: string } | null
    console.log(`    output: ${output?.text.slice(0, 80) ?? '(none)'}`)

    console.log('[5] audit_log を確認')
    const { data: audits } = await admin
      .from('audit_log')
      .select('actor_type, action')
      .eq('target_id', row.id)
      .order('created_at', { ascending: true })
    const actions = audits?.map((a) => `${a.actor_type}:${a.action}`).join(', ')
    console.log(`    entries: ${actions ?? '(none)'}`)
    if (!audits?.some((a) => a.action === 'complete' && a.actor_type === 'agent')) {
      throw new Error('agent:complete audit missing')
    }

    console.log('\nAll checks PASSED. 🎉')
  } finally {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }
}

main().catch((e) => {
  console.error('PoC failed:', e)
  process.exit(1)
})
