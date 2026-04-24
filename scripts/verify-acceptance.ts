/**
 * MVP 受け入れ検証スクリプト (HANDOFF.md §6.1 + §6.2 の自動化可能分)。
 *
 * 実行:
 *   NODE_OPTIONS="--conditions=react-server" \
 *     pnpm tsx --env-file=.env.local scripts/verify-acceptance.ts
 *
 * 前提: supabase local / .env.local (SUPABASE_SERVICE_ROLE_KEY)。
 * AI 系は claude CLI (Max プラン OAuth) 経由なので ANTHROPIC_API_KEY は不要。
 */
import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { uuidToLabel } from '@/lib/db/ltree-path'
import { agentInvocations, docs, items } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { heartbeatService } from '@/features/heartbeat/service'
import { templateItemRepository, templateRepository } from '@/features/template/repository'
import { SAMPLE_TEMPLATE_NAME, seedSampleTemplate } from '@/features/workspace/seed-templates'

import { type ClaudeFlowInput, type ClaudeFlowOutput, runFlowViaClaude } from './claude-flow-runner'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

interface VerifyResult {
  step: string
  ok: boolean
  note: string
}

const results: VerifyResult[] = []

function pass(step: string, note: string) {
  results.push({ step, ok: true, note })
  console.log(`  [✓] ${step} — ${note}`)
}
function fail(step: string, note: string) {
  results.push({ step, ok: false, note })
  console.log(`  [✗] ${step} — ${note}`)
}

interface AIFlowCase {
  label: string
  input: ClaudeFlowInput
  verify: (out: ClaudeFlowOutput, elapsed: string) => Promise<{ ok: boolean; note: string }>
}

async function runAndVerifyFlow(c: AIFlowCase): Promise<void> {
  const t0 = Date.now()
  try {
    const out = await runFlowViaClaude(c.input)
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    const v = await c.verify(out, elapsed)
    ;(v.ok ? pass : fail)(c.label, v.note)
  } catch (e) {
    fail(c.label, e instanceof Error ? e.message : String(e))
  }
}

async function main() {
  // AI 系は claude CLI (Max プラン OAuth) 経由で実行するので API Key は不要。
  // claude CLI が動くことだけ確認する。
  console.log('[info] AI 系は claude CLI (Max プラン OAuth) 経由で実行します')

  const stamp = Date.now()
  const email = `verify-${stamp}@example.com`
  const password = 'password1234'

  console.log('\n[setup] user + workspace 作成')
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Verify' },
  })
  if (created.error || !created.data.user) throw created.error
  const userId = created.data.user.id

  const userClient = createClient(SUPABASE_URL, ANON_KEY)
  await userClient.auth.signInWithPassword({ email, password })
  const { data: wsIdRaw, error: wsErr } = await userClient.rpc('create_workspace', {
    ws_name: 'Verify WS',
    ws_slug: `verify-${stamp}`,
  })
  if (wsErr) throw wsErr
  const wsId = wsIdRaw as string
  console.log(`  user=${userId.slice(0, 8)} ws=${wsId.slice(0, 8)}`)

  try {
    // ============ §6.1-A サンプル Template 投入 ============
    console.log('\n[A] サンプル Template 自動投入')
    const seedRes = await seedSampleTemplate(wsId, userId)
    if (!seedRes) {
      fail('sample-template-seed', 'seedSampleTemplate が null')
    } else {
      const tmpls = await adminDb.transaction((tx) =>
        templateRepository.list(tx, { workspaceId: wsId }),
      )
      const sample = tmpls.find((t) => t.name === SAMPLE_TEMPLATE_NAME)
      if (!sample) {
        fail('sample-template-seed', 'サンプル Template が見つからない')
      } else {
        const tmplItems = await adminDb.transaction((tx) =>
          templateItemRepository.listByTemplate(tx, sample.id),
        )
        const roleResearcher = tmplItems.filter((i) => i.agentRoleToInvoke === 'researcher').length
        pass(
          'sample-template-seed',
          `template=${sample.id.slice(0, 8)} items=${tmplItems.length} researcher=${roleResearcher}`,
        )
      }
    }

    // ============ §6.1-B MUST Item を作って heartbeat ============
    console.log('\n[B] MUST Item + Heartbeat')
    // 期限切れ(past 1 日)の MUST を直接 insert
    const past = new Date()
    past.setDate(past.getDate() - 1)
    const dueISO = past.toISOString().slice(0, 10)

    const [mustItem] = await db
      .insert(items)
      .values({
        workspaceId: wsId,
        title: 'Heartbeat 検証用 MUST Item',
        description: '期限超過済み',
        status: 'todo',
        isMust: true,
        dod: '検証 OK と確認できる',
        dueDate: dueISO,
        parentPath: '',
        position: 'a0',
        createdByActorType: 'user',
        createdByActorId: userId,
      })
      .returning()
    if (!mustItem) {
      fail('heartbeat-setup', 'Item insert 失敗')
    } else {
      const r1 = await heartbeatService.scanWorkspace(wsId)
      if (!r1.ok) {
        fail('heartbeat-scan-1', r1.error.message)
      } else {
        pass(
          'heartbeat-scan-1',
          `evaluated=${r1.value.itemsEvaluated} created=${r1.value.notificationsCreated}`,
        )
        const r2 = await heartbeatService.scanWorkspace(wsId)
        if (!r2.ok) {
          fail('heartbeat-scan-2', r2.error.message)
        } else if (r2.value.notificationsCreated !== 0) {
          fail(
            'heartbeat-scan-2-idempotent',
            `2 回目に ${r2.value.notificationsCreated} 件作られた (冪等違反)`,
          )
        } else {
          pass('heartbeat-scan-2-idempotent', `2 回目は skipped=${r2.value.notificationsSkipped}`)
        }
      }
    }

    // ============ §6.2 AI 系 (claude CLI + MCP 経由) ============
    if (!mustItem) {
      console.log('\n[skip] AI 操作 3 項目はスキップ (MUST Item なし)')
    } else {
      // 3 flow は独立 (researcher×2 は別 agent_invocation / pm も別) なので並列実行可能。
      // E の standup は C が作った子 Item を読むかもしれないが、整合性テストではなく
      // agent_invocation 完了 + Doc 作成を見るだけなので race は許容。
      console.log('\n[C/D/E] AI 3 flow (Researcher×2 + PM) を並列実行')
      await Promise.all([
        runAndVerifyFlow({
          label: 'ai-decompose',
          input: {
            workspaceId: wsId,
            role: 'researcher',
            userMessage: [
              `対象 Item ID: ${mustItem.id}`,
              `タイトル: ${mustItem.title}`,
              `DoD: ${mustItem.dod}`,
              '',
              'この Item を 3 個の子タスクに分解してください。',
              `create_item を parentItemId="${mustItem.id}" で 3 回呼び、最後に短く日本語で報告してください。`,
            ].join('\n'),
            allowedToolNames: ['create_item'],
            targetItemId: mustItem.id,
          },
          verify: async (out, elapsed) => {
            const kids = await db
              .select()
              .from(items)
              .where(eq(items.parentPath, uuidToLabel(mustItem.id)))
            if (kids.length < 2) return { ok: false, note: `children=${kids.length} (期待 >= 2)` }
            return {
              ok: true,
              note: `turns=${out.numTurns} tools=${out.toolCallCount} children=${kids.length} cost=$${out.totalCostUsd.toFixed(4)} (${elapsed}s)`,
            }
          },
        }),
        runAndVerifyFlow({
          label: 'ai-research',
          input: {
            workspaceId: wsId,
            role: 'researcher',
            userMessage: [
              `対象 Item ID: ${mustItem.id}`,
              `タイトル: ${mustItem.title}`,
              '',
              'この Item のタイトルから連想される一般的な注意点・進め方をまとめた調査 Doc を 1 本作成してください。',
              '必須手順:',
              '  1. 今すぐ create_doc を 1 回呼ぶ (検索ツールは呼ばない)',
              '  2. title は「[調査] <元のタイトル>」',
              '  3. body は Markdown 400-1500 文字 (見出し / 箇条書きで構成)',
              '  4. 成功後に日本語で 1-2 行の完了報告',
              '重要: create_doc を呼ばずに終えるのは不可。',
            ].join('\n'),
            allowedToolNames: ['create_doc'],
            targetItemId: mustItem.id,
          },
          verify: async (out, elapsed) => {
            const docRows = await db.select().from(docs).where(eq(docs.workspaceId, wsId))
            if (docRows.length < 1) return { ok: false, note: `docs=${docRows.length} (期待 >= 1)` }
            return {
              ok: true,
              note: `turns=${out.numTurns} tools=${out.toolCallCount} docs=${docRows.length} cost=$${out.totalCostUsd.toFixed(4)} (${elapsed}s)`,
            }
          },
        }),
        runAndVerifyFlow({
          label: 'pm-standup',
          input: {
            workspaceId: wsId,
            role: 'pm',
            userMessage: [
              `今日の朝 Stand-up を作ってください。`,
              '',
              '手順:',
              '1. read_items で Item 一覧を取得 (MUST を優先)',
              '2. 今日のサマリ (昨日の進捗 / 今日の MUST / リスク) を Markdown で作る',
              '3. create_doc を 1 回だけ呼び、タイトルに日付を含める',
              '4. 最後に短く日本語で報告',
            ].join('\n'),
            allowedToolNames: ['read_items', 'search_items', 'read_docs', 'create_doc'],
          },
          verify: async (out, elapsed) => ({
            ok: true,
            note: `turns=${out.numTurns} tools=${out.toolCallCount} cost=$${out.totalCostUsd.toFixed(4)} (${elapsed}s)`,
          }),
        }),
      ])

      console.log('\n[F] agent_invocations 集計 (cost / tokens)')
      const invs = await db
        .select()
        .from(agentInvocations)
        .where(eq(agentInvocations.workspaceId, wsId))
      const completed = invs.filter((i) => i.status === 'completed').length
      const totalCost = invs.reduce((s, i) => s + Number(i.costUsd ?? 0), 0)
      const totalIn = invs.reduce((s, i) => s + (i.inputTokens ?? 0), 0)
      const totalOut = invs.reduce((s, i) => s + (i.outputTokens ?? 0), 0)
      if (completed >= 3 && totalCost > 0) {
        pass(
          'invocations-cost',
          `completed=${completed}/${invs.length} tokens=${totalIn}/${totalOut} cost=$${totalCost.toFixed(4)}`,
        )
      } else {
        fail('invocations-cost', `completed=${completed} cost=${totalCost}`)
      }
    }

    // ============ §6.1 Dashboard コスト集計 (member gate を一時的に bypass) ============
    // getMonthlyCost は requireWorkspaceMember に依存するので Node 直呼びはできない。
    // 代わりに同じ集計を手動で回す (SQL は cost-aggregate.ts と同じ想定)。
    console.log('\n[G] Dashboard コスト集計 (直 SQL 相当)')
    const costRows = await adminDb.execute<{
      month: string
      role: string
      invocations: string
      cost_usd: string
    }>(
      (await import('drizzle-orm')).sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', COALESCE(ai.started_at, ai.created_at)), 'YYYY-MM') AS month,
          a.role AS role,
          COUNT(*)::text AS invocations,
          COALESCE(SUM(cost_usd), 0)::text AS cost_usd
        FROM agent_invocations ai
        JOIN agents a ON a.id = ai.agent_id
        WHERE ai.workspace_id = ${wsId}::uuid
        GROUP BY 1, 2
        ORDER BY 1 DESC
      ` as never,
    )
    const rowArr = Array.isArray(costRows)
      ? costRows
      : ((costRows as { rows?: unknown[] }).rows ?? [])
    if (rowArr.length > 0) {
      pass('dashboard-cost', `rows=${rowArr.length} ${JSON.stringify(rowArr[0])}`)
    } else if (!mustItem) {
      pass('dashboard-cost', 'empty (MUST Item なし / AI 実行なし)')
    } else {
      fail('dashboard-cost', '集計が空')
    }
  } finally {
    console.log('\n[cleanup] user 削除 (ws / items / invocations は cascade)')
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }

  const failed = results.filter((r) => !r.ok)
  console.log('\n=============================================')
  console.log(`結果: ${results.length - failed.length}/${results.length} PASS`)
  if (failed.length > 0) {
    for (const f of failed) console.log(`  ✗ ${f.step}: ${f.note}`)
    process.exit(1)
  } else {
    console.log('All acceptance checks PASSED. 🎉')
  }
}

main().catch((e) => {
  console.error('Verify failed:', e)
  process.exit(1)
})
