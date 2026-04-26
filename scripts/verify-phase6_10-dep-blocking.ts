/**
 * Phase 6.10 検証 — 依存ブロック検出 + Pre-mortem prompt 強化
 *
 * Service 層の動作確認は src/features/item-dependency/__tests__/service.test.ts が担保。
 * 本スクリプトは「Sprint + items + 依存を組んだ時に prompt がどう出るか」を
 * end-to-end で覗くためのもの。ANTHROPIC_API_KEY 不要。
 *
 * 1. user + workspace 作成
 * 2. items 3 件作成 (admin SQL)
 *    A=上流 todo / B=下流 MUST todo / C=Sprint 外の上流 in_progress
 * 3. item_dependencies に A→B (blocks) / C→B (blocks) を挿入
 * 4. Sprint 作成 + items A, B のみ割当 (C は外側)
 * 5. premortem-service が集計するのと同じクエリで items + deps を引き、
 *    buildPremortemUserMessage を呼んで生成された prompt を assert
 *
 * 実行:
 *   NODE_OPTIONS="--conditions=react-server" \
 *     pnpm tsx --env-file=.env.local scripts/verify-phase6_10-dep-blocking.ts
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'

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
  const email = `dep-${stamp}@example.com`
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
    ws_name: '依存ブロック検証',
    ws_slug: `dep-${stamp}`,
  })
  if (wsErr) throw wsErr
  const workspaceId = wsId as string
  console.log(`[setup] ws=${workspaceId} user=${userId}`)

  try {
    const { data: A } = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: '上流タスク (前提 A)',
        status: 'todo',
        is_must: false,
        priority: 3,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    const { data: B } = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: '下流の MUST (B)',
        status: 'todo',
        is_must: true,
        dod: 'PASS',
        priority: 1,
        due_date: '2026-05-06',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    const { data: C } = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: '外部 API 完成 (C)',
        status: 'in_progress',
        priority: 2,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    pass(
      'items 3 件作成',
      `A=${(A!.id as string).slice(0, 8)} B=${(B!.id as string).slice(0, 8)} C=${(C!.id as string).slice(0, 8)}`,
    )

    // item_dependencies: A blocks B / C blocks B (C は Sprint 外の external upstream)
    const { error: d1 } = await admin
      .from('item_dependencies')
      .insert({ from_item_id: A!.id, to_item_id: B!.id, type: 'blocks' })
    if (d1) fail('A blocks B 依存', d1.message)
    else pass('A blocks B 依存', 'OK')
    const { error: d2 } = await admin
      .from('item_dependencies')
      .insert({ from_item_id: C!.id, to_item_id: B!.id, type: 'blocks' })
    if (d2) fail('C blocks B 依存 (external)', d2.message)
    else pass('C blocks B 依存 (external)', 'OK')

    // Sprint 作成 + A, B を割当 (C は Sprint 外)
    const { data: sprintRow } = await admin
      .from('sprints')
      .insert({
        workspace_id: workspaceId,
        name: '依存ブロック検証 Sprint',
        goal: '上流が遅れて下流が引きずられるのを観測',
        start_date: '2026-05-01',
        end_date: '2026-05-07',
        status: 'planning',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    const sprintId = sprintRow!.id as string
    await admin.from('items').update({ sprint_id: sprintId }).in('id', [A!.id, B!.id])
    pass('Sprint + items 割当', `sprint=${sprintId.slice(0, 8)} (A,B のみ。C は外)`)

    // ----- prompt 生成 (premortem-service と同じパターン) -----
    const { buildPremortemUserMessage } = await import('@/features/sprint/premortem-service')

    const { data: items } = await admin
      .from('items')
      .select(
        'id, title, status, is_must, priority, due_date, dod, description, done_at, sprint_id, deleted_at',
      )
      .eq('sprint_id', sprintId)
      .is('deleted_at', null)
    const sprintItemIds = (items ?? []).map((i) => i.id as string)

    const { data: deps } = await admin
      .from('item_dependencies')
      .select('from_item_id, to_item_id, type')
      .eq('type', 'blocks')
      .or(`from_item_id.in.(${sprintItemIds.join(',')}),to_item_id.in.(${sprintItemIds.join(',')})`)

    const externalUpstreamIds = Array.from(
      new Set(
        (deps ?? [])
          .filter(
            (d) =>
              sprintItemIds.includes(d.to_item_id as string) &&
              !sprintItemIds.includes(d.from_item_id as string),
          )
          .map((d) => d.from_item_id as string),
      ),
    )
    const { data: externals } = await admin
      .from('items')
      .select('id, title, status, done_at')
      .in(
        'id',
        externalUpstreamIds.length > 0
          ? externalUpstreamIds
          : ['00000000-0000-0000-0000-000000000000'],
      )
      .is('deleted_at', null)

    const prompt = buildPremortemUserMessage({
      sprintName: '依存ブロック検証 Sprint',
      sprintGoal: '上流が遅れて下流が引きずられるのを観測',
      startDate: '2026-05-01',
      endDate: '2026-05-07',
      itemSummaries: (items ?? []).map((i) => ({
        id: i.id as string,
        title: i.title as string,
        status: i.status as string,
        isMust: i.is_must as boolean,
        priority: i.priority as number,
        dueDate: (i.due_date as string | null) ?? null,
        dod: (i.dod as string | null) ?? null,
        doneAt: i.done_at ? new Date(i.done_at as string) : null,
        descriptionPreview: ((i.description as string | null) ?? '').slice(0, 200),
      })),
      dependencies: (deps ?? []).map((d) => ({
        fromItemId: d.from_item_id as string,
        toItemId: d.to_item_id as string,
      })),
      externalUpstreams: (externals ?? []).map((e) => ({
        id: e.id as string,
        title: e.title as string,
        status: e.status as string,
        doneAt: e.done_at ? new Date(e.done_at as string) : null,
      })),
    })

    // ----- assertions -----
    const checks: Array<[string, string]> = [
      ['依存ブロックセクション', '🔴 依存ブロック中'],
      ['blocked count (MUST)', 'blocked: 1 件 (MUST 1)'],
      ['上流タスクのタイトル', '上流タスク (前提 A)'],
      ['下流 MUST のタイトル', '下流の MUST (B)'],
      ['外部上流ラベル', '外部 API 完成 (C) (Sprint 外)'],
      ['Watch List 強制指示', 'blocked MUST に対しては必ず 1 件 [Watch] Item を投下'],
      ['依存統計サマリ', '依存関係**: 2 件 (blocks)'],
    ]
    for (const [label, needle] of checks) {
      if (prompt.includes(needle)) pass(`prompt: ${label}`, `"${needle.slice(0, 40)}…"`)
      else
        fail(
          `prompt: ${label}`,
          `見つからない (excerpt: ${prompt.slice(0, 200).replace(/\n/g, ' / ')})`,
        )
    }
  } finally {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }

  console.log('\n=== 結果 ===')
  const ok = results.filter((r) => r.ok).length
  const total = results.length
  console.log(`PASS: ${ok}/${total}`)
  if (ok < total) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
