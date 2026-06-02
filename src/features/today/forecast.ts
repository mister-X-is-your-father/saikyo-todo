/**
 * iter532 (queue fluffy-7 brief→algorithm 完結 substrate): 今日の完了予測 +
 * 集中時間ブロック提案 の pure data substrate。
 *
 * fluffy 撲滅原則 (FEEDBACK_QUEUE.md META):
 *   - AI が「今日のおすすめ順 / 終わるかどうか」 文章を書くのを置換
 *   - 累積 estimate vs 残時間 = deterministic な完了予測
 *   - estimate≤30min は quick wins、≥90min は集中ブロック (= 1 つに集中、interruption 防止)
 *   - operation-board.ts の Eisenhower score (iter521) と分業: 本 helper は「総量 + 配分」
 *
 * 入力:
 *   - items: 今日対象 active item (caller が filter 済を渡す)、各 item に estimateMin
 *   - now: 現在時刻 (Date)
 *   - workdayEndsAt: 業務終了時刻 (HH:MM、default '18:00')
 *
 * 出力:
 *   - totalEstimateMin / remainingMinutesUntilEnd / canFinishToday (boolean) /
 *     overflowMin (negative if can finish, positive if not)
 *   - quickWins: estimate≤30min の item top 5 (sort: priority → MUST → estimate 短い順)
 *   - focusBlocks: estimate≥90min の item (sort: priority → MUST、推奨 1-2 件)
 *
 * AI 不使用、副作用無し、依存無し。
 */

import type { Severity } from '@/lib/widget/severity'
import { aggregateCountsBySeverity } from '@/lib/widget/severity-bridges'

export interface ForecastItemFields {
  id: string
  title: string
  /** null/undefined/負値 = 未推定 (集計に含まない) */
  estimateMin?: number | null | undefined
  isMust?: boolean | null | undefined
  /** 1=最高、4=最低。null/undefined → 4 */
  priority?: number | null | undefined
}

export interface ForecastSummary<T extends ForecastItemFields> {
  /** 全 item の estimate 合計 (estimate 無し は除外) */
  totalEstimateMin: number
  /** estimate 不明 件数 (UI 警告用) */
  estimateUnknownCount: number
  /** now から workday 終了までの残分 */
  remainingMinutesUntilEnd: number
  /** total <= remaining なら true */
  canFinishToday: boolean
  /** total - remaining。負 = 余裕、正 = 終わらない (= 何分超過するか) */
  overflowMin: number
  /** estimate ≤ 30min の item top 5 (quick wins、sort: priority asc → MUST 優先 → estimate 短い順) */
  quickWins: T[]
  /** estimate ≥ 90min の item (集中ブロック候補、sort: priority asc → MUST 優先) */
  focusBlocks: T[]
}

export interface ForecastOptions {
  /** 業務終了時刻 (HH:MM, 24h)、default '18:00' */
  workdayEndsAt?: string
  /** quick wins の最大件数 (default 5) */
  quickWinsTopN?: number
  /** focus blocks の最大件数 (default 2) */
  focusBlocksTopN?: number
}

const QUICK_WIN_MAX_MIN = 30
const FOCUS_BLOCK_MIN_MIN = 90

function parseHHMM(hhmm: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(hhmm)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return { h, m: min }
}

function minutesUntilEndOfDay(now: Date, hhmm: string): number {
  const t = parseHHMM(hhmm) ?? { h: 18, m: 0 }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), t.h, t.m, 0, 0)
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000))
}

function priorityOrMax(p: number | null | undefined): number {
  return typeof p === 'number' ? p : 4
}

export function buildTodayForecast<T extends ForecastItemFields>(
  items: readonly T[],
  now: Date = new Date(),
  options: ForecastOptions = {},
): ForecastSummary<T> {
  const wEnd = options.workdayEndsAt ?? '18:00'
  const quickWinsTopN = options.quickWinsTopN ?? 5
  const focusBlocksTopN = options.focusBlocksTopN ?? 2

  let totalEstimateMin = 0
  let estimateUnknownCount = 0
  const quickCandidates: T[] = []
  const focusCandidates: T[] = []

  for (const it of items) {
    const est = typeof it.estimateMin === 'number' && it.estimateMin >= 0 ? it.estimateMin : null
    if (est === null) {
      estimateUnknownCount += 1
      continue
    }
    totalEstimateMin += est
    if (est <= QUICK_WIN_MAX_MIN) quickCandidates.push(it)
    if (est >= FOCUS_BLOCK_MIN_MIN) focusCandidates.push(it)
  }

  const remainingMinutesUntilEnd = minutesUntilEndOfDay(now, wEnd)
  const overflowMin = totalEstimateMin - remainingMinutesUntilEnd
  const canFinishToday = overflowMin <= 0

  // sort: priority asc → MUST 優先 → estimate 短い順
  quickCandidates.sort((a, b) => {
    const pa = priorityOrMax(a.priority)
    const pb = priorityOrMax(b.priority)
    if (pa !== pb) return pa - pb
    if (a.isMust !== b.isMust) return a.isMust ? -1 : 1
    const ea = typeof a.estimateMin === 'number' ? a.estimateMin : Number.MAX_SAFE_INTEGER
    const eb = typeof b.estimateMin === 'number' ? b.estimateMin : Number.MAX_SAFE_INTEGER
    return ea - eb
  })

  // focus blocks: priority asc → MUST 優先 (estimate 大きい順は副次)
  focusCandidates.sort((a, b) => {
    const pa = priorityOrMax(a.priority)
    const pb = priorityOrMax(b.priority)
    if (pa !== pb) return pa - pb
    if (a.isMust !== b.isMust) return a.isMust ? -1 : 1
    const ea = typeof a.estimateMin === 'number' ? a.estimateMin : 0
    const eb = typeof b.estimateMin === 'number' ? b.estimateMin : 0
    return eb - ea
  })

  return {
    totalEstimateMin,
    estimateUnknownCount,
    remainingMinutesUntilEnd,
    canFinishToday,
    overflowMin,
    quickWins: quickCandidates.slice(0, quickWinsTopN),
    focusBlocks: focusCandidates.slice(0, focusBlocksTopN),
  }
}

/**
 * iter536 ai-automation polish: forecast の severity (= 「終わるかどうか」軸 4 段) を
 * SeverityChip tone bind 用に分類する pure helper。
 *
 * 閾値:
 *  - 'ok'      : canFinishToday=true (= 余裕あり、overflowMin <= 0)
 *  - 'info'    : overflowMin <= 30 (= 30 分以内のはみ出し、軽微)
 *  - 'warn'    : overflowMin <= 120 (= 2 時間以内のはみ出し、注意)
 *  - 'danger'  : overflowMin > 120 (= 2 時間超過、明らかに無理)
 */
export type ForecastSeverity = 'ok' | 'info' | 'warn' | 'danger'

export function forecastSeverity<T extends ForecastItemFields>(
  summary: ForecastSummary<T>,
): ForecastSeverity {
  if (summary.canFinishToday) return 'ok'
  if (summary.overflowMin <= 30) return 'info'
  if (summary.overflowMin <= 120) return 'warn'
  return 'danger'
}

const SEVERITY_LABEL_JA: Record<ForecastSeverity, string> = {
  ok: '余裕',
  info: '少しはみ出し',
  warn: '要 トリアージ',
  danger: '明らかに過剰',
}

export function forecastSeverityLabelJa(sev: ForecastSeverity): string {
  return SEVERITY_LABEL_JA[sev]
}

/**
 * iter544 ai-automation: `Record<ForecastSeverity, number>` (forecast 4 段別件数) を
 * 共通 5 段 Severity counts に集約する pure helper。
 *
 * iter533-543 と同 pattern (= 12 ドメイン目)。`ForecastSeverity` 自体が 5 段共通
 * Severity の subset (`'ok' | 'info' | 'warn' | 'danger'` で muted 不在) なので
 * bridge は identity copy + muted 0 padding で済むが、caller が「counts 系 bridge を
 * 1 関数で呼べる」 統一 API のために用意。
 *
 * 例: workspace 内の各 person 別 / 日別 / sprint 別 forecast を集計して 1 行 summary
 * で「危険 1 / 注意 2 / 情報 3 / OK 4 (合計 10)」 と出せる。
 */
// iter1692 refactor: iter1430 で extract した汎用 `aggregateCountsBySeverity` に委譲。
// iter1687-1691 (due-proximity / goal-health / bias / recovery-plan / ai-assignee) に続く
// 外部 file 追従 7 件目。ForecastSeverity ('ok'|'info'|'warn'|'danger') が共通 Severity の
// subset (muted 不在) なので identity mapping `(k) => k`、muted bucket は 0 padding される。
// inline tuple type `'ok'|...` を共通 `Severity` 型に統一。
export function forecastSeverityCountsToSeverityCounts(
  counts: Record<ForecastSeverity, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, (k) => k)
}

/**
 * 1 行 forecast summary (AI prompt / chip aria-label / Slack 通知用):
 *   '余裕 (合計 4h / 残 8h)'
 *   '要 トリアージ (合計 6h / 残 4h、超過 2h)'
 *   '余裕 (合計 0m、3 件 見積なし)'
 *
 * remainingMinutesUntilEnd = 0 (= 業務終了済) でも total > 0 なら超過扱い。
 */
export function formatTodayForecastJa<T extends ForecastItemFields>(
  summary: ForecastSummary<T>,
): string {
  const sev = forecastSeverity(summary)
  const label = forecastSeverityLabelJa(sev)
  const totalH = (summary.totalEstimateMin / 60).toFixed(1).replace(/\.0$/, '')
  const remH = (summary.remainingMinutesUntilEnd / 60).toFixed(1).replace(/\.0$/, '')
  const overH =
    summary.overflowMin > 0
      ? `、超過 ${(summary.overflowMin / 60).toFixed(1).replace(/\.0$/, '')}h`
      : ''
  const unknown =
    summary.estimateUnknownCount > 0 ? `、${summary.estimateUnknownCount} 件 見積なし` : ''
  return `${label} (合計 ${totalH}h / 残 ${remH}h${overH}${unknown})`
}

// 内部 helper を test しやすく named export
export { minutesUntilEndOfDay, parseHHMM }
