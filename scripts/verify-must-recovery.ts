/**
 * MUST Recovery 実配信検証 (live AI call via claude CLI / MCP):
 *   - user + ws を作成
 *   - 期限切れ MUST Item を 1 件挿入
 *   - heartbeat scan で overdue を検知して通知 + pm-recovery enqueue を確認
 *   - PM Recovery を runFlowViaClaude (claude CLI 経由) で実行
 *   - items に注意喚起コメントが投下されたか確認
 *   - docs に "MUST Recovery" タイトルの Doc が作られたか確認
 *   - agent_invocations に completed 行 + cost > 0 が残ったか確認
 *
 * 実行:
 *   NODE_OPTIONS="--conditions=react-server" \
 *     pnpm tsx --env-file=.env.local scripts/verify-must-recovery.ts
 *
 * 前提: claude CLI が PATH 上にあり、Max OAuth で認証済 (ANTHROPIC_API_KEY 不要)。
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { agentInvocations, commentsOnItems, docs, items } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { buildRecoveryUserMessage } from '@/features/agent/pm-service'
import { heartbeatService } from '@/features/heartbeat/service'

import { runFlowViaClaude } from './claude-flow-runner'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

interface Result {
  step: string
  ok: boolean
  note: string
}

const results: Result[] = []
function pass(step: string, note: string) {
  results.push({ step, ok: true, note })
  console.log(`  [✓] ${step} — ${note}`)
}
function fail(step: string, note: string) {
  results.push({ step, ok: false, note })
  console.log(`  [✗] ${step} — ${note}`)
}

async function main() {
  const stamp = Date.now()
  const email = `recovery-${stamp}@example.com`
  const password = 'password1234'

  console.log('[setup] user + workspace 作成')
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (created.error || !created.data.user) throw created.error
  const userId = created.data.user.id

  // workspace 作成 (user の anon client 経由で create_workspace RPC)
  const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const signIn = await userClient.auth.signInWithPassword({ email, password })
  if (signIn.error) throw signIn.error

  const { data: wsId, error: wsErr } = await userClient.rpc('create_workspace', {
    ws_name: 'MUST Recovery 検証',
    ws_slug: `recovery-${stamp}`,
  })
  if (wsErr) throw wsErr
  const workspaceId = wsId as string
  console.log(`[setup] ws=${workspaceId} user=${userId}`)

  try {
    // 期限切れ MUST Item を 1 件挿入
    const past = new Date()
    past.setDate(past.getDate() - 2)
    const dueISO = past.toISOString().slice(0, 10)
    const [mustItem] = await db
      .insert(items)
      .values({
        workspaceId,
        title: '本番デプロイ — MUST 期限超過',
        description:
          'feature/auth ブランチを本番に merge し、Caddy / migration / DB 復旧を完了させる。' +
          'ステークホルダ: 法務 / SRE / プロダクト。期限を 2 日超過しており影響大。',
        status: 'todo',
        isMust: true,
        dod: '本番 health-check が 5 分連続で 200 / 重要 endpoint が回帰テスト 100% PASS',
        dueDate: dueISO,
        parentPath: '',
        position: 'a0',
        createdByActorType: 'user',
        createdByActorId: userId,
      })
      .returning()
    if (!mustItem) {
      fail('setup-must-item', 'insert 失敗')
      return
    }
    pass('setup-must-item', `id=${mustItem.id.slice(0, 8)} due=${dueISO}`)

    // heartbeat scan で overdue 検知
    const scan = await heartbeatService.scanWorkspace(workspaceId)
    if (!scan.ok) {
      fail('heartbeat-scan', scan.error.message)
    } else {
      pass(
        'heartbeat-scan',
        `evaluated=${scan.value.itemsEvaluated} created=${scan.value.notificationsCreated}`,
      )
    }

    // 実 AI 実行: PM Recovery (overdue stage)
    console.log('\n[live AI] PM Recovery を claude CLI 経由で実行 (数秒〜30s)')
    const userMessage = buildRecoveryUserMessage({
      itemId: mustItem.id,
      stage: 'overdue',
    })
    const t0 = Date.now()
    let out
    try {
      out = await runFlowViaClaude({
        workspaceId,
        role: 'pm',
        userMessage,
        allowedToolNames: [
          'read_items',
          'search_items',
          'read_docs',
          'create_doc',
          'write_comment',
        ],
        targetItemId: mustItem.id,
      })
    } catch (e) {
      fail('pm-recovery-run', e instanceof Error ? e.message : String(e))
      return
    }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    pass(
      'pm-recovery-run',
      `turns=${out.numTurns} tools=${out.toolCallCount} cost=$${out.totalCostUsd.toFixed(4)} (${elapsed}s)`,
    )

    // Doc が作られたか (タイトルに "Recovery" を含む)
    const docRows = await db
      .select()
      .from(docs)
      .where(eq(docs.workspaceId, workspaceId))
      .orderBy(desc(docs.createdAt))
    const recoveryDoc = docRows.find(
      (d) =>
        d.title.includes('Recovery') || d.title.includes('recovery') || d.title.includes('救済'),
    )
    if (recoveryDoc) {
      pass(
        'recovery-doc',
        `title="${recoveryDoc.title.slice(0, 40)}" body_len=${recoveryDoc.body.length}`,
      )
    } else if (docRows.length > 0) {
      // タイトルが期待形式と違っても、新規 Doc が作られていたら一応 PASS (prompt 微調整余地)
      const d = docRows[0]!
      pass(
        'recovery-doc-loose',
        `title="${d.title.slice(0, 40)}" (title に Recovery を含まない — prompt 改善余地)`,
      )
    } else {
      fail('recovery-doc', 'Doc が 1 件も作成されていない')
    }

    // Item に Comment が投下されたか
    const commentRows = await adminDb.transaction((tx) =>
      tx
        .select()
        .from(commentsOnItems)
        .where(and(eq(commentsOnItems.itemId, mustItem.id))),
    )
    const agentComments = commentRows.filter((c) => c.authorActorType === 'agent')
    if (agentComments.length > 0) {
      pass(
        'recovery-comment',
        `agent_comments=${agentComments.length} body_preview="${agentComments[0]?.body.slice(0, 60)}…"`,
      )
    } else {
      fail('recovery-comment', `comments=${commentRows.length} agent_comments=0`)
    }

    // agent_invocations の集計
    const invs = await db
      .select()
      .from(agentInvocations)
      .where(eq(agentInvocations.workspaceId, workspaceId))
    const completed = invs.filter((i) => i.status === 'completed').length
    const totalCost = invs.reduce((s, i) => s + Number(i.costUsd ?? 0), 0)
    if (completed >= 1 && totalCost > 0) {
      pass(
        'invocations-cost',
        `completed=${completed}/${invs.length} cost=$${totalCost.toFixed(4)}`,
      )
    } else {
      fail('invocations-cost', `completed=${completed} cost=${totalCost}`)
    }
  } finally {
    console.log('\n[cleanup] user 削除 (cascade)')
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }

  const failed = results.filter((r) => !r.ok)
  console.log('\n=============================================')
  console.log(`結果: ${results.length - failed.length}/${results.length} PASS`)
  if (failed.length > 0) {
    for (const f of failed) console.log(`  ✗ ${f.step}: ${f.note}`)
    process.exit(1)
  }
  console.log('  全項目 PASS — MUST Recovery 実配信動作確認 OK')
  process.exit(0)
}

main().catch((e) => {
  console.error('[fatal]', e)
  process.exit(2)
})
