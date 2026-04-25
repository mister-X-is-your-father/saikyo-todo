/**
 * Bulk selection 用 Zustand store。
 * - Backlog view の一括 checkbox で利用
 * - workspace 切替時は clear() を明示的に呼ぶ想定 (URL 遷移 hook 側)
 */
import { create } from 'zustand'

interface BulkSelectionState {
  selected: Set<string>
  toggle: (id: string) => void
  setMany: (ids: string[]) => void
  deselect: (id: string) => void
  clear: () => void
  has: (id: string) => boolean
  size: () => number
  ids: () => string[]
}

export const useBulkSelectionStore = create<BulkSelectionState>((set, get) => ({
  selected: new Set<string>(),
  toggle: (id) =>
    set((state) => {
      const next = new Set(state.selected)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selected: next }
    }),
  setMany: (ids) => set({ selected: new Set(ids) }),
  deselect: (id) =>
    set((state) => {
      if (!state.selected.has(id)) return state
      const next = new Set(state.selected)
      next.delete(id)
      return { selected: next }
    }),
  clear: () => set({ selected: new Set<string>() }),
  has: (id) => get().selected.has(id),
  size: () => get().selected.size,
  ids: () => Array.from(get().selected),
}))
