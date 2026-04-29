/**
 * iter397 ai-automation: urgency-tier × backlog-aging combinator。
 *
 * 「actionable urgency (critical / high)」と「stale (>= 7 days)」の交差を
 * 取り出し、「対応すべき + 既に放置されている = 最高優先度の triage 候補」を
 * 1 関数で抽出。iter384 (`aged-hygiene-debt` = hygiene-debt × aging) と同
 * パターンの 2 軸交差 substrate。
 *
 * 単独 urgency-tier や単独 stale list より signal 強度が高い: urgent はあって
 * 当然 (例: P1 task は新規でも critical)、stale も backlog 全体には散見
 * (例: 古い P4 idea ticket)、しかし両方該当する = 深刻アラーム signal。
 *
 * caller benefits:
 *   - AI 朝 brief 「対応 + 古参 3 件 (緊急 1 / 高 2、最古 14 日)」を 1 関数で
 *   - pm-agent watch list の「最も停滞している urgent task」抽出
 *   - dashboard 専用 chip 候補 (次 iter で UI bind 予定)
 */

import { getItemAge, oldestAgeDaysOf } from './backlog-aging'
import { bucketByPriorityWith, formatPriorityBuckets, type PriorityKey } from './priority'
import { computeUrgency, type UrgencyFields, urgencyTierOf } from './urgency'

/** combinator が要求する Item の structural subset (urgency + createdAt)。 */
export type StaleUrgentFields = UrgencyFields & {
  createdAt: Date | string | null | undefined
}

export interface StaleUrgentOptions {
  /** 何日以上経過していたら stale 扱いか (default 7、backlog-aging の 'recent' 境界と同じ)。 */
  minAgeDays?: number
  /** 今日 (テスト用 inject、default = new Date())。 */
  today?: Date
}

/**
 * urgency tier ∈ {critical, high} かつ age >= minAgeDays の items を抽出。
 * 仕様:
 *   - 並び順: urgency score 降順、tie の場合 age 降順 (古い方を先)、さらに tie で元配列順 (stable)
 *   - createdAt 不正 (`unknown` 判定) は除外
 *   - done / archive (urgency=0 → tier='none') は自動的に除外
 *   - minAgeDays <= 0 は「stale 条件無効化 = critical/high の全件 actionable」
 */
export function pickStaleUrgentItems<T extends StaleUrgentFields>(
  items: readonly T[],
  options: StaleUrgentOptions = {},
): T[] {
  const { minAgeDays = 7, today = new Date() } = options
  const enriched: { it: T; score: number; age: number; idx: number }[] = []
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx]!
    const tier = urgencyTierOf(it, today)
    if (tier !== 'critical' && tier !== 'high') continue
    const { ageDays } = getItemAge(it.createdAt, today)
    if (ageDays === undefined || ageDays < minAgeDays) continue
    enriched.push({ it, score: computeUrgency(it, today), age: ageDays, idx })
  }
  enriched.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.age !== a.age) return b.age - a.age
    return a.idx - b.idx
  })
  return enriched.map((e) => e.it)
}

/**
 * AI brief / dashboard chip 用 1 行 summary。例:
 *   '対応 + 古参 3 件 (緊急 1 / 高 2、最古 14 日)' / 0 件で '対応 + 古参 0 件'。
 */
export function formatStaleUrgentJa<T extends StaleUrgentFields>(
  items: readonly T[],
  options: StaleUrgentOptions = {},
): string {
  const stale = pickStaleUrgentItems(items, options)
  if (stale.length === 0) return '対応 + 古参 0 件'
  const today = options.today ?? new Date()
  let critical = 0
  let high = 0
  for (const it of stale) {
    const tier = urgencyTierOf(it, today)
    if (tier === 'critical') critical += 1
    else if (tier === 'high') high += 1
  }
  const oldest = oldestAgeDaysOf(stale, today) ?? 0
  const parts: string[] = []
  if (critical > 0) parts.push(`緊急 ${critical}`)
  if (high > 0) parts.push(`高 ${high}`)
  return `対応 + 古参 ${stale.length} 件 (${parts.join(' / ')}、最古 ${oldest} 日)`
}

/** by-priority 集計の単 bucket 値: stale-urgent 件数 + 最古日数 (count=0 → null)。 */
export interface StaleUrgentByPriorityStats {
  count: number
  oldestDays: number | null
}

/**
 * iter399 ai-automation: stale-urgent items を priority 別に集計する pure helper。
 * iter382 hygiene-debt-by-priority / iter387 slip-days-by-priority / iter389
 * backlog-aging-by-priority と並ぶ「× priority」軸 8 弾目。
 *
 * 「P1 が一番 stale-urgent、最古 21 日 / P2 が次、最古 8 日」のように 高優先軸の
 * 停滞を分離して可視化、全体「対応 + 古参 5 件」だけでは見えない priority bias を
 * 露出。pickStaleUrgentItems の filter ロジックは bucketByPriorityWith 経由で
 * priority 別に再適用 (P1 のみ / P2 のみ ... の各 bucket 内で stale-urgent 抽出)。
 */
export function computeStaleUrgentByPriority<T extends StaleUrgentFields>(
  items: readonly T[],
  options: StaleUrgentOptions = {},
): Record<PriorityKey, StaleUrgentByPriorityStats> {
  const today = options.today ?? new Date()
  return bucketByPriorityWith(items, (group) => {
    const stale = pickStaleUrgentItems(group, options)
    if (stale.length === 0) return { count: 0, oldestDays: null }
    return { count: stale.length, oldestDays: oldestAgeDaysOf(stale, today) ?? 0 }
  })
}

/**
 * priority 別 stale-urgent を 1 行 summary に。例:
 *   'P1 2 件 (最古 14日) / P2 1 件 (最古 8日)' / count=0 の P は省略 / 全 P 0 → '対応 + 古参 0 件'
 */
export function formatStaleUrgentByPriorityJa(
  byPriority: Record<PriorityKey, StaleUrgentByPriorityStats>,
): string {
  return formatPriorityBuckets(
    byPriority,
    (k, s) =>
      s.count > 0 && s.oldestDays !== null ? `P${k} ${s.count} 件 (最古 ${s.oldestDays}日)` : null,
    '対応 + 古参 0 件',
  )
}
