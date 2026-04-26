/**
 * AI コスト月次上限 pre-flight チェック (Phase 6.9)。
 *
 *   - workspace_settings.monthly_cost_limit_usd が NULL なら無制限 (チェック skip)
 *   - 当月の agent_invocations の cost_usd 合計を集計
 *   - 上限超過なら BudgetExceededError を返す
 *   - cost_warn_threshold_ratio (default 0.8) を超えたら警告フラグを返す
 *     (呼び出し側が "limit の N% に到達" を notification として通知できる)
 *
 * Service 層の researcherService.run / pmService.run の冒頭で呼び出す想定。
 *
 * 集計クエリは getMonthlyCost と同じ手法 (agent_invocations × agents) だが、
 * pre-flight は workspace 全体 1 ヶ月分なので軽量に。
 */
import 'server-only'

import { sql } from 'drizzle-orm'

import { adminDb } from '@/lib/db/scoped-client'
import { BudgetExceededError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

export interface BudgetStatus {
  /** 当月のこれまでの累積コスト (USD) */
  spent: number
  /** 設定された上限 (USD)。NULL なら無制限 */
  limit: number | null
  /** 0..1 の比率 (limit==null なら 0) */
  ratio: number
  /** 警告閾値 (例: 0.8) */
  warnThreshold: number
  /** spent / limit が warnThreshold を超えているか (limit==null なら false) */
  warnTriggered: boolean
  /** spent >= limit (limit==null なら false) */
  exceeded: boolean
}

/**
 * 当月の累積コストと limit を取得する純粋集計関数。
 * 「当月」は UTC ベース (now() at time zone 'UTC' の月初〜)。TZ 別運用は POST_MVP。
 */
export async function getBudgetStatus(workspaceId: string): Promise<BudgetStatus> {
  const result = await adminDb.execute<{
    spent: string
    limit: string | null
    warn_threshold: string
  }>(sql`
    select
      coalesce(sum(i.cost_usd) filter (
        where i.created_at >= date_trunc('month', now() at time zone 'UTC')
          and i.status in ('completed', 'failed', 'cancelled')
      ), 0)::numeric as spent,
      ws.monthly_cost_limit_usd as limit,
      coalesce(ws.cost_warn_threshold_ratio, 0.80) as warn_threshold
    from public.workspaces w
    left join public.workspace_settings ws on ws.workspace_id = w.id
    left join public.agent_invocations i on i.workspace_id = w.id
    where w.id = ${workspaceId}::uuid
    group by ws.monthly_cost_limit_usd, ws.cost_warn_threshold_ratio
  `)
  const rows = result as unknown as Array<{
    spent: string
    limit: string | null
    warn_threshold: string
  }>
  const row = rows[0]
  const spent = Number(row?.spent ?? 0)
  const limit = row?.limit !== null && row?.limit !== undefined ? Number(row.limit) : null
  const warnThreshold = Number(row?.warn_threshold ?? 0.8)
  const ratio = limit && limit > 0 ? spent / limit : 0
  return {
    spent,
    limit,
    ratio,
    warnThreshold,
    warnTriggered: limit !== null && ratio >= warnThreshold,
    exceeded: limit !== null && spent >= limit,
  }
}

/**
 * Agent 起動前のゲート。limit 超過なら err を返す。
 * 戻り値の status は呼び出し側で warning 通知に使う。
 */
export async function checkBudget(workspaceId: string): Promise<Result<BudgetStatus>> {
  const s = await getBudgetStatus(workspaceId)
  if (s.exceeded) {
    return err(
      new BudgetExceededError(
        `AI コスト月次上限に達しています ($${s.spent.toFixed(2)} / $${(s.limit ?? 0).toFixed(2)})`,
      ),
    )
  }
  return ok(s)
}
