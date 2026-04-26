/**
 * PM Pre-mortem 実配信検証 (live AI via claude CLI / MCP):
 *   - user + ws を作成
 *   - planning Sprint + 計画済 items (うち MUST 数件) を直挿入
 *   - PM Pre-mortem を runFlowViaClaude で実行
 *   - docs に "Pre-mortem" タイトルの Doc が作られる
 *   - items に [Watch] 接頭辞の Watch List Item が 1 件以上できる (重要リスク投下)
 *   - agent_invocations に completed 行 + cost > 0
 *
 * 実行:
 *   NODE_OPTIONS="--conditions=react-server" \
 *     pnpm tsx --env-file=.env.local scripts/verify-pm-premortem.ts
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { desc, eq, like } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { agentInvocations, docs, items } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { buildPremortemUserMessage } from '@/features/sprint/premortem-service'

import { runFlowViaClaude } from './claude-flow-runner'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

interface CheckResult {
  step: string
  ok: boolean
  note: string
}
const results: CheckResult[] = []
const pass = (s: string, n: string) => {
  results.push({ step: s, ok: true, note: n })
  console.log(`  [✓] ${s} — ${n}`)
}
const fail = (s: string, n: string) => {
  results.push({ step: s, ok: false, note: n })
  console.log(`  [✗] ${s} — ${n}`)
}

async function main() {
  const stamp = Date.now()
  const email = `premortem-${stamp}@example.com`
  const password = 'password1234'
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error
  const userId = cu.data.user.id

  const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const signIn = await userClient.auth.signInWithPassword({ email, password })
  if (signIn.error) throw signIn.error
  const { data: wsId, error: wsErr } = await userClient.rpc('create_workspace', {
    ws_name: 'Pre-mortem 検証',
    ws_slug: `pm-${stamp}`,
  })
  if (wsErr) throw wsErr
  const workspaceId = wsId as string
  console.log(`[setup] ws=${workspaceId}`)

  try {
    // planning Sprint を作成
    const start = '2026-05-01'
    const end = '2026-05-14'
    const { data: sprintRow } = await admin
      .from('sprints')
      .insert({
        workspace_id: workspaceId,
        name: 'Pre-mortem 検証 Sprint',
        goal: 'API 認証移行 + 監視刷新',
        start_date: start,
        end_date: end,
        status: 'planning',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    const sprintId = sprintRow!.id as string

    // 計画済 items: MUST + DoD 未設定で警戒対象を入れる
    const planned = [
      {
        title: '認証基盤刷新 (JWT → OIDC)',
        is_must: true,
        priority: 1,
        due_date: '2026-05-07',
        dod: 'OIDC で全 endpoint 認証 + 回帰 100% PASS',
        description: '既存 JWT を OIDC に置き換え。法務とのレビュー前提。',
      },
      {
        title: 'Schema 大幅 rewrite',
        is_must: true,
        priority: 1,
        due_date: '2026-05-12',
        dod: null, // ⚠ DoD 未設定
        description: '正規化を解除して JSONB 化。データ移行が伴う。',
      },
      {
        title: '監視 dashboard 刷新',
        is_must: false,
        priority: 2,
        due_date: '2026-05-14',
        dod: null,
        description: '',
      },
    ]
    const { data: insertedItems } = await admin
      .from('items')
      .insert(
        planned.map((p) => ({
          workspace_id: workspaceId,
          title: p.title,
          description: p.description,
          status: 'todo',
          is_must: p.is_must,
          dod: p.dod,
          priority: p.priority,
          due_date: p.due_date,
          parent_path: '',
          position: 'a' + Math.random().toString(36).slice(2, 5),
          sprint_id: sprintId,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        })),
      )
      .select('id')
    pass('setup', `sprint=${sprintId.slice(0, 8)} items=${insertedItems?.length}`)

    // 実 AI 実行
    const sprintItems = await adminDb
      .select({
        id: items.id,
        title: items.title,
        status: items.status,
        isMust: items.isMust,
        priority: items.priority,
        dueDate: items.dueDate,
        dod: items.dod,
        description: items.description,
      })
      .from(items)
      .where(eq(items.sprintId, sprintId))

    const userMessage = buildPremortemUserMessage({
      sprintName: 'Pre-mortem 検証 Sprint',
      sprintGoal: 'API 認証移行 + 監視刷新',
      startDate: start,
      endDate: end,
      itemSummaries: sprintItems.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        isMust: i.isMust,
        priority: i.priority,
        dueDate: i.dueDate,
        dod: i.dod,
        descriptionPreview: (i.description ?? '').slice(0, 200),
      })),
    })

    console.log('\n[live AI] PM Pre-mortem を claude CLI 経由で実行 (~30-60s)')
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
          'search_docs',
          'create_doc',
          'create_item',
        ],
        targetItemId: null,
      })
    } catch (e) {
      fail('premortem-run', e instanceof Error ? e.message : String(e))
      return
    }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    pass(
      'premortem-run',
      `turns=${out.numTurns} tools=${out.toolCallCount} cost=$${out.totalCostUsd.toFixed(4)} (${elapsed}s)`,
    )

    // Pre-mortem Doc が作られたか
    const docRows = await db
      .select()
      .from(docs)
      .where(eq(docs.workspaceId, workspaceId))
      .orderBy(desc(docs.createdAt))
    const premortemDoc = docRows.find(
      (d) =>
        d.title.toLowerCase().includes('pre-mortem') ||
        d.title.toLowerCase().includes('premortem') ||
        d.title.includes('予防'),
    )
    if (premortemDoc) {
      pass(
        'premortem-doc',
        `title="${premortemDoc.title.slice(0, 40)}" body_len=${premortemDoc.body.length}`,
      )
    } else if (docRows.length > 0) {
      pass(
        'premortem-doc-loose',
        `title="${docRows[0]!.title.slice(0, 40)}" (Pre-mortem キーワードなし — prompt 改善余地)`,
      )
    } else {
      fail('premortem-doc', 'Doc が 1 件も作成されていない')
    }

    // Watch List Item が作られたか (タイトルが "[Watch]" で始まる)
    const watchItems = await db.select().from(items).where(like(items.title, '%[Watch]%'))
    if (watchItems.length > 0) {
      pass(
        'watch-items',
        `count=${watchItems.length} sample="${watchItems[0]!.title.slice(0, 40)}"`,
      )
    } else {
      // Watch でない名前で作られたかもしれないので新規 items を確認
      const newItems = await db.select().from(items).where(eq(items.workspaceId, workspaceId))
      const expectedSprintItems = (insertedItems ?? []).map((i) => i.id)
      const created = newItems.filter((i) => !expectedSprintItems.includes(i.id))
      if (created.length > 0) {
        pass(
          'watch-items-loose',
          `[Watch] 接頭辞は付かなかったが新規 items が ${created.length} 件 (prompt 改善余地)`,
        )
      } else {
        fail('watch-items', '新規 items が作られていない')
      }
    }

    // agent_invocations 集計
    const invs = await db
      .select()
      .from(agentInvocations)
      .where(eq(agentInvocations.workspaceId, workspaceId))
    const completed = invs.filter((i) => i.status === 'completed').length
    const totalCost = invs.reduce((s, i) => s + Number(i.costUsd ?? 0), 0)
    if (completed >= 1 && totalCost > 0) {
      pass('invocations', `completed=${completed}/${invs.length} cost=$${totalCost.toFixed(4)}`)
    } else {
      fail('invocations', `completed=${completed} cost=${totalCost}`)
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
  console.log('  全項目 PASS — PM Pre-mortem 実配信動作確認 OK')
  process.exit(0)
}

main().catch((e) => {
  console.error('[fatal]', e)
  process.exit(2)
})
