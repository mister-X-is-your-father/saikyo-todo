/**
 * iter790 refactor: analytics 系 helper (`agent-reliability.ts` / `cost-monthly-trend.ts`)
 * が共有する narrowed AgentRole 型 + ja-JP label を 1 箇所に集約。
 *
 * 設計判断:
 *  - schema.ts の `AGENT_ROLES` は MVP 全 4 role (pm / researcher / engineer / reviewer)
 *    を含むが、analytics 系 (cost / reliability) は **計測対象 = pm / researcher** のみ
 *    (engineer / reviewer は POST_MVP)。narrowed 'AnalyticsAgentRole' で表現することで、
 *    Record<AnalyticsAgentRole, X> exhaustive type check が効く
 *  - 旧 agent-reliability.ts / cost-monthly-trend.ts はそれぞれ局所的に
 *    `type AgentRole = 'pm' | 'researcher'` と `ROLE_LABEL_JA = { pm: 'PM', researcher: 'Researcher' }`
 *    を **重複定義** していた。本モジュールで 1 箇所に集約 (= label vocabulary が
 *    将来「PM Bot」「Researcher Agent」 のような変更要望が来ても 1 箇所修正で済む)
 *  - 後方互換: agent-reliability.ts / cost-monthly-trend.ts の `export type AgentRole`
 *    は本モジュール re-export で維持
 *
 * cost や reliability 以外で「pm + researcher 限定」 role を扱う module が増えたら
 * 本モジュールから直接 import する。POST_MVP で engineer / reviewer も計測対象に
 * 入る場合は、ANALYTICS_AGENT_ROLES に追記 + 各 caller の Record を更新で対応。
 */

export const ANALYTICS_AGENT_ROLES = ['pm', 'researcher'] as const

export type AnalyticsAgentRole = (typeof ANALYTICS_AGENT_ROLES)[number]

const ROLE_LABEL_JA: Record<AnalyticsAgentRole, string> = {
  pm: 'PM',
  researcher: 'Researcher',
}

/** Analytics 系 role の ja-JP 短ラベル ('PM' / 'Researcher')。chip / aria-label 共通。 */
export function analyticsRoleLabelJa(role: AnalyticsAgentRole): string {
  return ROLE_LABEL_JA[role]
}
