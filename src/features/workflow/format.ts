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
 * (Drizzle 直返しなら Date、Server Action から JSON 越しなら string)。fail-safe
 * として `new Date(...)` で正規化する。型も両方を正式に受け取れるように
 * `DateLike` で広げ、test 側の `as unknown as Date` cast を不要にする。
 */
import type { WorkflowRun } from './schema'

/** Drizzle 由来 Date と JSON 由来 ISO 文字列の両方を受ける入力型 */
export type DateLike = Date | string | null | undefined

/**
 * WorkflowRun のうち本ヘルパが触るフィールド。schema 由来は `Date | null` だが
 * JSON で受ける呼び出し元のために structural に `DateLike` まで広げている
 * (実体は `WorkflowRun` を必ず代入できる super-type)。
 */
export type RunTimeFields = {
  startedAt: DateLike
  createdAt: DateLike
  finishedAt: DateLike
}

// 型レベル assertion: WorkflowRun が RunTimeFields に代入可能であることを保証
// (schema が変わって列名が消えたらコンパイル時に検出する)
const _assertCompatible = (run: WorkflowRun): RunTimeFields => run
void _assertCompatible

function toDate(v: DateLike): Date | null {
  if (v == null) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatRunTime(r: RunTimeFields): string {
  const d = toDate(r.startedAt) ?? toDate(r.createdAt)
  if (!d) return '—'
  return d.toLocaleString('ja-JP')
}

export function formatRunDuration(r: RunTimeFields): string {
  const s = toDate(r.startedAt)
  const e = toDate(r.finishedAt)
  if (!s || !e) return '—'
  const ms = e.getTime() - s.getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}
