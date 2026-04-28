/**
 * iter300 refactor: integrations-panel.tsx 551 行の `ImportStatusBadge` で
 * inline 4-way ternary だった status → label / class の対応を pure helper に集約。
 *
 * 抽出元: `src/components/integrations/integrations-panel.tsx#ImportStatusBadge`。
 * iter275 (`run-status.ts`、workflows-panel から抽出) と同パターン。`external_imports`
 * 自体は `workflow_runs` と別ドメインだが、UI 表現は同 vocabulary (待機 / 実行中 /
 * 成功 / 失敗) を使うため別 file で **同 vocabulary** を維持する (run-status を
 * 直接 import すると workflow ドメインへの不要な依存が出るため別 file)。
 *
 * 役割分離:
 *  - `importStatusLabel(status)`: JA 1 単語ラベル
 *  - `importStatusBadgeClass(status)`: Tailwind 配色 class (presentation だが純粋関数)
 *
 * 未知 status (DB enum 拡張 / 旧値) は label = そのまま / class = muted で防衛的
 * フォールバック (badge が破綻しない、SR には raw status が読まれる)。
 */

export type ImportStatus = 'queued' | 'running' | 'succeeded' | 'failed'

const LABELS: Record<ImportStatus, string> = {
  queued: '待機',
  running: '実行中',
  succeeded: '成功',
  failed: '失敗',
}

const CLASSES: Record<ImportStatus, string> = {
  queued: 'bg-muted text-muted-foreground',
  running: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  succeeded: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

const FALLBACK_CLASS = 'bg-muted text-muted-foreground'

export function importStatusLabel(status: string): string {
  return LABELS[status as ImportStatus] ?? status
}

export function importStatusBadgeClass(status: string): string {
  return CLASSES[status as ImportStatus] ?? FALLBACK_CLASS
}
