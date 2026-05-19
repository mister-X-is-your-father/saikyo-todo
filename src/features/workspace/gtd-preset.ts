/**
 * iter (queue GT-1 substrate): GTD methodology の 5 status preset 定義 + 適用判定 pure 関数。
 *
 * GTD の中核 5 list (Next Actions / Projects / Waiting For / Someday-Maybe / Reference) を
 * `workspace_statuses` rows として workspace に展開する preset。1 click 導入で GTD mode が立ち上がる。
 *
 * 設計判断:
 *   - status `type` (todo / in_progress / done) との対応: Next/Project = todo、Waiting = in_progress
 *     (= 作業中だが手元では止まってる)、Someday/Reference = todo (= 検討段階)
 *   - color は 6 軸 a-g 「視覚識別」 を意識: Next=indigo (主流) / Project=blue (集約) /
 *     Waiting=amber (待ち、注意) / Someday=slate (棚) / Reference=zinc (情報、neutral)
 *
 * 詳細: docs/methodology-modes-plan.md §1 GTD G-2 + FEEDBACK_QUEUE.md GT-1
 */

export type GtdPresetStatusType = 'todo' | 'in_progress' | 'done'

export interface GtdPresetStatus {
  /** workspace_statuses.key (英語、安定 id) */
  key: string
  /** workspace_statuses.label (UI 表示 JA) */
  label: string
  /** workspace_statuses.color (Tailwind 50-700 colorway hex で固定) */
  color: string
  /** workspace_statuses.order */
  order: number
  /** workspace_statuses.type (Kanban grouping 軸) */
  type: GtdPresetStatusType
}

export const GTD_PRESET_STATUSES: readonly GtdPresetStatus[] = [
  // 1. Next Actions — 今すぐ実行可能、context tag で絞る
  { key: 'gtd_next', label: 'Next Actions', color: '#6366f1', order: 10, type: 'todo' },
  // 2. Projects — outcome that needs > 1 step (parent_path で表現)
  { key: 'gtd_project', label: 'Projects', color: '#3b82f6', order: 20, type: 'todo' },
  // 3. Waiting For — 相手待ち、別途 items.waiting_for で時間軸管理 (WT-1)
  { key: 'gtd_waiting', label: 'Waiting For', color: '#f59e0b', order: 30, type: 'in_progress' },
  // 4. Someday-Maybe — いつかやるかも、検討段階
  { key: 'gtd_someday', label: 'Someday-Maybe', color: '#64748b', order: 40, type: 'todo' },
  // 5. Reference — 参照情報、実行対象でない
  { key: 'gtd_reference', label: 'Reference', color: '#71717a', order: 50, type: 'todo' },
] as const

/**
 * 既存 workspace_statuses の key set から「GTD preset が既に導入済か」 判定。
 * GTD_PRESET_STATUSES の 5 key 全部が含まれていれば 'installed'、
 * 一部だけなら 'partial'、ゼロなら 'absent'。
 */
export type GtdPresetState = 'absent' | 'partial' | 'installed'

export function detectGtdPresetState(existingKeys: readonly string[]): GtdPresetState {
  const presetKeys = new Set(GTD_PRESET_STATUSES.map((s) => s.key))
  const existing = new Set(existingKeys)
  let hits = 0
  for (const k of presetKeys) if (existing.has(k)) hits += 1
  if (hits === 0) return 'absent'
  if (hits === presetKeys.size) return 'installed'
  return 'partial'
}

/**
 * 既存 keys を見て「未導入な preset status だけ」 を返す。
 * GT-1 install service は本配列を bulk insert する想定。
 */
export function pickMissingGtdPresetStatuses(existingKeys: readonly string[]): GtdPresetStatus[] {
  const existing = new Set(existingKeys)
  return GTD_PRESET_STATUSES.filter((s) => !existing.has(s.key))
}
