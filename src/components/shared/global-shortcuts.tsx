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

/**
 * iter1645: 「g + キー → view」 写像。旧 6 段 nested ternary を 1 lookup table に。
 * 視認性 + 拡張性が上がる (= 新規 view 追加時の diff が 1 行)、`Object.keys`
 * での「全 view 一覧」 検査も可能。
 *
 * iter1653: export することで KEYBINDINGS table と invariant test で同期 check 可能化
 * (iter1648 FORM_DESCRIPTORS / iter1649 FocusQuickAddTestId と同 pattern)。
 */
export const G_PREFIX_VIEWS = {
  t: 'today',
  i: 'inbox',
  k: 'kanban',
  b: 'backlog',
  g: 'gantt',
  d: 'dashboard',
} as const

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
        const target = e.key as keyof typeof G_PREFIX_VIEWS
        clearG()
        const v = G_PREFIX_VIEWS[target]
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
