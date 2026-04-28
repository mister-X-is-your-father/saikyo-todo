/**
 * Item 優先度の表示用ヘルパ。
 *
 * Today / Inbox view の priority dot で重複していた `PRIO_DOT` map を集約。
 * SR 用の日本語ラベル `priorityLabel` も同梱 (アクセシビリティ強化のため
 * dot に aria-label として付与する想定)。
 */

export const PRIO_DOT_CLASS: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-blue-500',
  4: 'bg-slate-400',
}

const LABELS: Record<number, string> = {
  1: '最優先',
  2: '高',
  3: '中',
  4: '低',
}

export function priorityClass(p: number | null | undefined): string {
  return PRIO_DOT_CLASS[p ?? 4] ?? 'bg-slate-400'
}

/** 例: priorityLabel(1) → "優先度: 最優先 (p1)" */
export function priorityLabel(p: number | null | undefined): string {
  const v = p ?? 4
  const name = LABELS[v] ?? '低'
  return `優先度: ${name} (p${v})`
}

/**
 * iter292 ai-automation: AI brief / pm-agent / dashboard widget が「priority 別の
 * item 分布」を 1 関数で出せる substrate。due-proximity の `groupItemsByDueProximity`
 * / `countItemsByDueProximity` / `formatDueProximityCounts` と対称な API。
 *
 * 分類仕様:
 *  - priority は 1..4 の整数。null/undefined/範囲外は p4 (低) と同じバケットに集約
 *    (`priorityClass`/`priorityLabel` のフォールバックと一貫)。
 *  - 順序: 元配列順を保つ stable group (per-bucket 内も元順)。
 *  - 各 bucket は必ず空配列で初期化 — `groups[1].length` のような undefined チェック不要。
 */
export type PriorityKey = 1 | 2 | 3 | 4

export type PriorityGroups<T> = Record<PriorityKey, T[]>

const PRIORITY_ORDER: readonly PriorityKey[] = [1, 2, 3, 4] as const

function normalizePriority(p: number | null | undefined): PriorityKey {
  if (p === 1 || p === 2 || p === 3) return p
  return 4
}

export function groupItemsByPriority<T extends { priority: number | null | undefined }>(
  items: readonly T[],
): PriorityGroups<T> {
  const groups: PriorityGroups<T> = { 1: [], 2: [], 3: [], 4: [] }
  for (const it of items) {
    groups[normalizePriority(it.priority)].push(it)
  }
  return groups
}

export function countItemsByPriority(
  items: readonly { priority: number | null | undefined }[],
): Record<PriorityKey, number> {
  const counts: Record<PriorityKey, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const it of items) {
    counts[normalizePriority(it.priority)] += 1
  }
  return counts
}

/** AI prompt 行 / dashboard chip 用の 1 行 summary (件数 0 の bucket は省略)。 */
export function formatPriorityCounts(counts: Record<PriorityKey, number>): string {
  const parts: string[] = []
  for (const k of PRIORITY_ORDER) {
    const n = counts[k]
    if (n > 0) parts.push(`${LABELS[k]} ${n}`)
  }
  return parts.length === 0 ? '0 件' : parts.join(' / ')
}
