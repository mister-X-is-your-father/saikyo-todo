/**
 * iter (queue methodology GT-4 substrate): GTD Weekly Review checklist 生成 pure 関数。
 *
 * GTD の中核習慣 「Weekly Review」 (毎週末に項目総点検) を data-driven に提示する。
 * AI 文章 (fluffy) 不使用、items の構造化集計から checklist を build。
 *
 * checklist items の出典:
 *   - GTD 公式 5 step (Collect / Process / Organize / Review / Engage) に対応
 *   - 各 step に検出可能な「未処理状態」 を items count から自動補完
 *
 * 詳細: docs/methodology-modes-plan.md §1 G-5 + FEEDBACK_QUEUE.md GT-4
 */

import type { Item } from '@/features/item/schema'

export interface WeeklyReviewItem {
  /** GTD 5-step id */
  step: 'collect' | 'process' | 'organize' | 'review' | 'engage'
  /** UI 表示用の short title */
  title: string
  /** 具体的な action 文 */
  description: string
  /** 自動検出された関連件数 (= UI で badge 表示) */
  count: number
  /** 「対応必要」 か (count > 0) */
  needsAttention: boolean
}

export interface WeeklyReviewInput {
  items: readonly Item[]
  today: string // ISO date 'YYYY-MM-DD'
}

function isActive(it: Item): boolean {
  return !it.doneAt && !it.archivedAt && !it.deletedAt
}

/**
 * items 集合から Weekly Review checklist を build。
 * GTD 公式 5 step に saikyo-todo の status を mapping、未処理件数を自動 count。
 */
export function buildWeeklyReviewChecklist({
  items,
  today,
}: WeeklyReviewInput): WeeklyReviewItem[] {
  const active = items.filter(isActive)
  const inbox = active.filter((it) => it.status === 'todo' || it.status === 'gtd_next').length
  const waiting = active.filter(
    (it) => it.status === 'gtd_waiting' || it.waitingFor !== null,
  ).length
  const overdue = active.filter((it) => it.dueDate !== null && it.dueDate < today).length
  const stalePlanning = active.filter(
    (it) => it.dueDate === null && it.scheduledFor === null,
  ).length
  const someday = active.filter((it) => it.status === 'gtd_someday').length

  return [
    {
      step: 'collect',
      title: '頭の中を出す',
      description: 'メモ / メール / Slack の未整理を Inbox に投入',
      count: 0, // 外部依存、ユーザが手動 check
      needsAttention: true,
    },
    {
      step: 'process',
      title: 'Inbox を空にする',
      description: '各 item を 2 min なら今やる / project に / waiting に / someday に分類',
      count: inbox,
      needsAttention: inbox > 0,
    },
    {
      step: 'organize',
      title: '計画化漏れを確認',
      description: 'dueDate / scheduledFor 未設定の active item を「いつやるか」 決める',
      count: stalePlanning,
      needsAttention: stalePlanning > 0,
    },
    {
      step: 'review',
      title: '待ち + 期日を点検',
      description: 'Waiting For で滞ってる依頼に催促、overdue を再計画',
      count: waiting + overdue,
      needsAttention: waiting + overdue > 0,
    },
    {
      step: 'engage',
      title: '来週の Next Actions を確定',
      description: 'Someday の中から「来週やる」 を選び gtd_next に昇格、優先順を確認',
      count: someday,
      needsAttention: someday > 0,
    },
  ]
}

/**
 * Weekly Review が「未着手」 か「進行中」 か判定 (= 通知タイミング決定用)。
 * 毎日曜 9:00 cron が呼んで「先週末 review してない」 → notification 発行。
 */
export interface WeeklyReviewState {
  lastReviewAt: Date | null
  now: Date
}

export type WeeklyReviewDueKind =
  | 'never-reviewed'
  | 'overdue' // 1 週以上未 review
  | 'recent' // 7 日以内に review 済

export function classifyWeeklyReviewDue(state: WeeklyReviewState): WeeklyReviewDueKind {
  if (!state.lastReviewAt) return 'never-reviewed'
  const diffMs = state.now.getTime() - state.lastReviewAt.getTime()
  if (diffMs > 7 * 24 * 60 * 60 * 1000) return 'overdue'
  return 'recent'
}
