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

import { MS_PER_DAY } from '@/lib/date/iso'
import type { ChipTone } from '@/lib/ui/chip-tone'
import type { Severity } from '@/lib/widget/severity'

import type { AgentBriefSignal } from '@/features/agent/brief-signal'
import type { Item } from '@/features/item/schema'

import { isItemActive } from './operation-board'

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

// iter1034 refactor: 旧 local `isActive` (Item → boolean、!doneAt && !archivedAt && !deletedAt)
// を `operation-board.ts#isItemActive` (= 同 directory の canonical 実装、iter / automation-part
// からも参照される単一 source of truth) に集約。

/**
 * items 集合から Weekly Review checklist を build。
 * GTD 公式 5 step に saikyo-todo の status を mapping、未処理件数を自動 count。
 */
export function buildWeeklyReviewChecklist({
  items,
  today,
}: WeeklyReviewInput): WeeklyReviewItem[] {
  const active = items.filter(isItemActive)
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
  if (diffMs > 7 * MS_PER_DAY) return 'overdue'
  return 'recent'
}

/**
 * iter1033 basics: WeeklyReviewDueKind → 共通 `Severity` ('ok'/'info'/'warn'/'danger'/'muted') bridge。
 *
 * 配色 token (SeverityChip tone bind 用):
 *   - 'recent'         → 'ok'     (= 緑、7 日以内 review 済、healthy)
 *   - 'never-reviewed' → 'warn'   (= 黄、未着手、開始推奨)
 *   - 'overdue'        → 'danger' (= 赤、1 週以上未 review、即対応)
 *
 * iter1028 `consultationStatusSeverity` と並ぶ「domain status → 共通 Severity」 pattern の
 * weekly-review 軸版。caller (= GTD mode panel chip / notification badge / Slack 通知 tone) は
 * 本 bridge で SeverityChip の tone を 1 関数で決定可能。
 *
 * muted は使わない (= 3 値全てが「review status として valid な存在」)。
 */
export function weeklyReviewDueSeverity(kind: WeeklyReviewDueKind): Severity {
  switch (kind) {
    case 'recent':
      return 'ok'
    case 'never-reviewed':
      return 'warn'
    case 'overdue':
      return 'danger'
  }
}

/**
 * iter1033 basics: WeeklyReviewDueKind → 日本語短ラベル。
 *
 *   - 'recent'         → '点検済'
 *   - 'never-reviewed' → '未着手'
 *   - 'overdue'        → '1 週以上経過'
 *
 * iter1028 `formatConsultationStatusJa` と並ぶ「domain status → 日本語短ラベル」 pattern の
 * weekly-review 軸版。caller (= GTD panel header / notification text / Slack 通知 + AI prompt)
 * で再利用される。
 */
const WEEKLY_REVIEW_DUE_LABEL_JA: Record<WeeklyReviewDueKind, string> = {
  recent: '点検済',
  'never-reviewed': '未着手',
  overdue: '1 週以上経過',
}

export function formatWeeklyReviewDueJa(kind: WeeklyReviewDueKind): string {
  return WEEKLY_REVIEW_DUE_LABEL_JA[kind]
}

/**
 * iter1035 ai-automation: WeeklyReviewDueKind → 共通 `ChipTone` (6 値 vocab) bridge。
 *
 * iter1039 refactor: 内部 mapping を共通 `severityToChipTone` (lib/widget/severity-bridges) に
 * 委譲 (`weeklyReviewDueSeverity(kind)` → `severityToChipTone(sev)` の 2 段)、inline Record
 * duplicate を排除。
 *
 * 配色 token:
 *   'recent'         → 'success' (= 緑、点検済、healthy 強調 = 6 軸 (5) やる気)
 *   'never-reviewed' → 'warn'    (= 黄、未着手、開始推奨)
 *   'overdue'        → 'danger'  (= 赤、1 週以上未 review、即対応)
 *
 * 用途:
 *   - dashboard GTD mode chip / Slack daily digest tone bind / AgentBriefSignal tone field 直 bind
 */
import { severityToChipTone } from '@/lib/widget/severity-bridges'

export function weeklyReviewDueChipTone(kind: WeeklyReviewDueKind): ChipTone {
  return severityToChipTone(weeklyReviewDueSeverity(kind))
}

/**
 * iter1035 ai-automation: WeeklyReviewDueKind → `AgentBriefSignal` (text + tone) compose helper。
 *
 * iter794-797 + iter1025 + iter1031 `*ToBriefSignal` pattern (= 9 + 1 axes 弾) の weekly-review
 * 軸版で AI 朝 brief / Slack daily digest / dashboard chip area に 1 chip 渡せる。text は
 * `formatWeeklyReviewDueJa` (= 短ラベル 1 行)、tone は `weeklyReviewDueChipTone` を再利用。
 *
 * caller pattern:
 *   const kind = classifyWeeklyReviewDue({ lastReviewAt, now })
 *   const signal = weeklyReviewDueToBriefSignal(kind)
 *   // → composeAnalyticsSignals 風に concat、または単独 chip render
 */
export function weeklyReviewDueToBriefSignal(kind: WeeklyReviewDueKind): AgentBriefSignal {
  return {
    text: formatWeeklyReviewDueJa(kind),
    tone: weeklyReviewDueChipTone(kind),
  }
}
