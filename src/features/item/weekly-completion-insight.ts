/**
 * iter531 ai-automation (queue: fluffy-8 weekly→widget substrate): 週次完了 insight の
 * pure data substrate。
 *
 * fluffy 撲滅原則 (FEEDBACK_QUEUE.md META):
 *   - AI に retro 感想文を書かせない (= retro-service.ts の現状はそれ、low-information)
 *   - 完了件数 / 曜日別偏差 / 前週 delta を deterministic に出す
 *   - widget は本 helper の output を直接 render するだけ (fluffy 文章不要)
 *
 * 集計内容:
 *   - thisWeekTotal:  本週 (today から 7 日 window) の完了件数
 *   - priorWeekTotal: 前週 (今 7 日 window の前 7 日) の完了件数
 *   - deltaCount:     thisWeek - priorWeek
 *   - deltaPct:       priorWeek=0 → null、両 0 → 0、それ以外 round %
 *   - direction:      両 0 → 'idle' / |Δ%| < 5 → 'flat' / Δ > 0 → 'up' / Δ < 0 → 'down'
 *   - byDayOfWeek:    本週 7 日の曜日別 count (Mon-Sun = 0-6 で 0=月)
 *   - peakDow:        byDayOfWeek の最大 count 曜日 (count=0 → null)
 *   - troughDow:      byDayOfWeek の最小 count 曜日 (count=0 + 全曜日 0 → null、それ以外で最少 count の曜日)
 *
 * AI 不使用、副作用無し、依存は date/iso のみ。pure helper + Vitest 単体 test で網羅。
 *
 * 既存資産との関係:
 *   - `computeVelocity` (velocity.ts) は windowDays 任意、byDay 詳細を返す → 本 helper は
 *     2 週 + 曜日 集計 + Δ% に specialise (= dashboard widget 用に直接 bind 可)
 *   - `weekly-time-trend.ts` は時間 (= duration minutes)、本 helper は件数 (= done count)
 */
import { formatLocalISO, MS_PER_DAY, parseDateOrNull, toLocalMidnight } from '@/lib/date/iso'

export interface WeeklyCompletionItemFields {
  doneAt: Date | string | null | undefined
}

export type WeeklyCompletionDirection = 'up' | 'down' | 'flat' | 'idle'

/** 0=月 / 1=火 / ... / 6=日。formatTickerHeaderJa / dashboard chip aria-label と
 *  整合する Japanese 表記は別 helper (`dayOfWeekLabelJa`) で。 */
export type DayOfWeekJa = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface WeeklyCompletionInsight {
  thisWeekTotal: number
  priorWeekTotal: number
  deltaCount: number
  deltaPct: number | null
  direction: WeeklyCompletionDirection
  /** 月-日 7 曜日の count (= 本週 7 日の done 件数) */
  byDayOfWeek: Record<DayOfWeekJa, number>
  peakDow: DayOfWeekJa | null
  troughDow: DayOfWeekJa | null
}

const DOW_LABEL_JA: Record<DayOfWeekJa, string> = {
  0: '月',
  1: '火',
  2: '水',
  3: '木',
  4: '金',
  5: '土',
  6: '日',
}

export function dayOfWeekLabelJa(dow: DayOfWeekJa): string {
  return DOW_LABEL_JA[dow]
}

/** Date.getDay() (0=日, 1=月...) → DayOfWeekJa (0=月, ..., 6=日) 変換。 */
function toDowJa(d: Date): DayOfWeekJa {
  const js = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  return ((js + 6) % 7) as DayOfWeekJa
}

const EMPTY: WeeklyCompletionInsight = {
  thisWeekTotal: 0,
  priorWeekTotal: 0,
  deltaCount: 0,
  deltaPct: 0,
  direction: 'idle',
  byDayOfWeek: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  peakDow: null,
  troughDow: null,
}

export function buildWeeklyCompletionInsight<T extends WeeklyCompletionItemFields>(
  items: readonly T[],
  today: Date | string = new Date(),
): WeeklyCompletionInsight {
  const todayDate = toLocalMidnight(parseDateOrNull(today))
  if (!todayDate) return EMPTY

  // 本週 7 日 (today から 6 日前) と 前週 7 日 (7-13 日前) の境界
  const thisStart = todayDate.getTime() - 6 * MS_PER_DAY
  const thisEnd = todayDate.getTime() + MS_PER_DAY - 1 // today の 23:59:59 まで
  const priorStart = todayDate.getTime() - 13 * MS_PER_DAY
  const priorEnd = todayDate.getTime() - 7 * MS_PER_DAY - 1

  let thisWeekTotal = 0
  let priorWeekTotal = 0
  const byDayOfWeek: Record<DayOfWeekJa, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

  for (const it of items) {
    if (!it) continue
    const done = parseDateOrNull(it.doneAt)
    if (!done) continue
    const t = done.getTime()
    if (t >= thisStart && t <= thisEnd) {
      thisWeekTotal += 1
      const dow = toDowJa(done)
      byDayOfWeek[dow] += 1
    } else if (t >= priorStart && t <= priorEnd) {
      priorWeekTotal += 1
    }
  }

  const deltaCount = thisWeekTotal - priorWeekTotal
  const deltaPct: number | null =
    priorWeekTotal === 0
      ? thisWeekTotal === 0
        ? 0
        : null
      : Math.round((deltaCount / priorWeekTotal) * 100)

  let direction: WeeklyCompletionDirection
  if (thisWeekTotal === 0 && priorWeekTotal === 0) {
    direction = 'idle'
  } else if (deltaPct === null) {
    direction = 'up'
  } else if (Math.abs(deltaPct) < 5) {
    direction = 'flat'
  } else if (deltaPct > 0) {
    direction = 'up'
  } else {
    direction = 'down'
  }

  // peak / trough: 本週 byDayOfWeek の最大 / 最小 (全 0 なら null)
  let peakDow: DayOfWeekJa | null = null
  let troughDow: DayOfWeekJa | null = null
  if (thisWeekTotal > 0) {
    const allDows: DayOfWeekJa[] = [0, 1, 2, 3, 4, 5, 6]
    let maxV = -1
    let minV = Number.POSITIVE_INFINITY
    for (const dow of allDows) {
      const v = byDayOfWeek[dow]
      if (v > maxV) {
        maxV = v
        peakDow = dow
      }
      if (v < minV) {
        minV = v
        troughDow = dow
      }
    }
  }

  return {
    thisWeekTotal,
    priorWeekTotal,
    deltaCount,
    deltaPct,
    direction,
    byDayOfWeek,
    peakDow,
    troughDow,
  }
}

/**
 * AI prompt / chip aria-label / Slack 通知用 1 行 weekly insight summary:
 *   '今週 12 件 (前週比 +20% / ピーク水)'
 *   '今週 0 件 (前週比 -100%)'
 *   '今週 0 件 (前週比なし)'                  (= 両週 0)
 */
export function formatWeeklyCompletionInsightJa(insight: WeeklyCompletionInsight): string {
  const head = `今週 ${insight.thisWeekTotal} 件`
  if (insight.priorWeekTotal === 0 && insight.thisWeekTotal === 0) {
    return `${head} (前週比なし)`
  }
  const pct =
    insight.deltaPct === null ? '+∞%' : `${insight.deltaPct >= 0 ? '+' : ''}${insight.deltaPct}%`
  const peakPart =
    insight.peakDow !== null && insight.byDayOfWeek[insight.peakDow] > 0
      ? ` / ピーク${dayOfWeekLabelJa(insight.peakDow)}`
      : ''
  return `${head} (前週比 ${pct}${peakPart})`
}

// 使い回し: formatLocalISO は test の utility としても再利用したいので named export
export { formatLocalISO }
