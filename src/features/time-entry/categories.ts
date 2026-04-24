/**
 * 稼働入力の固定カテゴリ (docs/spec-time-entries.md §4.3)。
 * saikyo-todo と mock-timesheet の両方でこの enum を共有する。
 *
 * 将来拡張が必要になったら DB 化するが MVP は定数で十分。
 */
import { z } from 'zod'

export const TIME_ENTRY_CATEGORIES = [
  { key: 'dev', label: '開発' },
  { key: 'meeting', label: 'MTG' },
  { key: 'research', label: '調査' },
  { key: 'ops', label: '運用' },
  { key: 'other', label: 'その他' },
] as const

export type TimeEntryCategoryKey = (typeof TIME_ENTRY_CATEGORIES)[number]['key']

export const TimeEntryCategorySchema = z.enum(
  TIME_ENTRY_CATEGORIES.map((c) => c.key) as [TimeEntryCategoryKey, ...TimeEntryCategoryKey[]],
)

export function categoryLabel(key: string): string {
  return TIME_ENTRY_CATEGORIES.find((c) => c.key === key)?.label ?? key
}
