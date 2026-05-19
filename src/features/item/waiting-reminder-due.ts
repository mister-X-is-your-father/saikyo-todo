/**
 * iter (queue 連絡待ち WT-4 substrate): 連絡待ち item のリマインド送信判定 pure 関数。
 *
 * 既存 `items.waiting_for jsonb` (WT-1) を読んで 「いまリマインド送るべきか」 を deterministic
 * に判定する。pg-boss cron worker が 1h tick で本 helper を呼んで対象 item を抽出する。
 *
 * 詳細: ~/.claude/plans/saikyo-waiting-mode-plan.md §4 (reminder worker)
 */

import type { WaitingForState } from './schema'

export type ReminderDueDecision =
  | { kind: 'send'; reason: string; daysElapsed: number }
  | { kind: 'wait'; reason: string }
  | { kind: 'no-cadence'; reason: 'cadence 未設定' }
  | { kind: 'too-recent'; reason: string; nextAt: Date }

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * 1 件の waiting_for state について、 `now` 時点でリマインド送信すべきか判定。
 *
 * - cadence 無し → 'no-cadence' (= 送らない、ユーザが「リマインド要らない」 を選択)
 * - lastRemindedAt あり + (lastRemindedAt + cadence) > now → 'too-recent' (まだ早い)
 * - lastRemindedAt 無し + (requestedAt + cadence) > now → 'too-recent' (初回 cadence 未到来)
 * - 上記以外 → 'send' (= 対象に含める)
 */
export function classifyReminderDue(state: WaitingForState, now: Date): ReminderDueDecision {
  if (!state.reminderCadenceDays) {
    return { kind: 'no-cadence', reason: 'cadence 未設定' }
  }

  const cadenceMs = state.reminderCadenceDays * ONE_DAY_MS
  const requestedAt = new Date(state.requestedAt)
  const base = state.lastRemindedAt ? new Date(state.lastRemindedAt) : requestedAt
  const nextAt = new Date(base.getTime() + cadenceMs)

  if (nextAt > now) {
    return {
      kind: 'too-recent',
      reason: `次リマインド: ${nextAt.toISOString()}`,
      nextAt,
    }
  }

  const daysElapsed = Math.floor((now.getTime() - requestedAt.getTime()) / ONE_DAY_MS)
  return {
    kind: 'send',
    reason: `cadence 経過、${daysElapsed} 日 リマインド対象`,
    daysElapsed,
  }
}

export interface WaitingItemLike {
  id: string
  waitingFor: WaitingForState | null
}

/**
 * 連絡待ち items から「いま送るべき」 だけ抽出。
 * worker (1h tick) が消費する想定、結果配列は順次 send + lastRemindedAt 更新。
 */
export function pickReminderTargets<T extends WaitingItemLike>(
  items: readonly T[],
  now: Date,
): { item: T; daysElapsed: number }[] {
  const result: { item: T; daysElapsed: number }[] = []
  for (const item of items) {
    if (!item.waitingFor) continue
    const decision = classifyReminderDue(item.waitingFor, now)
    if (decision.kind === 'send') {
      result.push({ item, daysElapsed: decision.daysElapsed })
    }
  }
  return result
}
