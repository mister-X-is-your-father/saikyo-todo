'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { focusQuickAdd } from '@/lib/ui/focus-quick-add'

/**
 * グローバルキーボードショートカット。
 *
 *   q     → #quick-add-input にフォーカス
 *   g t   → view=today に切替
 *   g i   → view=inbox
 *   g k   → view=kanban
 *   g b   → view=backlog
 *   g g   → view=gantt
 *   g d   → view=dashboard
 *
 * `?` は KeybindingsHelpModal が単独で購読する (open toggle のため)。
 * Cmd+K は CommandPalette が単独で購読する。
 *
 * 一覧は `src/lib/keybindings.ts` の KEYBINDINGS と必ず一致させること。
 *
 * IME 変換中 / input / textarea / contentEditable にフォーカスしてる時は無効。
 */
export function GlobalShortcuts({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()

  useEffect(() => {
    let gPressed = false
    let gTimeout: ReturnType<typeof setTimeout> | null = null
    const clearG = () => {
      gPressed = false
      if (gTimeout) {
        clearTimeout(gTimeout)
        gTimeout = null
      }
    }

    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (t?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (gPressed) {
        const target = e.key
        clearG()
        const v =
          target === 't'
            ? 'today'
            : target === 'i'
              ? 'inbox'
              : target === 'k'
                ? 'kanban'
                : target === 'b'
                  ? 'backlog'
                  : target === 'g'
                    ? 'gantt'
                    : target === 'd'
                      ? 'dashboard'
                      : null
        if (v) {
          e.preventDefault()
          router.push(`/${workspaceId}?view=${v}`)
        }
        return
      }

      if (e.key === 'q') {
        // iter1624: focus + scrollIntoView を `focusQuickAdd` helper に集約。
        // 旧 inline は scrollIntoView 無、本 iter で常に scrollIntoView (off-screen でも視野に入る、WCAG 2.4.3 補完)。
        if (focusQuickAdd()) e.preventDefault()
        return
      }
      if (e.key === 'g') {
        gPressed = true
        gTimeout = setTimeout(clearG, 800)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearG()
    }
  }, [workspaceId, router])

  return null
}
