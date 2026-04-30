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
