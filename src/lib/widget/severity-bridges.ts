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
