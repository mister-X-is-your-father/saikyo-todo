'use client'

/**
 * `?` 押下 / コマンドパレットから開く「キーボードショートカット一覧」モーダル。
 *
 * - 自前で `keydown` を購読し `?` で open / 既に開いていれば close
 * - input / textarea / contentEditable にフォーカスがある時は無視 (GlobalShortcuts と同じガード)
 * - 親から `open` / `onOpenChange` を渡せるので Command Palette からも制御できる
 */
import { useEffect, useMemo } from 'react'

import { type Keybinding, KEYBINDINGS } from '@/lib/keybindings'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeybindingsHelpModal({ open, onOpenChange }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return
      if (e.key !== '?') return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (t?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      e.preventDefault()
      onOpenChange(!open)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  const groups = useMemo(() => groupBy(KEYBINDINGS, (k) => k.group), [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        data-testid="keybindings-help-modal"
        aria-label="キーボードショートカット一覧"
      >
        <DialogHeader>
          <DialogTitle>キーボードショートカット</DialogTitle>
          <DialogDescription>
            input にフォーカスがあるときは無効。Esc または `?` で閉じます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {Object.entries(groups).map(([group, list]) => (
            <section key={group} data-testid={`keybindings-group-${group}`}>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                {group}
              </h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                {list.map((kb) => (
                  <KbdRow key={kb.combo} kb={kb} />
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function KbdRow({ kb }: { kb: Keybinding }) {
  // `g t` のようなチェーンは個別の <kbd> に分けて表示
  const parts = kb.combo.split(/\s+/)
  return (
    <>
      <dt
        className="flex items-center gap-1 whitespace-nowrap"
        data-testid={`keybinding-combo-${kb.combo}`}
      >
        {parts.map((p, i) => (
          <kbd
            key={`${p}-${i}`}
            className="bg-muted text-foreground inline-flex min-w-[1.5rem] items-center justify-center rounded border px-1.5 py-0.5 font-mono text-xs"
          >
            {p}
          </kbd>
        ))}
      </dt>
      <dd className="text-foreground text-sm">{kb.description}</dd>
    </>
  )
}

function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of arr) {
    const k = key(item)
    ;(out[k] ??= []).push(item)
  }
  return out
}
