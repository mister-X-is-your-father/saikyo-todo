'use client'

/**
 * Cmd+K / Ctrl+K で開くコマンドパレット (cmdk + shadcn command の薄いラッパ)。
 *
 * 2 モード:
 *   - 通常: commands を表示 (plugin 登録 action 含む)
 *   - `?` プレフィクス: items を fuse.js で fuzzy 検索、選択で onSelectItem
 *
 * iter313 basics: item 検索結果の row を app 共通 graphical pattern に統一
 * (StatusBadge / formatFriendlyDate)。raw ISO `2026-04-30` → `4/30 (木)` /
 * `明日` 等、status icon を追加。FEEDBACK_QUEUE「もっとグラフィカル / 意味の
 * あるデザイン」候補の続編。
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import Fuse from 'fuse.js'

import { formatFriendlyDate } from '@/features/item/date-tokens'
import { priorityClass, priorityLabel } from '@/features/item/priority'
import type { Item } from '@/features/item/schema'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { MustBadge } from '@/components/workspace/must-badge'
import { StatusBadge } from '@/components/workspace/status-badge'

export interface PaletteCommand {
  id: string
  label: string
  group?: string
  run: () => void | Promise<void>
  keywords?: string[]
}

export interface CommandPaletteProps {
  commands: PaletteCommand[]
  items?: Item[]
  onSelectItem?: (item: Item) => void
}

export function CommandPalette({ commands, items, onSelectItem }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // iter1414: CommandDialog は ui/command.tsx 内 (編集禁止) で onCloseAutoFocus を持たず、
  // 閉じた後 focus が <body> に落ちる (WCAG 2.4.3、iter1411-1413 と同根)。consumer 側で
  // open 時の opener を捕捉し、**dismiss 時のみ** 復帰させる (command/item 選択時は run() 側の
  // focus を尊重するため復帰しない)。
  const openerRef = useRef<HTMLElement | null>(null)
  const closedBySelectRef = useRef(false)
  const prevOpenRef = useRef(false)

  // iter263 と同パターン: dueDate を formatFriendlyDate で表示する基準日。
  // 各 render で再計算 (cost 無視できる程度、深夜跨ぎでも正しい今日に追従)。
  const todayRef = new Date()
  const today = new Date(todayRef.getFullYear(), todayRef.getMonth(), todayRef.getDate())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const a = document.activeElement
        const opener = a instanceof HTMLElement && a !== document.body ? a : null
        setOpen((v) => {
          if (!v) openerRef.current = opener // 開く時だけ opener を記録
          return !v
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // iter1414: dismiss (Escape / overlay / Ctrl+K toggle) で閉じた直後、Radix が triggerRef=null を
  // focus して <body> に落とした後に opener へ戻す (rAF で onCloseAutoFocus の後に実行)。
  // command/item 選択での close は closedBySelectRef=true でスキップ (run() の focus を尊重)。
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      if (!closedBySelectRef.current) {
        const opener = openerRef.current
        if (opener && opener.isConnected) {
          requestAnimationFrame(() => {
            if (opener.isConnected) opener.focus()
          })
        }
      }
      closedBySelectRef.current = false
    }
    prevOpenRef.current = open
  }, [open])

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) setQuery('')
  }

  const isItemSearch = query.startsWith('?')
  const itemSearchQuery = isItemSearch ? query.slice(1).trim() : ''

  const itemResults = useMemo(() => {
    if (!items || !isItemSearch) return []
    if (itemSearchQuery === '') return items.slice(0, 20)
    const fuse = new Fuse(items, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'description', weight: 0.3 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    })
    return fuse.search(itemSearchQuery, { limit: 20 }).map((r) => r.item)
  }, [items, isItemSearch, itemSearchQuery])

  const groups = useMemo(() => groupBy(commands, (c) => c.group ?? 'コマンド'), [commands])

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="コマンドパレット"
      description="Cmd / Ctrl+K で開閉、コマンドを検索 or `?` でタスクを fuzzy 検索、Enter で実行、Esc で閉じる"
    >
      <CommandInput
        placeholder="コマンド or ? でタスク検索…"
        /* iter1551: 旧 "コマンドパレット 検索 (コマンド名 or ? でタスクを fuzzy 検索)" は ' を' 助詞接続で
           iter1093-1550 sweep の em-dash 区切と divergent。iter1549/1550 CommandInput
           (assignee-picker / tag-picker) と同 pattern。 */
        aria-label="コマンドパレット — コマンド名 or ? でタスクを fuzzy 検索"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isItemSearch ? (
          <>
            <CommandEmpty>
              {items ? '該当するタスクがありません' : 'タスクを読み込み中…'}
            </CommandEmpty>
            <CommandGroup heading={`タスク検索 "${itemSearchQuery}"`}>
              {itemResults.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.id}`}
                  onSelect={() => {
                    closedBySelectRef.current = true
                    handleOpenChange(false)
                    onSelectItem?.(item)
                  }}
                  data-testid={`palette-item-${item.id}`}
                  // iter1750: inner span truncate で長 item.title 切れ、CommandItem 自体は
                  // aria-label 持つが browser tooltip にならず sighted は hover で全 title
                  // 見れず。title 付与で sighted hover → 全 title disclose
                  // (iter1720-1749 sweep を Cmd+K command palette にも展開、検索結果 list で
                  // 全 task title の即把握向上)。
                  title={item.title}
                >
                  <span
                    className={`mr-2 inline-block h-2 w-2 shrink-0 rounded-full ${priorityClass(item.priority)}`}
                    role="img"
                    aria-label={priorityLabel(item.priority)}
                    /* iter1867: today/inbox/period/taskchute priority dot と統一、palette にも title。 */
                    title={`p${item.priority ?? 4}`}
                  />
                  <StatusBadge
                    status={item.status}
                    className="mr-1.5 shrink-0 text-[10px]"
                    iconOnly
                  />
                  <span className="truncate">{item.title}</span>
                  {item.dueDate && (
                    <time
                      className="text-muted-foreground ml-2 shrink-0 text-[10px] tabular-nums"
                      dateTime={item.dueDate}
                    >
                      <span aria-hidden="true">{formatFriendlyDate(item.dueDate, today)}</span>
                      <span className="sr-only">{`期限 ${item.dueDate}`}</span>
                    </time>
                  )}
                  {item.isMust && <MustBadge className="ml-auto" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : (
          <>
            <CommandEmpty>該当するコマンドがありません</CommandEmpty>
            {/* iter1349: 旧構造は group 間に <CommandSeparator/> (role=separator) を
                listbox (command-list) 直下に置き、listbox が許す子 (option/group) 以外の
                separator を含む aria-required-children 違反 (critical)。CommandGroup の
                heading + 余白で視覚区切は保てるため separator を撤去し、CommandGroup を
                listbox 直下子に。 */}
            {Object.entries(groups).map(([group, list]) => (
              <CommandGroup key={group} heading={group}>
                {list.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={[c.label, ...(c.keywords ?? [])].join(' ')}
                    onSelect={async () => {
                      closedBySelectRef.current = true
                      handleOpenChange(false)
                      await c.run()
                    }}
                  >
                    {c.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </>
        )}
      </CommandList>
    </CommandDialog>
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
