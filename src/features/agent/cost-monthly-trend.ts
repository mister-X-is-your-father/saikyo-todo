/**
 * iter332 ai-automation: AI invocation コストの月次推移を判定する pure helper。
 *
 * `cost-aggregate.ts` (`getMonthlyCost`) は workspace × month × role で集計した
 * `MonthlyCostRow[]` を返すが、UI / AI brief / pm-agent が「先月より +30%」「3 ヶ月
 * 連続で増加」「下げ止まり」のような前月比トレンドを欲しい時に毎回 inline 集計が
 * 必要だった (cost-actions.ts caller 側で reduce + 前月引き算)。
 *
 * iter319 `weekly-time-trend.ts` (時間: this week vs prior week) / iter269
 * `bias-trend.ts` (見積精度: 前後比較) と対称な「コスト: this month vs prior month」
 * substrate。AI 朝 brief / dashboard widget が 1 関数で取り出せるようにする。
 *
 * 仕様:
 *   - 入力 `entries`: `{ month: 'YYYY-MM', costUsd: number }[]`。同 month の重複は
 *     合算 (roll-up)。`getMonthlyCost` の戻り値 (`MonthlyCostRow[]`) は role 軸が
 *     残っているので `rollupCostByMonth` で先に sum してから渡すこと
 *   - 入力 `today`: 'YYYY-MM-DD' or 'YYYY-MM'。this month の判定基準
 *   - thisMonth = today の YYYY-MM、priorMonth = 1 ヶ月前の YYYY-MM
 *   - direction: this=prior=0 → 'idle' / |Δ%| < 5% → 'flat' / Δ>0 → 'up' / Δ<0 → 'down'
 *   - prior=0+this>0 → 'up' (deltaPct=null)、prior>0+this=0 → 'down'
 *
 * 不正値 (costUsd が NaN/負/Infinity) は 0 加算で fail-soft、不正 month
 * (`/^\d{4}-\d{2}$/` 不一致) は entry 除外、不正 today も entry 除外で idle 返す。
 */

import { rateToPct } from '@/lib/format-rate'

const ISO_MONTH_RE = /^\d{4}-\d{2}$/
const ISO_DATE_PREFIX_RE = /^\d{4}-\d{2}/

export interface CostMonthEntry {
  /** 'YYYY-MM' */
  month: string
  costUsd: number
}

export type CostMonthDirection = 'up' | 'down' | 'flat' | 'idle'

export interface MonthlyCostTrend {
  /** 'YYYY-MM' or null (today 不正時) */
  thisMonth: string | null
  thisMonthUsd: number
  /** 'YYYY-MM' or null */
  priorMonth: string | null
  priorMonthUsd: number
  /** 差 (this - prior)、USD */
  deltaUsd: number
  /** % 変化 (priorMonth=0 のとき null) */
  deltaPct: number | null
  direction: CostMonthDirection
}

const FLAT_THRESHOLD_PCT = 5

function safeUsd(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0
  return usd
}

/** 'YYYY-MM-DD' or 'YYYY-MM' から 'YYYY-MM' を抽出。形式不一致は null */
function todayToMonth(today: string): string | null {
  const m = today.match(ISO_DATE_PREFIX_RE)
  return m ? m[0] : null
}

/** 'YYYY-MM' を N ヶ月 shift。負値も可、UTC 計算で TZ shift 無関係。 */
function shiftMonth(iso: string, months: number): string {
  const [y, m] = iso.split('-').map(Number)
  const t = Date.UTC(y!, m! - 1 + months, 1)
  const out = new Date(t)
  const yyyy = out.getUTCFullYear()
  const mm = String(out.getUTCMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

/**
 * 同一 month の重複 entry (例: role 別 row) を合算。任意の `{month, costUsd, ...}`
 * を受け付ける structural subset。`MonthlyCostRow[]` (cost-aggregate.ts) を直接
 * 渡せる。
 */
export function rollupCostByMonth(
  rows: readonly { month: string; costUsd: number }[],
): CostMonthEntry[] {
  const totals = new Map<string, number>()
  for (const r of rows) {
    if (!ISO_MONTH_RE.test(r.month)) continue
    totals.set(r.month, (totals.get(r.month) ?? 0) + safeUsd(r.costUsd))
  }
  return Array.from(totals, ([month, costUsd]) => ({ month, costUsd })).sort((a, b) =>
    a.month < b.month ? 1 : -1,
  )
}

export function computeMonthlyCostTrend(
  entries: readonly CostMonthEntry[],
  today: string,
): MonthlyCostTrend {
  const thisMonth = todayToMonth(today)
  if (!thisMonth) {
    return {
      thisMonth: null,
      thisMonthUsd: 0,
      priorMonth: null,
      priorMonthUsd: 0,
      deltaUsd: 0,
      deltaPct: null,
      direction: 'idle',
    }
  }
  const priorMonth = shiftMonth(thisMonth, -1)

  let thisMonthUsd = 0
  let priorMonthUsd = 0
  for (const e of entries) {
    if (!ISO_MONTH_RE.test(e.month)) continue
    const usd = safeUsd(e.costUsd)
    if (e.month === thisMonth) thisMonthUsd += usd
    else if (e.month === priorMonth) priorMonthUsd += usd
  }

  const deltaUsd = thisMonthUsd - priorMonthUsd
  let deltaPct: number | null = null
  if (priorMonthUsd > 0) {
    deltaPct = rateToPct(deltaUsd / priorMonthUsd)
  }

  let direction: CostMonthDirection
  if (thisMonthUsd === 0 && priorMonthUsd === 0) {
    direction = 'idle'
  } else if (deltaPct !== null && Math.abs(deltaPct) < FLAT_THRESHOLD_PCT) {
    direction = 'flat'
  } else if (priorMonthUsd === 0) {
    direction = 'up' // 先月 0 → 今月 +α は up (deltaPct=null)
  } else if (thisMonthUsd === 0) {
    direction = 'down' // 先月あり → 今月 0 は down
  } else if (deltaUsd > 0) {
    direction = 'up'
  } else if (deltaUsd < 0) {
    direction = 'down'
  } else {
    direction = 'flat'
  }

  return {
    thisMonth,
    thisMonthUsd,
    priorMonth,
    priorMonthUsd,
    deltaUsd,
    deltaPct,
    direction,
  }
}

/** USD を `'$1.234'` (3 桁固定) / `'$0.01'` 形式に整形。$0 は `'$0.00'`。 */
function formatUsd(usd: number): string {
  const safe = Number.isFinite(usd) ? Math.max(0, usd) : 0
  // 1 USD 未満は 3 桁、それ以上は 2 桁 (人が読みやすく)
  const decimals = safe < 1 ? 3 : 2
  return `$${safe.toFixed(decimals)}`
}

/**
 * iter484 ai-automation: role 別 (pm / researcher) に this vs prior month trend を
 * 取り出す helper。既存の `computeMonthlyCostTrend` は workspace 全体集計の trend
 * を 1 個返すが、AI brief / dashboard widget で「PM agent は増加 / Researcher
 * agent は安定」のような **role 別 trend** を同時に出したい。
 *
 * 入力: `MonthlyCostRow` 互換 (`{ month, role, costUsd }` を持てば OK、cost-aggregate.ts
 * の `MonthlyCostRow` を直接渡せる structural subset)。出力: `Record<role,
 * MonthlyCostTrend>`、role 不在は zero entry trend (= idle / safe) で埋める。
 *
 * 仕様:
 *   - rows を role 別に partition、各 role の `{month, costUsd}` を `computeMonthlyCostTrend`
 *     に渡して trend を計算
 *   - role 'pm' / 'researcher' の両方が必ず key として存在 (= caller は undefined check
 *     不要)、entry 0 件 role は idle trend
 *   - `formatMonthlyCostTrendByRoleJa(trends)` で 1 行 ja-JP 文言:
 *       'AI コスト: PM 増加 (先月 $0.50 → 今月 $0.80、+$0.30 (+60%))・Researcher 安定'
 *     役割名 → 「PM」「Researcher」 (TIER_LABEL と同じ視覚短ラベル)
 */
export type AgentRole = 'pm' | 'researcher'

export type MonthlyCostTrendByRole = Record<AgentRole, MonthlyCostTrend>

const ROLE_LABEL_JA: Record<AgentRole, string> = {
  pm: 'PM',
  researcher: 'Researcher',
}

export function computeMonthlyCostTrendByRole(
  rows: readonly { month: string; role: string; costUsd: number }[],
  today: string,
): MonthlyCostTrendByRole {
  const roleEntries: Record<AgentRole, CostMonthEntry[]> = {
    pm: [],
    researcher: [],
  }
  for (const r of rows) {
    if (r.role === 'pm' || r.role === 'researcher') {
      if (!ISO_MONTH_RE.test(r.month)) continue
      roleEntries[r.role].push({ month: r.month, costUsd: safeUsd(r.costUsd) })
    }
  }
  return {
    pm: computeMonthlyCostTrend(roleEntries.pm, today),
    researcher: computeMonthlyCostTrend(roleEntries.researcher, today),
  }
}

/**
 * role 別 trend を 1 行 ja-JP 文言に整形 (chip / SR aria-label / AI brief 共通)。
 * 全 role idle → 'AI コスト: 先月今月とも記録なし'、それ以外 → role 別「方向 + 状態」 を中黒 (・) で連結。
 *  - up → 'PM 増加'
 *  - down → 'PM 減少'
 *  - flat → 'PM 安定'
 *  - idle → 'PM 記録なし'
 */
export function formatMonthlyCostTrendByRoleJa(trends: MonthlyCostTrendByRole): string {
  const allIdle = (Object.values(trends) as MonthlyCostTrend[]).every((t) => t.direction === 'idle')
  if (allIdle) return 'AI コスト: 先月今月とも記録なし'
  const parts: string[] = []
  for (const role of ['pm', 'researcher'] as const) {
    const t = trends[role]
    const label = ROLE_LABEL_JA[role]
    if (t.direction === 'idle') parts.push(`${label} 記録なし`)
    else if (t.direction === 'up') parts.push(`${label} 増加`)
    else if (t.direction === 'down') parts.push(`${label} 減少`)
    else parts.push(`${label} 安定`)
  }
  return `AI コスト: ${parts.join('・')}`
}

export function formatMonthlyCostTrendJa(trend: MonthlyCostTrend): string {
  if (trend.direction === 'idle') {
    return 'AI コスト: 先月今月とも記録なし'
  }
  const cur = formatUsd(trend.thisMonthUsd)
  const prev = formatUsd(trend.priorMonthUsd)
  const sign = trend.deltaUsd > 0 ? '+' : trend.deltaUsd < 0 ? '-' : ''
  const delta = formatUsd(Math.abs(trend.deltaUsd))
  const pctPart =
    trend.deltaPct === null ? '' : ` (${trend.deltaPct >= 0 ? '+' : ''}${trend.deltaPct}%)`
  if (trend.direction === 'flat') {
    return `AI コスト: 安定 (先月 ${prev} → 今月 ${cur})`
  }
  if (trend.direction === 'up') {
    return `AI コスト: 増加 (先月 ${prev} → 今月 ${cur}、${sign}${delta}${pctPart})`
  }
  return `AI コスト: 減少 (先月 ${prev} → 今月 ${cur}、-${delta}${pctPart})`
}
