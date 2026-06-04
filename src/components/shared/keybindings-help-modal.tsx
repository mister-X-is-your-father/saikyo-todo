'use client'

/**
 * `?` 押下 / コマンドパレットから開く「キーボードショートカット一覧」モーダル。
 *
 * - 自前で `keydown` を購読し `?` で open / 既に開いていれば close
 * - input / textarea / contentEditable にフォーカスがある時は無視 (GlobalShortcuts と同じガード)
 * - 親から `open` / `onOpenChange` を渡せるので Command Palette からも制御できる
 */
import { useEffect, useMemo, useRef } from 'react'

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
  // iter1412: `?` / Command Palette から open する controlled dialog で Radix DialogTrigger が
  // 無いため、閉じた後 focus が <body> に落ちる (WCAG 2.4.3)。opener を捕捉し close 時に復帰
  // (iter1411 ItemEditDialog と同 pattern)。
  const openerRef = useRef<HTMLElement | null>(null)
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
        /* iter2071: dialog content に title を付与し sighted hover で dialog 用途 disclose
           (3 section landmark iter2053-2069 と同 hover summary pattern を dialog にも展開)。 */
        title="キーボードショートカット一覧"
        onOpenAutoFocus={() => {
          const active = document.activeElement
          openerRef.current =
            active instanceof HTMLElement && active !== document.body ? active : null
        }}
        onCloseAutoFocus={(e) => {
          const opener = openerRef.current
          if (opener && opener.isConnected) {
            e.preventDefault()
            opener.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>キーボードショートカット</DialogTitle>
          <DialogDescription>
            input にフォーカスがあるときは無効。Esc または `?` で閉じます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {Object.entries(groups).map(([group, list]) => {
            const headingId = `keybindings-group-heading-${group.replace(/\s+/g, '-')}`
            return (
              <section
                key={group}
                aria-labelledby={headingId}
                data-testid={`keybindings-group-${group}`}
              >
                <h3
                  id={headingId}
                  className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase"
                >
                  {group}
                  {/* iter1619: 旧 sr-only paren convention ` (X 件)` は iter1093-1618 sweep の
                      em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */}
                  <span className="sr-only"> — {list.length} 件</span>
                </h3>
                <dl
                  className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2"
                  aria-labelledby={headingId}
                >
                  {list.map((kb) => (
                    <KbdRow key={kb.combo} kb={kb} />
                  ))}
                </dl>
              </section>
            )
          })}
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
        /* iter1552: 旧 aria-label `"ショートカット ${kb.combo}"` は visible "${kb.combo}" を中位置
           "ショートカット **g t**" に持ち voice control prefix-matching「click g t」が
           strict prefix-match で不可 (substring 一致のみ)。iter1093-1551 sweep convention で
           visible 冒頭固定 + em-dash 区切。 */
        aria-label={`${kb.combo} — ショートカット`}
        /* iter2201: keybinding-combo dt の aria-label は browser tooltip にならず sighted は
           hover で "ショートカット" label context disclose 不可。FocusFormCta iter2199 /
           StatCard iter2197 と同 title=aria-label sync pattern。 */
        title={`${kb.combo} — ショートカット`}
      >
        {parts.map((p, i) => (
          <kbd
            key={`${p}-${i}`}
            aria-hidden="true"
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
