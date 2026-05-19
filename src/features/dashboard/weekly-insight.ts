/**
 * iter531 (queue fluffy-8 weekly→widget substrate): Weekly Insight Dashboard widget の
 * pure data substrate。
 *
 * fluffy 撲滅原則 (FEEDBACK_QUEUE.md META):
 *   - AI に「今週の振り返り」 文章 (一般論 fluffy 高リスク) を書かせない
 *   - 完了 trend (line) / by-tag stacked / 偏差 detection を deterministic に出す
 *   - widget は本 helper の output を直接 render するだけ (chart は別 iter で)
 *
 * 入力:
 *   - items: 過去 14 日分 (= 今週 + 前週) の item (caller が period filter 済を渡す)
 *   - now: 「今」 (Date)、weekStart 計算基準
 *   - options.weekStartsOnMonday: 週の起点 (default true、月曜始まり)
 *
 * 出力:
 *   - byDay: 7 日 × 2 (currentWeek / prevWeek) の completion count、line chart 用
 *   - byTagCurrentWeek: tag id → count (stacked bar 用、tag 無し item は '__notag' に集約)
 *   - currentWeekTotal / prevWeekTotal: 週合計 done 件数
 *   - weekDelta: { count: curr - prev, percent: (curr/prev*100 - 100) round, prev=0→null }
 *   - anomalies: 1-3 件の data-driven 警告 / 集中日 highlight (純 algorithm、AI 不使用):
 *     - 'lowCompletionDay' (= 平均 0.5x 以下) / 'highCompletionDay' (= 平均 2x 以上、
 *       iter503) / 'overdueSpike' (= 期限超過 active 5 件以上)
 *
 * AI 不使用、副作用無し、依存なし。
 */

export interface WeeklyInsightItemFields {
  /** done 判定 */
  doneAt?: Date | string | null | undefined
  status?: string | null | undefined
  /** ISO YYYY-MM-DD or null。期限超過 anomaly 用 */
  dueDate?: string | null | undefined
  /** tag id 配列。空 / null なら __notag に集約 */
  tagIds?: readonly string[] | null | undefined
}

export interface WeeklyInsightSummary {
  /** 週起点 (current week 月曜) ISO YYYY-MM-DD */
  weekStart: string
  /** 1 つ前の週起点 ISO */
  prevWeekStart: string
  /**
   * 7 日 (Mon..Sun) ごとの完了件数。
   * line chart の data として直接使える形 ([{ day: 'Mon', current: N, prev: M }, ...]).
   */
  byDay: Array<{
    /** 'Mon'..'Sun' (英語短縮、UI で localize 可) */
    day: string
    /** 0..6 (Mon=0) */
    dayIndex: number
    current: number
    prev: number
  }>
  /** 今週 done item の tag 別件数。'__notag' = tag 無し集約 */
  byTagCurrentWeek: Record<string, number>
  currentWeekTotal: number
  prevWeekTotal: number
  /** prev=0 → percent=null (0 div 回避) */
  weekDelta: { count: number; percent: number | null }
  /** anomaly 1-2 件 (空配列もあり得る) */
  anomalies: Array<{
    kind: 'lowCompletionDay' | 'highCompletionDay' | 'overdueSpike'
    /** UI 表示用 1 行 説明 */
    message: string
  }>
}

export interface WeeklyInsightOptions {
  /** 週起点。default true (月曜始まり)、false で日曜始まり */
  weekStartsOnMonday?: boolean
}

import { formatUtcISO, parseDateOrNull } from '@/lib/date/iso'
import { rateToPct } from '@/lib/format-rate'
import { round1 } from '@/lib/round-decimal'

const DAY_LABELS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAY_LABELS_SUN_FIRST = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

// iter510 refactor: 手動 UTC 整形 → `lib/date/iso.ts#formatUtcISO` に集約 (39 弾目)。
// 既存 test が `dateToISODate` named import しているため public alias で re-export 維持。
const dateToISODate = formatUtcISO

/**
 * 週の起点 (Date、UTC midnight) を返す。
 * weekStartsOnMonday=true: 月曜 (= dayOfWeek 0 if iso、JavaScript getUTCDay 0=Sun → 6 days back if Sun)
 */
function weekStartUTC(now: Date, weekStartsOnMonday: boolean): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  )
  const dow = d.getUTCDay() // 0=Sun..6=Sat
  let offset = 0
  if (weekStartsOnMonday) {
    offset = dow === 0 ? 6 : dow - 1
  } else {
    offset = dow
  }
  d.setUTCDate(d.getUTCDate() - offset)
  return d
}

// iter490 refactor: parseDate 系の重複を `lib/date/iso.ts#parseDateOrNull` に集約 (38 弾目)
const parseDateLike = parseDateOrNull

/** 0..6 index (週起点が weekStartsOnMonday に従う) */
function dayIndexFromDate(d: Date, weekStartsOnMonday: boolean): number {
  const dow = d.getUTCDay()
  if (weekStartsOnMonday) return dow === 0 ? 6 : dow - 1
  return dow
}

export function buildWeeklyInsight(
  items: readonly WeeklyInsightItemFields[],
  now: Date = new Date(),
  options: WeeklyInsightOptions = {},
): WeeklyInsightSummary {
  const wsOnMon = options.weekStartsOnMonday ?? true
  const labels = wsOnMon ? DAY_LABELS_MON_FIRST : DAY_LABELS_SUN_FIRST

  const ws = weekStartUTC(now, wsOnMon)
  const prevWs = new Date(ws.getTime() - 7 * 24 * 60 * 60 * 1000)
  const nextWs = new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000)

  const byDayCurrent = new Array<number>(7).fill(0)
  const byDayPrev = new Array<number>(7).fill(0)
  const byTagCurrentWeek: Record<string, number> = {}

  for (const it of items) {
    const done = parseDateLike(it.doneAt)
    if (!done) continue
    if (done.getTime() < prevWs.getTime() || done.getTime() >= nextWs.getTime()) continue

    const idx = dayIndexFromDate(done, wsOnMon)
    if (done.getTime() >= ws.getTime()) {
      byDayCurrent[idx] = (byDayCurrent[idx] ?? 0) + 1
      // tag 集計 (今週分のみ)
      const tagIds = it.tagIds ?? []
      if (tagIds.length === 0) {
        byTagCurrentWeek['__notag'] = (byTagCurrentWeek['__notag'] ?? 0) + 1
      } else {
        for (const t of tagIds) {
          byTagCurrentWeek[t] = (byTagCurrentWeek[t] ?? 0) + 1
        }
      }
    } else {
      byDayPrev[idx] = (byDayPrev[idx] ?? 0) + 1
    }
  }

  const currentWeekTotal = byDayCurrent.reduce((a, b) => a + b, 0)
  const prevWeekTotal = byDayPrev.reduce((a, b) => a + b, 0)
  const weekDelta = {
    count: currentWeekTotal - prevWeekTotal,
    percent: prevWeekTotal === 0 ? null : rateToPct(currentWeekTotal / prevWeekTotal) - 100,
  }

  // anomaly 検出 (1-3 件、純 algorithm)
  const anomalies: WeeklyInsightSummary['anomalies'] = []
  // (1) 今週どこかの曜日で「平均の半分以下」
  if (currentWeekTotal >= 7) {
    // 統計的 noise 回避、最低 7 件以上で発動
    const avg = currentWeekTotal / 7
    for (let i = 0; i < 7; i++) {
      const c = byDayCurrent[i] ?? 0
      if (c <= avg * 0.5 && avg - c >= 1) {
        anomalies.push({
          kind: 'lowCompletionDay',
          message: `${labels[i]} の完了が ${c} 件 (週平均 ${round1(avg)})`,
        })
        break // 1 件で止める
      }
    }
  }
  // (1b) iter503 basics: 今週どこかの曜日で「平均の 2 倍以上」 (= 集中日、positive anomaly)
  // 同じ閾値ロジック (currentWeekTotal>=7) で activate、lowCompletion と同居 OK。
  if (currentWeekTotal >= 7) {
    const avg = currentWeekTotal / 7
    for (let i = 0; i < 7; i++) {
      const c = byDayCurrent[i] ?? 0
      if (c >= avg * 2 && c - avg >= 1) {
        anomalies.push({
          kind: 'highCompletionDay',
          message: `${labels[i]} に完了 ${c} 件 集中 (週平均 ${round1(avg)})`,
        })
        break
      }
    }
  }
  // (2) overdue spike: 今 active で dueDate < weekStart の数
  let overdueCount = 0
  for (const it of items) {
    if (it.status === 'done' || it.status === 'cancelled') continue
    if (it.doneAt) continue
    const due = parseDateLike(it.dueDate)
    if (!due) continue
    if (due.getTime() < ws.getTime()) overdueCount += 1
  }
  if (overdueCount >= 5) {
    anomalies.push({
      kind: 'overdueSpike',
      message: `期限超過 active item が ${overdueCount} 件 (要救済)`,
    })
  }

  return {
    weekStart: dateToISODate(ws),
    prevWeekStart: dateToISODate(prevWs),
    byDay: labels.map((day, dayIndex) => ({
      day,
      dayIndex,
      current: byDayCurrent[dayIndex] ?? 0,
      prev: byDayPrev[dayIndex] ?? 0,
    })),
    byTagCurrentWeek,
    currentWeekTotal,
    prevWeekTotal,
    weekDelta,
    anomalies,
  }
}

// 内部 helper を test しやすく named export
export { dateToISODate, dayIndexFromDate, weekStartUTC }

/**
 * iter483 basics: WeeklyInsight の 4 状態 hint 分類 (= velocity-hint / blocked-items-hint /
 * at-risk-parents-hint と同 shape の `FourStateHint` シリーズ)。
 *
 * - 'idle'     : 今週/前週とも 0 件 (=活動なし)
 * - 'severe'   : overdueSpike anomaly 検出 (= 期限超過 active 5 件以上)
 * - 'moderate' : lowCompletionDay anomaly あり OR weekDelta が -30% 以下
 * - 'mild'     : それ以外 (= 健常範囲)
 *
 * 用途: WeeklyInsightWidget aria-label / chip に 1 単語 state を埋める、Slack 通知の見出し。
 */
import { type FourStateHint, makeHintLabelFormatter } from '@/lib/hint'

export type WeeklyInsightHint = FourStateHint

export function classifyWeeklyInsightHint(
  insight: Pick<
    WeeklyInsightSummary,
    'currentWeekTotal' | 'prevWeekTotal' | 'anomalies' | 'weekDelta'
  >,
): WeeklyInsightHint {
  if (insight.currentWeekTotal === 0 && insight.prevWeekTotal === 0) return 'idle'
  const hasOverdueSpike = insight.anomalies.some((a) => a.kind === 'overdueSpike')
  if (hasOverdueSpike) return 'severe'
  const hasLowDay = insight.anomalies.some((a) => a.kind === 'lowCompletionDay')
  const sharpDrop = insight.weekDelta.percent !== null && insight.weekDelta.percent <= -30
  if (hasLowDay || sharpDrop) return 'moderate'
  return 'mild'
}

const WEEKLY_INSIGHT_HINT_LABEL_JA: Record<WeeklyInsightHint, string> = {
  idle: '活動なし',
  mild: '健常',
  moderate: '注意',
  severe: '異常',
}

export const formatWeeklyInsightHintJa = makeHintLabelFormatter(
  classifyWeeklyInsightHint,
  WEEKLY_INSIGHT_HINT_LABEL_JA,
)

/**
 * iter481 basics: 今週の best day (= 完了 max の曜日) を抽出。
 *
 * - 今週合計 0 件 → null (chip 非表示で noise 削減)
 * - 同点 (= 同 max 件数) なら早い曜日 (週起点に近い方) を採用
 *
 * 用途: WeeklyInsightWidget header の小 chip 「今週 ベスト: Mon (4 件)」
 */
export function pickBestDayInWeek(
  insight: Pick<WeeklyInsightSummary, 'byDay' | 'currentWeekTotal'>,
): { day: string; dayIndex: number; current: number } | null {
  if (insight.currentWeekTotal === 0) return null
  let best: { day: string; dayIndex: number; current: number } | null = null
  for (const d of insight.byDay) {
    if (d.current === 0) continue
    if (best === null || d.current > best.current) {
      best = { day: d.day, dayIndex: d.dayIndex, current: d.current }
    }
    // 同点は早い曜日採用 (= 既存 best を保持、上書きしない)
  }
  return best
}

/**
 * iter481 basics: pickBestDayInWeek の出力を 1 行 ja 文に整形。
 *
 * null → '今週 完了なし' (chip 文言で 0 件状態も表現)、それ以外 → '今週 ベスト: <day> <n> 件'
 */
export function formatBestDayJa(best: { day: string; current: number } | null): string {
  if (best === null) return '今週 完了なし'
  return `今週 ベスト: ${best.day} ${best.current} 件`
}

/**
 * iter508 basics: 今週の worst day (= 完了 0 / 最少 件数の曜日) を抽出。pickBestDayInWeek
 * の対称 helper。0 件の日があればそれを返す (= サボった day を highlight)、全 day 1+
 * なら min 件数の day。
 *
 * - 今週合計 0 件 → null (chip 非表示)
 * - 同点 (= 同 min 件数) は早い曜日 (週起点に近い方) を採用 (= deterministic + 動機付け)
 *
 * 用途: WeeklyInsightWidget で「サボった day」 を amber chip で能動表示、
 * lowCompletionDay anomaly が発動しない範囲 (合計<7) でも weakness を見せる。
 */
export function pickWorstDayInWeek(
  insight: Pick<WeeklyInsightSummary, 'byDay' | 'currentWeekTotal'>,
): { day: string; dayIndex: number; current: number } | null {
  if (insight.currentWeekTotal === 0) return null
  let worst: { day: string; dayIndex: number; current: number } | null = null
  for (const d of insight.byDay) {
    if (worst === null || d.current < worst.current) {
      worst = { day: d.day, dayIndex: d.dayIndex, current: d.current }
    }
    // 同点は早い曜日 (= 既存 worst を keep)
  }
  return worst
}

/**
 * iter508 basics: pickWorstDayInWeek の出力を chip 文言に整形。
 *   '今週 サボり: <day> 0 件'
 *   '今週 弱点: <day> 1 件'
 *   '今週 完了なし'  (null)
 *
 * 0 件は 'サボり' で能動的に警告、1+ 件は 'min day' で軽い注意。
 */
export function formatWorstDayJa(worst: { day: string; current: number } | null): string {
  if (worst === null) return '今週 完了なし'
  if (worst.current === 0) return `今週 サボり: ${worst.day} 0 件`
  return `今週 弱点: ${worst.day} ${worst.current} 件`
}
