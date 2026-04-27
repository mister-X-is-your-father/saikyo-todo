/**
 * Phase 6.15 iter121: Workflow webhook 受信 endpoint。
 *
 * POST /api/workflows/webhook/<secret>
 *   - body: 任意 JSON (workflow.input にそのまま渡る)
 *   - secret 一致 + workflow.enabled + trigger.kind='webhook' を確認
 *   - 認証不要 (secret が認証材料 — 漏洩しないこと)
 *   - sync 実行 → JSON で結果を返す
 *
 * セキュリティ:
 *   - secret は 8-128 文字 (zod schema で制限済)
 *   - URL に secret を入れるので HTTPS 前提 (Caddy で TLS 終端)
 *   - 1 secret = 1 workflow (workflows.trigger jsonb の中)
 *   - secret は workflow を作った人が知っている前提 (workspace member の knowledge)
 *
 * 制限:
 *   - body サイズは Next.js 既定 (1MB 強)
 *   - timeout は engine 各 node の合計 (~minutes 上限)
 *   - rate limit は無し (将来 supabase storage / redis で実装)
 */
import { type NextRequest, NextResponse } from 'next/server'

import { sql } from 'drizzle-orm'

import { workflows } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { runWorkflow } from '@/features/workflow/engine'

interface RouteParams {
  params: Promise<{ secret: string }>
}

export async function POST(req: NextRequest, ctx: RouteParams): Promise<NextResponse> {
  const { secret } = await ctx.params
  if (!secret || secret.length < 8 || secret.length > 128) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 400 })
  }

  // workflows.trigger->>'kind' = 'webhook' AND workflows.trigger->>'secret' = $secret
  // jsonb の path 経由で検索。secret は drizzle param なので injection 安全。
  const rows = await adminDb
    .select({ id: workflows.id, enabled: workflows.enabled, deletedAt: workflows.deletedAt })
    .from(workflows)
    .where(
      sql`${workflows.trigger}->>'kind' = 'webhook' and ${workflows.trigger}->>'secret' = ${secret}`,
    )
    .limit(1)
  const wf = rows[0]
  if (!wf || wf.deletedAt) {
    // secret 不一致でも 404 を返す (timing-safe ではないが、列挙攻撃は zod min-8 で抑制)
    return NextResponse.json({ error: 'workflow not found' }, { status: 404 })
  }
  if (!wf.enabled) {
    return NextResponse.json({ error: 'workflow disabled' }, { status: 409 })
  }

  let input: unknown = null
  if (req.headers.get('content-type')?.includes('application/json')) {
    try {
      input = await req.json()
    } catch {
      input = null
    }
  } else {
    const text = await req.text().catch(() => '')
    input = text || null
  }

  try {
    const r = await runWorkflow({ workflowId: wf.id, triggerKind: 'webhook', input })
    return NextResponse.json(
      {
        runId: r.runId,
        status: r.status,
        output: r.output,
        ...(r.error ? { error: r.error } : {}),
      },
      { status: r.status === 'succeeded' ? 200 : 500 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `engine error: ${msg}` }, { status: 500 })
  }
}

// GET / HEAD は許可しない (副作用あるので)
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'POST only — webhook endpoint' },
    { status: 405, headers: { Allow: 'POST' } },
  )
}
