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
import { parseDateOrNull } from '@/lib/date/iso'
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

// iter490 refactor: parseDate 系の重複を `lib/date/iso.ts#parseDateOrNull` に集約 (38 弾目)
const parseDate = parseDateOrNull

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
 * iter486 basics: workspace 全体の連絡待ち item の集計。
 *
 * 用途: dashboard chip 「連絡待ち N 件 (escalate Y 件)」、Slack 通知の見出し、
 * WT-2 view plugin の grouping panel header。
 *
 * 仕様:
 *   - total: 全 waiting item 件数 (= input.length)
 *   - byseverity: 'ok' / 'warn' / 'danger' / 'muted' (= requestedAt null) の件数
 *   - oldestDays: 最大 elapsedDays (null は除外)、空 → null
 *   - dueRemindCount: nextReminderInDays === 0 の件数 (= 即リマインド推奨)
 */
export interface WaitingSummary {
  total: number
  /** waitingElapsedSeverity が返す 4 値 (ok / warn / danger / muted) のみ集計、info は使用しない */
  bySeverity: Record<'ok' | 'warn' | 'danger' | 'muted', number>
  oldestDays: number | null
  dueRemindCount: number
}

export function summarizeWaitingItems(
  items: readonly WaitingItemFields[],
  now: Date = new Date(),
): WaitingSummary {
  const bySeverity: WaitingSummary['bySeverity'] = { ok: 0, warn: 0, danger: 0, muted: 0 }
  let oldestDays: number | null = null
  let dueRemindCount = 0
  for (const it of items) {
    const d = elapsedWaitingDays(it, now)
    const sev = waitingElapsedSeverity(d)
    // sev は型上 Severity (= info を含む 5 値) だが、waitingElapsedSeverity の実装では
    // 'info' を返さない (= ok / warn / danger / muted の 4 値のみ)。型を絞る。
    if (sev === 'ok' || sev === 'warn' || sev === 'danger' || sev === 'muted') {
      bySeverity[sev] += 1
    }
    if (d !== null && (oldestDays === null || d > oldestDays)) {
      oldestDays = d
    }
    const nxt = nextReminderInDays(it, now)
    if (nxt === 0) dueRemindCount += 1
  }
  return { total: items.length, bySeverity, oldestDays, dueRemindCount }
}

/**
 * iter486 basics: summarizeWaitingItems の出力を chip 文言に整形。
 *   '連絡待ちなし'                             (total=0)
 *   '連絡待ち 5 件 (escalate 2、最長 12 日)'   (danger > 0)
 *   '連絡待ち 3 件 (リマインド推奨 2)'         (escalate=0 + dueRemind > 0)
 *   '連絡待ち 1 件'                           (健全のみ)
 *
 * caller は本文字列を chip / aria-label / Slack 通知に直 埋め込み。
 */
export function formatWaitingSummaryJa(summary: WaitingSummary): string {
  if (summary.total === 0) return '連絡待ちなし'
  const parts: string[] = []
  if (summary.bySeverity.danger > 0) {
    parts.push(`escalate ${summary.bySeverity.danger}`)
  }
  if (summary.dueRemindCount > 0 && summary.bySeverity.danger === 0) {
    parts.push(`リマインド推奨 ${summary.dueRemindCount}`)
  }
  if (summary.oldestDays !== null && summary.bySeverity.danger > 0) {
    parts.push(`最長 ${summary.oldestDays} 日`)
  }
  if (parts.length === 0) return `連絡待ち ${summary.total} 件`
  return `連絡待ち ${summary.total} 件 (${parts.join('、')})`
}

/**
 * iter502 ai-automation: workspace 連絡待ち状態 4 状態 hint シリーズ 13 弾目 (= velocity /
 * blocked-items / at-risk-parents / weekly-insight / inbox-process / notification-activity /
 * structured-review / audit-activity に続く)。
 *
 * - 'idle'     : total=0 (= 連絡待ちなし)
 * - 'severe'   : bySeverity.danger >= 3 (= 7d+ escalate 候補多発) OR oldestDays >= 14
 * - 'moderate' : bySeverity.danger >= 1 (= 1 件でも escalate あり) OR dueRemindCount >= 1
 *                (= リマインド推奨あり)
 * - 'mild'     : それ以外 (= 健全な待ち、進行中)
 *
 * 用途: dashboard chip 「連絡待ち 異常」 / Slack daily digest 見出し / WT-2 panel chip。
 */
import { type FourStateHint, makeHintLabelFormatter } from '@/lib/hint'

export type WaitingHint = FourStateHint

export function classifyWaitingHint(summary: WaitingSummary): WaitingHint {
  if (summary.total === 0) return 'idle'
  if (summary.bySeverity.danger >= 3 || (summary.oldestDays !== null && summary.oldestDays >= 14)) {
    return 'severe'
  }
  if (summary.bySeverity.danger >= 1 || summary.dueRemindCount >= 1) return 'moderate'
  return 'mild'
}

const WAITING_HINT_LABEL_JA: Record<WaitingHint, string> = {
  idle: '連絡待ちなし',
  mild: '進行中',
  moderate: '注意',
  severe: '異常',
}

export const formatWaitingHintJa = makeHintLabelFormatter(
  classifyWaitingHint,
  WAITING_HINT_LABEL_JA,
)

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
