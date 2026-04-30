'use client'

/**
 * iter518 (queue MS-1): URL `?mode=` + workspace_settings.default_mode を統合し、
 * 「今 active なメソッド mode」 を返す client-side hook。
 *
 * 優先順 (resolveWorkspaceMode と一致):
 *   1. URL `?mode=taskchute|gtd|none` (per-session override、URL 共有も可能)
 *   2. workspace_settings.default_mode
 *   3. 'none'
 *
 * 不正値は 'none' に丸める (typo / 旧 mode の安全弁)。
 * 詳細: docs/methodology-modes-plan.md §6
 */
import { parseAsString, useQueryState } from 'nuqs'

import { useWorkspaceDefaultMode } from './hooks'
import { resolveWorkspaceMode, type WorkspaceMode } from './resolve-mode'

export interface ActiveWorkspaceMode {
  /** URL > workspace default > 'none' で解決された 現在 active な mode */
  mode: WorkspaceMode
  /** workspace 設定上のデフォルト ('none' fallback 込み) */
  workspaceDefault: WorkspaceMode
  /** URL `?mode=` の生値 (override しているか判定用、null = override 無し) */
  urlMode: string | null
  /** URL を更新して mode を override する (null で override 解除) */
  setUrlMode: (mode: WorkspaceMode | null) => void
  /** workspace_settings の load 中なら true */
  isLoading: boolean
}

export function useActiveWorkspaceMode(workspaceId: string): ActiveWorkspaceMode {
  const [urlMode, setUrlModeRaw] = useQueryState('mode', parseAsString)
  const q = useWorkspaceDefaultMode(workspaceId)

  const workspaceDefault = (q.data?.defaultMode ?? 'none') as WorkspaceMode
  const mode = resolveWorkspaceMode({ urlMode, workspaceDefault })

  function setUrlMode(next: WorkspaceMode | null) {
    void setUrlModeRaw(next)
  }

  return {
    mode,
    workspaceDefault,
    urlMode,
    setUrlMode,
    isLoading: q.isLoading,
  }
}
