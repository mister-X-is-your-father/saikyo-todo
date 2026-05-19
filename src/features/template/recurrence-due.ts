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

const ONE_DAY_MS = 24 * 60 * 60 * 1000

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
  if (diffMs <= ONE_DAY_MS) {
    return {
      kind: 'due-today',
      message: `${Math.floor(diffMs / 3600_000)} 時間後 展開予定`,
      shouldInstantiate: false,
    }
  }
  return {
    kind: 'upcoming',
    message: `${Math.floor(diffMs / ONE_DAY_MS)} 日後 展開予定`,
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
