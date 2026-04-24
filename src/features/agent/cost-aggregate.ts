/**
 * AI コスト集計: agent_invocations から workspace × YYYY-MM で cost/tokens を集計。
 * REQUIREMENTS §受け入れ基準 "AI コスト追跡: workspace 月次集計" を満たす。
 *
 * UI 側は Dashboard に組み込むか、dedicated admin ページに置く想定 (post-MVP)。
 * API は Server Action 経由で member 以上が叩ける。
 */
import 'server-only'

import { sql } from 'drizzle-orm'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

export interface MonthlyCostRow {
  month: string // 'YYYY-MM'
  role: 'pm' | 'researcher'
  invocations: number
  completed: number
  failed: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  costUsd: number
}

/** 直近 N ヶ月の workspace 集計 (month 新しい順)。 */
export async function getMonthlyCost(
  workspaceId: string,
  months = 12,
): Promise<Result<MonthlyCostRow[]>> {
  if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
  const { user } = await requireWorkspaceMember(workspaceId, 'viewer')

  const rows = await withUserDb(user.id, async (tx) => {
    return await tx.execute<{
      month: string
      role: string
      invocations: string
      completed: string
      failed: string
      input_tokens: string
      output_tokens: string
      cache_creation_tokens: string
      cache_read_tokens: string
      cost_usd: string
    }>(sql`
      select
        to_char(i.created_at at time zone 'UTC', 'YYYY-MM') as month,
        a.role,
        count(*)::bigint                     as invocations,
        count(*) filter (where i.status = 'completed')::bigint as completed,
        count(*) filter (where i.status = 'failed')::bigint    as failed,
        coalesce(sum(i.input_tokens), 0)::bigint               as input_tokens,
        coalesce(sum(i.output_tokens), 0)::bigint              as output_tokens,
        coalesce(sum(i.cache_creation_tokens), 0)::bigint      as cache_creation_tokens,
        coalesce(sum(i.cache_read_tokens), 0)::bigint          as cache_read_tokens,
        coalesce(sum(i.cost_usd), 0)::numeric                  as cost_usd
      from public.agent_invocations i
      join public.agents a on a.id = i.agent_id
      where a.workspace_id = ${workspaceId}::uuid
        and i.created_at >= (now() - (${months} || ' months')::interval)
      group by 1, 2
      order by 1 desc, 2
    `)
  })

  const list = (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    month: String(r.month),
    role: (String(r.role) === 'pm' ? 'pm' : 'researcher') as 'pm' | 'researcher',
    invocations: Number(r.invocations),
    completed: Number(r.completed),
    failed: Number(r.failed),
    inputTokens: Number(r.input_tokens),
    outputTokens: Number(r.output_tokens),
    cacheCreationTokens: Number(r.cache_creation_tokens),
    cacheReadTokens: Number(r.cache_read_tokens),
    costUsd: Number(r.cost_usd),
  }))
  return ok(list)
}
