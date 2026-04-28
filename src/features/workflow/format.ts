/**
 * Workflow run の表示整形 pure helper (iter260 で workflows-panel.tsx 847 行
 * から抽出 / 単体テスト化)。
 *
 * - `formatRunTime(run)`: startedAt 優先、無ければ createdAt を ja-JP locale で整形。
 *   どちらも無ければ `'—'`。
 * - `formatRunDuration(run)`: startedAt - finishedAt の差を ms / s / m に丸めて表示。
 *   片方欠損は `'—'`。
 *
 * 既存 component から呼ばれる時点では Date|string|null|undefined すべての形が来る
 * (Drizzle/JSON で型が緩い)。fail-safe として `new Date(...)` で正規化する。
 */
import type { WorkflowRun } from './schema'

/** WorkflowRun のうち本ヘルパが触るフィールド (テスト fixture 簡略化のため structural) */
export type RunTimeFields = Pick<WorkflowRun, 'startedAt' | 'createdAt' | 'finishedAt'>

export function formatRunTime(r: RunTimeFields): string {
  const t = r.startedAt ?? r.createdAt
  if (!t) return '—'
  const d = t instanceof Date ? t : new Date(t)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ja-JP')
}

export function formatRunDuration(r: RunTimeFields): string {
  if (!r.startedAt || !r.finishedAt) return '—'
  const s = r.startedAt instanceof Date ? r.startedAt : new Date(r.startedAt)
  const e = r.finishedAt instanceof Date ? r.finishedAt : new Date(r.finishedAt)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—'
  const ms = e.getTime() - s.getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}
