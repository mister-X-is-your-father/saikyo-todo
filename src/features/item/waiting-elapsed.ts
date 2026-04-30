/**
 * iter546 ai-automation (queue: 連絡待ち WT-1 substrate): 連絡待ち item の経過日数を
 * 算出 + severity 分類する pure helper。
 *
 * fluffy 撲滅原則:
 *   - AI に「もう N 日待ってますね」 文章を書かせない
 *   - requestedAt から経過日数を deterministic に計算、severity bind に直接使う
 *   - WT-2 view plugin が依頼先別 grouping + 経過日数 chip を tone bind するための substrate
 *
 * 仕様 (FEEDBACK_QUEUE.md WT-1 / WT-2):
 *   - elapsedDays: requestedAt → now の整数日 (Math.floor)
 *   - severity: <3d → 'ok' (= 待ち中、健全) / 3-7d → 'warn' (= リマインド時期) /
 *     7d+ → 'danger' (= escalate 検討) / null requestedAt → 'muted' (= 不明)
 *   - cadenceProgress: lastRemindedAt + cadenceDays から見た「次リマインドまで何日」
 *     (整数、past なら 0、cadenceDays 未指定なら null)
 *
 * AI 不使用、副作用無し、依存無し。pure helper + Vitest 単体 test で網羅。
 */
import type { Severity } from '@/lib/widget/severity'

export interface WaitingItemFields {
  /** 連絡待ち化した時刻 (= 依頼を送った時刻、null なら未設定) */
  requestedAt?: Date | string | null | undefined
  /** 最後にリマインドを送った時刻 (null = まだ送っていない) */
  lastRemindedAt?: Date | string | null | undefined
  /** リマインド頻度 (日)、null なら自動リマインド OFF */
  reminderCadenceDays?: number | null | undefined
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function parseDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null
  const v = d instanceof Date ? d : new Date(d)
  return Number.isFinite(v.getTime()) ? v : null
}

/**
 * 依頼から now までの経過日数 (整数、Math.floor)。
 * requestedAt が null/不正なら null。未来 timestamp は 0 へ clamp。
 */
export function elapsedWaitingDays(item: WaitingItemFields, now: Date = new Date()): number | null {
  const r = parseDate(item.requestedAt)
  if (!r) return null
  const diffMs = now.getTime() - r.getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return 0
  return Math.floor(diffMs / MS_PER_DAY)
}

/**
 * 経過日数から SeverityChip tone を返す。
 * - days null → 'muted' (= 不明)
 * - days < 3  → 'ok'    (= 健全な待ち)
 * - days < 7  → 'warn'  (= リマインド時期)
 * - days >= 7 → 'danger' (= escalate 検討、長期化)
 */
export function waitingElapsedSeverity(days: number | null): Severity {
  if (days === null) return 'muted'
  if (days < 3) return 'ok'
  if (days < 7) return 'warn'
  return 'danger'
}

/**
 * 次リマインドまでの残日数 (整数、Math.floor)。
 * - lastRemindedAt + cadenceDays が past → 0 (= 即リマインド)
 * - cadenceDays null → null (= 自動リマインド OFF)
 * - lastRemindedAt null → cadenceDays をそのまま返す (まだ送っていない、初回)
 */
export function nextReminderInDays(item: WaitingItemFields, now: Date = new Date()): number | null {
  const cadence =
    typeof item.reminderCadenceDays === 'number' && item.reminderCadenceDays > 0
      ? item.reminderCadenceDays
      : null
  if (cadence === null) return null
  const last = parseDate(item.lastRemindedAt)
  if (!last) return cadence
  const dueMs = last.getTime() + cadence * MS_PER_DAY
  const diffMs = dueMs - now.getTime()
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0
  return Math.floor(diffMs / MS_PER_DAY)
}

/**
 * AI prompt / chip aria-label / Slack 通知用 1 行 waiting status:
 *   '依頼から 5 日経過 (次リマインド 1 日後)'
 *   '依頼から 8 日経過 (escalate 検討)'
 *   '依頼日不明'
 *
 * cadenceDays 設定なしなら次リマインド省略。escalate >=7d は明示。
 */
export function formatWaitingStatusJa(item: WaitingItemFields, now: Date = new Date()): string {
  const days = elapsedWaitingDays(item, now)
  if (days === null) return '依頼日不明'
  const nxt = nextReminderInDays(item, now)
  const escalateHint = days >= 7 ? ' (escalate 検討)' : ''
  if (nxt === null) {
    return `依頼から ${days} 日経過${escalateHint}`
  }
  if (nxt === 0) {
    return `依頼から ${days} 日経過 (リマインド時期)`
  }
  return `依頼から ${days} 日経過 (次リマインド ${nxt} 日後)${escalateHint}`
}
