/**
 * iter517 (queue MS-1): methodology mode (none / taskchute / gtd) の解決 pure helper。
 *
 * 優先順 (docs/methodology-modes-plan.md §6):
 *   1. URL `?mode=` query が valid なら最優先 (per-session override)
 *   2. workspace_settings.default_mode (workspace 全体のデフォルト)
 *   3. fallback 'none'
 *
 * 不正値 (typo / 旧 mode) は黙って 'none' に丸める (運用安定優先)。
 */

export type WorkspaceMode = 'none' | 'taskchute' | 'gtd'

const VALID_MODES: ReadonlySet<string> = new Set(['none', 'taskchute', 'gtd'])

export function isValidMode(value: unknown): value is WorkspaceMode {
  return typeof value === 'string' && VALID_MODES.has(value)
}

export function resolveWorkspaceMode(input: {
  urlMode?: string | null | undefined
  workspaceDefault?: string | null | undefined
}): WorkspaceMode {
  if (input.urlMode && isValidMode(input.urlMode)) return input.urlMode
  if (input.workspaceDefault && isValidMode(input.workspaceDefault)) return input.workspaceDefault
  return 'none'
}
