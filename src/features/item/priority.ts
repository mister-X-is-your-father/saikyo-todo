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
