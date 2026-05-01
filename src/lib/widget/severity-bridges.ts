/**
 * iter535 ai-automation (queue: widget-tone unification): 各 domain の独自 severity 型 →
 * 共通 `Severity` ('ok' | 'info' | 'warn' | 'danger' | 'muted') への bridge 関数集。
 *
 * 設計目的:
 *   - 各 widget が SeverityChip に渡す tone を `data-domain → Severity` 1 行で取れる
 *   - 各 domain の severity 閾値はそのまま (= bridge は lossy mapping のみ)
 *   - 新 widget で同じ domain severity を bind するときに re-implement しなくて良い
 *
 * 副作用なし、依存は本 file が import する各 domain file のみ。pure helper + Vitest 単体 test で網羅。
 */
import type { FourStateHint } from '@/lib/hint'

import type { ChecklistStatus } from '@/features/agent/structured-review'
import type { PdcaPhaseSeverity } from '@/features/pdca-cycle/phase-helpers'
import type { AssigneeLoadSeverity } from '@/features/sprint/risk-board'

import type { Severity } from './severity'

/**
 * AssigneeLoadSeverity (担当負荷 4 段) → Severity (5 段) bridge:
 *   - 'overloaded' (累積 score >= 100) → 'danger'
 *   - 'busy'       (>= 50)             → 'warn'
 *   - 'normal'     (>= 20)             → 'info'
 *   - 'light'      (<  20 / 0 件)       → 'ok'
 */
export function assigneeLoadSeverityToSeverity(sev: AssigneeLoadSeverity): Severity {
  switch (sev) {
    case 'overloaded':
      return 'danger'
    case 'busy':
      return 'warn'
    case 'normal':
      return 'info'
    case 'light':
      return 'ok'
  }
}

/**
 * PdcaPhaseSeverity (PDCA phase 5 段) → Severity (5 段) bridge:
 *   - 'overdue'  → 'danger'  (= 進行を促す警報)
 *   - 'stale'    → 'warn'    (= 停滞気味、注意)
 *   - 'on_track' → 'info'    (= 順調、進行中)
 *   - 'fresh'    → 'info'    (= 開始直後、進行中)
 *   - 'closed'   → 'muted'   (= 完了、neutral)
 *
 * 'fresh' と 'on_track' は 同 'info' に lossy 縮約 (= chip tone 上は区別しない、
 * label tier は formatPdcaCyclePhaseStatusJa で別途出る)。
 */
export function pdcaPhaseSeverityToSeverity(sev: PdcaPhaseSeverity): Severity {
  switch (sev) {
    case 'overdue':
      return 'danger'
    case 'stale':
      return 'warn'
    case 'on_track':
    case 'fresh':
      return 'info'
    case 'closed':
      return 'muted'
  }
}

/**
 * iter548 ai-automation polish: structured-review の `Improvement.severity` ('high' /
 * 'medium' / 'low') → Severity bridge。AI review 結果の改善提案を chip 配色に bind する用。
 *
 * 'high'   → 'danger' (= 必ず対応する改善、影響大)
 * 'medium' → 'warn'   (= 検討対象、影響中)
 * 'low'    → 'info'   (= nice-to-have、影響小)
 */
export function improvementSeverityToSeverity(sev: 'high' | 'medium' | 'low'): Severity {
  switch (sev) {
    case 'high':
      return 'danger'
    case 'medium':
      return 'warn'
    case 'low':
      return 'info'
  }
}

/**
 * iter530 refactor: structured-review の `ChecklistItem.status` ('ok' | 'warn' | 'fail') →
 * 共通 Severity bridge。statusGlyph (✅/⚠/❌) と対をなす chip 配色用。
 *
 *   'ok'   → 'ok'     (= 緑、合格)
 *   'warn' → 'warn'   (= 黄、要注意だが致命でない)
 *   'fail' → 'danger' (= 赤、要対策)
 *
 * statusGlyph は visual icon (✅/⚠/❌) を返すが、SeverityChip の tone bind は
 * Severity 型が必要。本 bridge で AI review checklist の各 row chip を
 * SeverityChip 経由で配色統一可能。
 */
export function checklistStatusToSeverity(status: ChecklistStatus): Severity {
  switch (status) {
    case 'ok':
      return 'ok'
    case 'warn':
      return 'warn'
    case 'fail':
      return 'danger'
  }
}

/**
 * iter539 ai-automation: `Record<ChecklistStatus, number>` (AI review checklist 結果
 * 別件数) を `Record<Severity, number>` に集約する pure helper。
 *
 * iter533-538 と同 pattern (= 7 ドメイン目)。caller は AI review (= structured-review)
 * の checklist 集計を 1 行 severity サマリ で表示できる。
 *
 *   ok   → ok     (= ✅、合格)
 *   warn → warn   (= ⚠、要注意)
 *   fail → danger (= ❌、要対策)
 *
 * info / muted bucket には出ない (checklist は 3 値、ニュートラルや非該当は無い)。
 */
export function checklistStatusCountsToSeverityCounts(
  counts: Record<ChecklistStatus, number>,
): Record<Severity, number> {
  const out: Record<Severity, number> = {
    ok: 0,
    info: 0,
    warn: 0,
    danger: 0,
    muted: 0,
  }
  const all: ChecklistStatus[] = ['ok', 'warn', 'fail']
  for (const k of all) {
    const sev = checklistStatusToSeverity(k)
    out[sev] += counts[k] ?? 0
  }
  return out
}

/**
 * iter540 ai-automation: `Record<'high' | 'medium' | 'low', number>` (改善提案
 * severity 別件数) を `Record<Severity, number>` に集約する pure helper。
 *
 * iter533-539 と同 pattern (= 8 ドメイン目)。caller は AI review (structured-review)
 * の `improvements[].severity` 集計を 1 行 severity サマリ で表示できる。
 *
 *   high   → danger (= 必ず対応する改善、影響大、赤)
 *   medium → warn   (= 検討対象、影響中、黄)
 *   low    → info   (= nice-to-have、影響小、青)
 *
 * ok / muted bucket には出ない (= 「改善提案」 自体がそもそも改善 = positive 評価
 * ではない、対応必要度の grade)。
 */
export function improvementSeverityCountsToSeverityCounts(
  counts: Record<'high' | 'medium' | 'low', number>,
): Record<Severity, number> {
  const out: Record<Severity, number> = {
    ok: 0,
    info: 0,
    warn: 0,
    danger: 0,
    muted: 0,
  }
  const all: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low']
  for (const k of all) {
    const sev = improvementSeverityToSeverity(k)
    out[sev] += counts[k] ?? 0
  }
  return out
}

/**
 * iter541 ai-automation: `Record<AssigneeLoadSeverity, number>` (sprint 担当負荷 別件数) を
 * `Record<Severity, number>` に集約する pure helper。
 *
 * iter533-540 と同 pattern (= 9 ドメイン目)。caller は sprint 担当負荷 distribution を
 * 1 行 severity サマリ で表示できる。
 *
 *   overloaded → danger (= 高負荷、即 escalation)
 *   busy       → warn   (= 繁忙、注意)
 *   normal     → info   (= 通常、健全)
 *   light      → ok     (= 余裕、引き受け候補)
 *
 * muted bucket には出ない (4 段全て担当者がいる前提、unknown 扱いなし)。
 */
export function assigneeLoadSeverityCountsToSeverityCounts(
  counts: Record<AssigneeLoadSeverity, number>,
): Record<Severity, number> {
  const out: Record<Severity, number> = {
    ok: 0,
    info: 0,
    warn: 0,
    danger: 0,
    muted: 0,
  }
  const all: AssigneeLoadSeverity[] = ['overloaded', 'busy', 'normal', 'light']
  for (const k of all) {
    const sev = assigneeLoadSeverityToSeverity(k)
    out[sev] += counts[k] ?? 0
  }
  return out
}

/**
 * iter495 refactor: 4 状態 hint (`FourStateHint` 'idle' | 'mild' | 'moderate' | 'severe') →
 * 共通 `Severity` bridge。
 *
 * 'idle'     → 'muted'  (= 該当なし、neutral)
 * 'mild'     → 'ok'     (= 健全、安全側)
 * 'moderate' → 'warn'   (= 注意、要 monitoring)
 * 'severe'   → 'danger' (= 異常、要対応)
 *
 * iter439 / iter442 / iter444 / iter447 / iter449 / iter454 / iter458 / iter483
 * weekly-insight / iter488 inbox-process / iter491 notification-activity / iter492
 * structured-review / iter493 audit-activity と続く 12+ FourStateHint domain で
 * 「hint → SeverityChip tone」 を 1 関数で取れるように。各 caller は domain 固有の
 * `classifyXxxHint(input)` で hint を取り、本 bridge に渡せば chip 配色決定。
 */
export function fourStateHintToSeverity(hint: FourStateHint): Severity {
  switch (hint) {
    case 'idle':
      return 'muted'
    case 'mild':
      return 'ok'
    case 'moderate':
      return 'warn'
    case 'severe':
      return 'danger'
  }
}

import { severityChipClass } from './severity'

/**
 * iter505 refactor: 4 状態 hint chip 用の {label, severity, chipClass} を 1 関数で取得。
 *
 * iter496 / iter497 / iter498 / iter499 で 4 chip wire-up caller (WeeklyInsightWidget /
 * InboxView / ActivityLog / NotificationBell) が同 shape の構築を inline で書いていた:
 *
 *   const label = formatXxxHintJa(input)
 *   const severity = fourStateHintToSeverity(classifyXxxHint(input))
 *   const chipClass = severityChipClass(severity)
 *   return { label, severity, chipClass }
 *
 * 本 helper で 1 呼出に集約。caller の boilerplate を 4 行 → 1 行に。
 */
export interface FourStateHintChipProps {
  label: string
  severity: Severity
  chipClass: string
}

export function buildFourStateHintChip<T>(
  input: T,
  classify: (input: T) => FourStateHint,
  format: (input: T) => string,
): FourStateHintChipProps {
  const label = format(input)
  const severity = fourStateHintToSeverity(classify(input))
  const chipClass = severityChipClass(severity)
  return { label, severity, chipClass }
}
