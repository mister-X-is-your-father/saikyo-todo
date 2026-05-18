/**
 * iter521 (queue P0-1 fluffy → widget): 「今日の作戦盤」 widget の pure 集計関数。
 *
 * 設計方針 (FEEDBACK_QUEUE.md fluffy 撲滅原則):
 *   - AI 不使用 (= 純 algorithm 計算、deterministic)
 *   - 「見て即わかる」 構造化 data を返す (UI 側は描画するだけ)
 *   - 既存 PM Stand-up (AI 文章) を置き換える substrate
 *
 * 集計内容 (P0-1 spec):
 *   - 昨日 done: 昨日完了した item の件数 + list
 *   - 今日の MUST: isMust=true & (scheduledFor=today | dueDate=today)、件数 + 期日近接順
 *   - overdue: dueDate < today で active な item、件数 + top 3
 *   - 今日 scheduled / due-today: 時刻順
 *   - 推奨第 1 タスク: Eisenhower 風 (urgent × important × short-time) で 1 件
 *
 * 副作用なし、依存は Item type のみ。Vitest 単体 test で網羅。
 */
import { extractEstimateMinutes } from '@/features/item/estimate'
import type { Item } from '@/features/item/schema'

export interface OperationBoardSummary {
  /** 昨日 done になった item (件数 = items.length) */
  doneYesterday: { items: Item[]; count: number }
  /** 今日の MUST (scheduledFor=today or dueDate=today、isMust=true) */
  mustToday: { items: Item[]; count: number }
  /** dueDate < today で完了/archive されてない item、危険な順 (古い超過順) top 3 + total */
  overdue: { top3: Item[]; total: number }
  /** scheduledFor=today もしくは dueDate=today、時刻昇順 */
  todayScheduled: { items: Item[]; count: number }
  /** 推奨第 1 タスク (= Eisenhower 風 score 最高、null = 候補無し) */
  recommended: Item | null
  /** 集計時の today YYYY-MM-DD (debug / cache key 用) */
  today: string
}

/**
 * iter610 refactor: item の「active」 判定 (doneAt / archivedAt / deletedAt が
 * 全て null) を共通 helper として export。automation-part/parts/item.ts の
 * itemListTodayPart / itemListOverduePart からも参照される (= 「active item」
 * の semantics を 1 箇所に固定)。
 */
export function isItemActive(it: Item): boolean {
  return !it.doneAt && !it.archivedAt && !it.deletedAt
}

function dayOffsetISO(today: string, offset: number): string {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

function dueTimeMinutes(dueTime: string | null | undefined): number {
  if (!dueTime) return 24 * 60 // 時刻無しは末尾
  const m = /^(\d{1,2}):(\d{1,2})/.exec(dueTime)
  if (!m) return 24 * 60
  const h = Number(m[1])
  const min = Number(m[2])
  return h * 60 + min
}

/**
 * Eisenhower 風 score (高いほど推奨):
 *   urgency = dueDate 近接度 (today=10, tomorrow=6, thisWeek=2, none=0, overdue=15)
 *   importance = isMust ? 10 : (5 - priority) * 2  (priority 1→8, 4→2)
 *   shortBonus = description の `見積: <duration>` が 30 分以下なら +3 (素早く片付くもの優先)
 * 合計 score、tie は createdAt 古い順。
 *
 * iter942 ai-automation: 旧 docstring が「shortBonus +3」を約束しているのに本体未実装の
 * drift を解消 (extractEstimateMinutes で description プレフィクスを parse、≤30 min で +3)。
 * estimate 不明な item は score 変化なし (= 旧 behavior 互換)。
 */
function eisenhowerScore(it: Item, today: string): number {
  let urgency = 0
  if (it.dueDate) {
    if (it.dueDate < today) urgency = 15
    else if (it.dueDate === today) urgency = 10
    else if (it.dueDate === dayOffsetISO(today, 1)) urgency = 6
    else if (it.dueDate <= dayOffsetISO(today, 7)) urgency = 2
  }
  if (it.scheduledFor === today) urgency = Math.max(urgency, 10)

  const importance = it.isMust ? 10 : Math.max(2, (5 - it.priority) * 2)

  const estimate = extractEstimateMinutes(it.description)
  const shortBonus = estimate !== undefined && estimate <= 30 ? 3 : 0

  return urgency + importance + shortBonus
}

export function buildOperationBoard(items: Item[], today: string): OperationBoardSummary {
  const yesterday = dayOffsetISO(today, -1)

  // ----- 昨日 done -----
  const doneYesterdayItems = items
    .filter((it) => {
      if (!it.doneAt) return false
      const d = it.doneAt instanceof Date ? it.doneAt : new Date(it.doneAt)
      return d.toISOString().slice(0, 10) === yesterday
    })
    .sort((a, b) => {
      const ad = a.doneAt instanceof Date ? a.doneAt : new Date(a.doneAt!)
      const bd = b.doneAt instanceof Date ? b.doneAt : new Date(b.doneAt!)
      return bd.getTime() - ad.getTime()
    })

  // ----- active 集合 -----
  const active = items.filter(isItemActive)

  // ----- 今日の MUST -----
  const mustTodayItems = active
    .filter((it) => it.isMust && (it.scheduledFor === today || it.dueDate === today))
    .sort((a, b) => {
      // dueDate 同 today、dueTime 昇順 → priority 昇順
      const at = dueTimeMinutes(a.dueTime)
      const bt = dueTimeMinutes(b.dueTime)
      if (at !== bt) return at - bt
      return a.priority - b.priority
    })

  // ----- overdue -----
  const overdueItems = active
    .filter((it) => it.dueDate !== null && it.dueDate < today)
    .sort((a, b) => {
      // 古い超過 (= dueDate 小さい) を先に
      if (a.dueDate! !== b.dueDate!) return a.dueDate!.localeCompare(b.dueDate!)
      return a.priority - b.priority
    })

  // ----- 今日 scheduled / due-today -----
  const todayScheduledItems = active
    .filter((it) => it.scheduledFor === today || it.dueDate === today)
    .sort((a, b) => {
      const at = dueTimeMinutes(a.dueTime)
      const bt = dueTimeMinutes(b.dueTime)
      if (at !== bt) return at - bt
      // tie: MUST を先、priority、createdAt
      if (a.isMust !== b.isMust) return a.isMust ? -1 : 1
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

  // ----- 推奨第 1 -----
  const candidates = active.filter(
    (it) =>
      it.scheduledFor === today ||
      it.dueDate === today ||
      (it.dueDate !== null && it.dueDate < today),
  )
  let recommended: Item | null = null
  let bestScore = -Infinity
  for (const it of candidates) {
    const s = eisenhowerScore(it, today)
    if (s > bestScore) {
      bestScore = s
      recommended = it
    } else if (s === bestScore && recommended) {
      // tie-breaker: createdAt 古い順
      if (it.createdAt.getTime() < recommended.createdAt.getTime()) recommended = it
    }
  }

  return {
    doneYesterday: { items: doneYesterdayItems, count: doneYesterdayItems.length },
    mustToday: { items: mustTodayItems, count: mustTodayItems.length },
    overdue: { top3: overdueItems.slice(0, 3), total: overdueItems.length },
    todayScheduled: { items: todayScheduledItems, count: todayScheduledItems.length },
    recommended,
    today,
  }
}

/**
 * iter963 basics: 「今日の作戦盤」 headline を 1 行 ja-JP に整形 (AI 朝 brief / Slack daily digest 用)。
 *
 * iter521 buildOperationBoard の summary を「最初に伝える 1 行」 に圧縮する高 level helper。
 * mustToday / overdue / recommended の 3 軸を順に並べ、0 件軸は省略 (= 視覚 noise 削減)。
 *
 * 出力例:
 *   - '今日 MUST 3 / overdue 2 / 推奨: 「タスクX」 (見積 30 分)'  (全 3 軸あり + 推奨に estimate)
 *   - '今日 MUST 3 / 推奨: 「タスクX」'                          (overdue 0、estimate なし)
 *   - 'overdue 5 件'                                              (MUST 0、推奨 0)
 *   - '全て片付き済 (今日の MUST / overdue / 推奨なし)'           (全 0)
 *
 * formatSprintRiskBoardAlertJa (iter962) と並ぶ「最初に伝える 1 行」 pattern。
 */
export function formatOperationBoardHeadlineJa(summary: OperationBoardSummary): string {
  const parts: string[] = []
  if (summary.mustToday.count > 0) parts.push(`今日 MUST ${summary.mustToday.count}`)
  if (summary.overdue.total > 0) parts.push(`overdue ${summary.overdue.total}`)
  if (summary.recommended !== null) {
    const est = extractEstimateMinutes(summary.recommended.description)
    const estPart = est !== undefined ? ` (見積 ${est} 分)` : ''
    parts.push(`推奨: 「${summary.recommended.title}」${estPart}`)
  }
  if (parts.length === 0) return '全て片付き済 (今日の MUST / overdue / 推奨なし)'
  return parts.join(' / ')
}

// 内部 helper を test しやすくするため named export
export { dayOffsetISO, dueTimeMinutes, eisenhowerScore }
