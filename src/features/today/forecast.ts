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

// 内部 helper を test しやすく named export
export { minutesUntilEndOfDay, parseHHMM }
