/**
 * iter275 refactor: workflows-panel.tsx 760 行の `RunStatusBadge` で inline 三重 ternary
 * になっていた status → label / class の対応を pure helper に集約。
 *
 * `workflow_runs.status` (queued/running/succeeded/failed/cancelled) と
 * `workflow_node_runs.status` (pending/running/succeeded/failed/skipped) の
 * union を扱う。schema で check constraint は別だが UI badge は共有しているため
 * RunStatus を super-type として定義する (どちらの status 値も入る)。
 *
 * 役割分離:
 *  - `runStatusLabel(status)`: JA 1 単語ラベル (`成功` / `失敗` / `実行中` etc.)
 *  - `runStatusBadgeClass(status)`: Tailwind 配色 class (presentation だが純粋関数)
 *
 * 未知 status は label = そのまま / class = `bg-muted text-muted-foreground` で
 * 防衛的フォールバック (DB 側で制約が緩むか旧 enum 値が残っていても badge が破綻しない)。
 */

export type RunStatus =
  | 'queued'
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'skipped'

const LABELS: Record<RunStatus, string> = {
  queued: '待機',
  pending: '保留',
  running: '実行中',
  succeeded: '成功',
  failed: '失敗',
  cancelled: '中止',
  skipped: 'スキップ',
}

const CLASSES: Record<RunStatus, string> = {
  queued: 'bg-muted text-muted-foreground',
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  succeeded: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  cancelled: 'bg-muted text-muted-foreground',
  skipped: 'bg-muted text-muted-foreground',
}

const FALLBACK_CLASS = 'bg-muted text-muted-foreground'

export function runStatusLabel(status: string): string {
  return LABELS[status as RunStatus] ?? status
}

export function runStatusBadgeClass(status: string): string {
  return CLASSES[status as RunStatus] ?? FALLBACK_CLASS
}
