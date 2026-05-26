/**
 * iter (queue 目標達成 + 繰り返し substrate / TC-4 routine 露出): recurring template が
 * 「いま展開すべきか」 を判定する pure 関数。
 *
 * 既存 `templates.kind='recurring' + schedule_cron + cron_run_id` で recurring 自体は動く
 * (Phase 4)。本 helper は **UI で「いま展開できる routine 一覧」 を見せる** ための判定軸を提供。
 *
 * 設計判断:
 *   - 完全な RRULE は cron-parser に任せる (既存依存)、本 helper は **既存 cron 解釈の結果**
 *     (= last_run / next_run) を受けて 「展開すべきか」 判定するだけ
 *   - 朝 起動時の auto-enqueue path で消費される想定 (= 「今日まだ展開してない recurring」 抽出)
 *
 * 詳細: docs/methodology-modes-plan.md §1 T-5 + FEEDBACK_QUEUE.md 目標達成 + 繰り返しタスク
 */

import { MS_PER_DAY } from '@/lib/date/iso'

export interface RecurrenceState {
  /** 最後に展開した時刻 (template_instantiations.created_at 最大値)。null = 未展開 */
  lastRunAt: Date | null
  /** cron-parser で計算した「次回展開予定」 (lastRunAt 基点)。null = cron 解釈失敗 / 終了 */
  nextRunAt: Date | null
  /** template が paused (=有効化解除) なら true */
  paused: boolean
}

export type RecurrenceDueKind =
  | 'overdue' // nextRunAt < now、即展開すべき
  | 'due-today' // nextRunAt が今日範囲内、本日中に展開
  | 'upcoming' // 未来の予定、まだ展開しない
  | 'paused' // 一時停止
  | 'never-run' // cron 解釈失敗、設定要確認

export interface RecurrenceDueResult {
  kind: RecurrenceDueKind
  /** UI 表示用の message */
  message: string
  /** auto-enqueue worker が pick すべきか */
  shouldInstantiate: boolean
}

// iter1027 refactor: 旧 local `MS_PER_DAY = 24 * 60 * 60 * 1000` を `@/lib/date/iso#MS_PER_DAY`
// に集約 (= iter1024 sweep の継続)。

/**
 * recurring template の現状 + 今 から 「いま展開すべきか」 判定。
 *
 * @param state    template の recurrence state (lastRunAt / nextRunAt / paused)
 * @param now      現在時刻 (test では fixed Date 渡す)
 */
export function classifyRecurrenceDue(state: RecurrenceState, now: Date): RecurrenceDueResult {
  if (state.paused) {
    return { kind: 'paused', message: '一時停止中', shouldInstantiate: false }
  }
  if (!state.nextRunAt) {
    return {
      kind: 'never-run',
      message: 'cron 解釈失敗、設定を確認してください',
      shouldInstantiate: false,
    }
  }

  const diffMs = state.nextRunAt.getTime() - now.getTime()

  if (diffMs < 0) {
    return {
      kind: 'overdue',
      message: `${Math.ceil(-diffMs / 3600_000)} 時間 経過、即展開対象`,
      shouldInstantiate: true,
    }
  }
  if (diffMs <= MS_PER_DAY) {
    return {
      kind: 'due-today',
      message: `${Math.floor(diffMs / 3600_000)} 時間後 展開予定`,
      shouldInstantiate: false,
    }
  }
  return {
    kind: 'upcoming',
    message: `${Math.floor(diffMs / MS_PER_DAY)} 日後 展開予定`,
    shouldInstantiate: false,
  }
}

/**
 * recurring template 配列を受けて、auto-enqueue 対象 (overdue) だけ抽出。
 * worker の cron tick (TC-4 / 既存 cron) が消費する想定。
 */
export interface RecurringTemplateLike {
  id: string
  state: RecurrenceState
}

export function pickInstantiationCandidates<T extends RecurringTemplateLike>(
  templates: readonly T[],
  now: Date,
): T[] {
  return templates.filter((t) => classifyRecurrenceDue(t.state, now).shouldInstantiate)
}

/**
 * iter1383 (queue: 目標達成 + 繰り返しタスク / TC-4 routine 露出): recurring template 群を
 * kind 別件数に集約 + routine panel header 用の 1 行 summary。
 *
 * classifyRecurrenceDue は 1 件単位の判定だが、本 helper は routine 一覧 panel の
 * header (「展開待ち 3 / 本日 2 / 予定 5 / 停止 1 / 要確認 0」) を 1 関数で出す。
 * 0 件 kind は format で省略、全 0 は「繰り返し template なし」。
 */
export type RecurrenceDueCounts = Record<RecurrenceDueKind, number>

export function summarizeRecurrenceDue<T extends RecurringTemplateLike>(
  templates: readonly T[],
  now: Date,
): RecurrenceDueCounts {
  const counts: RecurrenceDueCounts = {
    overdue: 0,
    'due-today': 0,
    upcoming: 0,
    paused: 0,
    'never-run': 0,
  }
  for (const t of templates) {
    counts[classifyRecurrenceDue(t.state, now).kind] += 1
  }
  return counts
}

const RECURRENCE_KIND_LABEL_JA: Record<RecurrenceDueKind, string> = {
  overdue: '展開待ち',
  'due-today': '本日',
  upcoming: '予定',
  paused: '停止',
  'never-run': '要確認',
}

// 表示順: actionable な順 (展開待ち → 本日 → 予定 → 停止 → 要確認)
const RECURRENCE_KIND_ORDER: readonly RecurrenceDueKind[] = [
  'overdue',
  'due-today',
  'upcoming',
  'paused',
  'never-run',
]

export function formatRecurrenceDueSummaryJa(counts: RecurrenceDueCounts): string {
  const parts = RECURRENCE_KIND_ORDER.filter((k) => counts[k] > 0).map(
    (k) => `${RECURRENCE_KIND_LABEL_JA[k]} ${counts[k]}`,
  )
  if (parts.length === 0) return '繰り返し template なし'
  return parts.join(' / ')
}
