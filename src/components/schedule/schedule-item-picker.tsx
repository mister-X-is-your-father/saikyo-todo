'use client'

import { useMemo, useState } from 'react'

import { Search } from 'lucide-react'

import type { Item } from '@/features/item/schema'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { MustBadge } from '@/components/workspace/must-badge'

interface Props {
  items: Item[]
  onPick: (input: { itemId: string | null; note?: string | null }) => void
  onCancel: () => void
  /** actual lane で「割込み」(itemId=null) を許す場合 true */
  allowInterrupt?: boolean
}

export function ScheduleItemPicker({ items, onPick, onCancel, allowInterrupt }: Props) {
  const [q, setQ] = useState('')
  const [interruptNote, setInterruptNote] = useState('')

  const filtered = useMemo(() => {
    if (!q.trim()) return items.slice(0, 20)
    const k = q.toLowerCase()
    return items.filter((i) => i.title.toLowerCase().includes(k)).slice(0, 20)
  }, [q, items])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-picker-title"
      aria-keyshortcuts="Escape"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
      className="bg-card fixed inset-0 z-50 m-auto flex h-fit max-h-[80vh] w-full max-w-md flex-col gap-3 rounded-lg border p-4 shadow-2xl"
    >
      <h2 id="schedule-picker-title" className="sr-only">
        {allowInterrupt ? '実績 / 割込みを記録する task を選択' : '想定する task を選択'}
      </h2>
      <div className="flex items-center gap-2">
        <Search className="text-muted-foreground h-4 w-4" aria-hidden="true" />
        {/* iter1017: CLAUDE.md 規約「<input> を直接使わず IMEInput (日本語 Enter submit
            対策)」 適用。schedule-item-picker は task title (日本語) 検索 input なので
            IME 確定 Enter が Escape ハンドラと干渉する可能性を予防的に防ぐ (現状 Enter
            handler 無いが、将来 enter-to-pick 等を足したときの IME hazard を排除)。 */}
        <IMEInput
          autoFocus
          className="h-11"
          aria-label={
            q.length === 0
              ? 'task を検索 (タイトルで部分一致)'
              : `task を検索 (現在のクエリ "${q}" — ${q.length} 文字)`
          }
          placeholder="task を検索…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          /* iter1677: dialog 内 search input は browser autocomplete suggestion が
             dropdown を被せて in-dialog filtering を阻害するため "off"。quick-add iter350
             と同 convention。 */
          autoComplete="off"
        />
      </div>
      <div className="max-h-72 overflow-auto">
        {filtered.length === 0 ? (
          <div
            className="text-muted-foreground py-6 text-center text-sm"
            role="status"
            aria-live="polite"
            data-testid="schedule-picker-empty"
          >
            該当する task が見つかりません
          </div>
        ) : (
          <ul
            className="flex flex-col gap-1"
            aria-label={`検索結果 — ${filtered.length} 件`}
            data-testid="schedule-picker-list"
          >
            {filtered.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onPick({ itemId: it.id })}
                  className="hover:bg-accent focus-visible:ring-ring flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
                  // iter1147: 旧 aria-label `item「title」を選択` は visible title を中位置
                  // (位置 5 "item「**title**」") に持ち voice control prefix-matching
                  //「click {title}」 match 不可。iter1093-1146 sweep convention に揃え
                  // visible title 冒頭固定 + em-dash 区切で descriptive 残す。
                  aria-label={`${it.title} — item を選択${it.isMust ? ' (MUST)' : ''}`}
                >
                  <span className="truncate" aria-hidden="true">
                    {it.title}
                  </span>
                  {it.isMust ? <MustBadge data-testid={`schedule-picker-must-${it.id}`} /> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {allowInterrupt ? (
        <div className="border-t pt-2">
          <label
            htmlFor="schedule-picker-interrupt-note"
            className="text-muted-foreground mb-1 block text-xs"
          >
            割込み / 休憩 として記録 (task に紐付けない)
          </label>
          <div className="flex gap-2">
            {/* iter1017: 同上、CLAUDE.md 規約 IMEInput 採用 (日本語メモ入力)。 */}
            <IMEInput
              id="schedule-picker-interrupt-note"
              className="h-11"
              placeholder="例: 急な電話 / 昼休み"
              value={interruptNote}
              onChange={(e) => setInterruptNote(e.target.value)}
              /* iter1685: interrupt メモは task title 系 hot path (iter350 quick-add
                 convention)、autoComplete suggestion は無関係なので "off"。 */
              autoComplete="off"
              aria-label={
                interruptNote.length === 0
                  ? '割込み / 休憩のメモ (任意、空欄で「割込み」 fallback)'
                  : `割込み / 休憩のメモ (現在 ${interruptNote.length} 文字)`
              }
            />
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              onClick={() => onPick({ itemId: null, note: interruptNote || '割込み' })}
              data-testid="schedule-picker-interrupt-add"
              // iter1071: 旧 aria-label "割込み / 休憩として追加" は visible
              // "割込みとして追加" に対して "/ 休憩" が挿入され literal substring
              // 不一致 → WCAG 2.5.3 違反。visible-prefix を先頭に固定。
              aria-label={`割込みとして追加 — 割込み / 休憩として追加${interruptNote ? ` (メモ: ${interruptNote})` : ''}`}
            >
              <span aria-hidden="true">割込みとして追加</span>
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex justify-end gap-2 border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onCancel}
          data-testid="schedule-picker-cancel"
          // iter1107: visible "キャンセル" を aria-label 冒頭固定 (iter1093-1106 sweep convention)。
          aria-label="キャンセル — task pick を破棄"
        >
          <span aria-hidden="true">キャンセル</span>
        </Button>
      </div>
    </div>
  )
}
