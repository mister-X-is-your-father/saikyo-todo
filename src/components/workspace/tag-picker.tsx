'use client'

/**
 * Tag picker (Item.tags 用 multi-select)。
 * - Popover + cmdk、タグ作成もインラインで
 * - workspace scope、即時 onChange
 */
import { useMemo, useState } from 'react'

import { CheckIcon, PlusIcon, TagIcon } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { useCreateTag, useTags } from '@/features/tag/hooks'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Props {
  workspaceId: string
  value: string[]
  onChange: (tagIds: string[]) => void | Promise<void>
  disabled?: boolean
}

export function TagPicker({ workspaceId, value, onChange, disabled }: Props) {
  const { data: tags, isLoading } = useTags(workspaceId)
  const createTag = useCreateTag(workspaceId)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedSet = useMemo(() => new Set(value), [value])
  const selectedLabels = useMemo(() => {
    const byId = new Map((tags ?? []).map((t) => [t.id, t] as const))
    return value.map((id) => byId.get(id))
  }, [value, tags])

  async function toggle(tagId: string) {
    const next = new Set(selectedSet)
    if (next.has(tagId)) next.delete(tagId)
    else next.add(tagId)
    try {
      await onChange(Array.from(next))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'タグ変更に失敗')
    }
  }

  async function handleCreate() {
    const name = query.trim()
    if (!name) return
    try {
      const created = await createTag.mutateAsync({ workspaceId, name, color: '#64748b' })
      setQuery('')
      await onChange([...value, created.id])
      toast.success(`タグ "${name}" を作成しました`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'タグ作成に失敗')
    }
  }

  const q = query.trim().toLowerCase()
  const existingMatch = (tags ?? []).some((t) => t.name.toLowerCase() === q)
  const canCreate = q.length > 0 && !existingMatch

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          data-testid="tag-picker-trigger"
          className="min-h-11 justify-start gap-2"
          // iter1072: 未選択時 visible "タグなし" が aria-label "タグを選択
          // (現在なし)" の literal substring 不一致 → WCAG 2.5.3 違反。
          // visible-prefix を先頭に固定 (iter1068 / iter1071 と同 sweep)。
          // iter1124: selected case の visible "tag1, tag2" を aria-label 冒頭固定
          // (iter1072 empty case の同 sweep を selected にも展開、iter1093-1123 convention)。
          aria-label={
            selectedLabels.length === 0
              ? 'タグなし — タグを選択 (現在なし)'
              : `${selectedLabels
                  .filter((t): t is NonNullable<typeof t> => Boolean(t))
                  .map((t) => t.name)
                  .join(', ')} — タグを選択 (現在 ${selectedLabels.length} 件)`
          }
          // iter1744: assignee-picker iter1743 と同 pattern。多 tag 時 inner truncate で
          // tag list 切れ、aria-label は browser tooltip にならず sighted は hover で全 tag
          // 見れず。title 付与で sighted hover → 全 tag list disclose (空時 undefined)。
          title={
            selectedLabels.length > 0
              ? selectedLabels
                  .filter((t): t is NonNullable<typeof t> => Boolean(t))
                  .map((t) => t.name)
                  .join(', ')
              : undefined
          }
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <TagIcon className="size-4" aria-hidden="true" />
          {selectedLabels.length === 0 ? (
            // iter1370: iter1369 AssigneePicker と同型。outline button bg (#f5f5f5) 上で
            // text-muted-foreground は 4.5:1 未満 (WCAG 1.4.3)。text-foreground/80 で pass。
            <span className="text-foreground/80" aria-hidden="true">
              タグなし
            </span>
          ) : (
            <span className="flex flex-wrap gap-1" aria-hidden="true">
              {selectedLabels.map((t) =>
                t ? (
                  <span
                    key={t.id}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name}
                  </span>
                ) : null,
              )}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        /* iter1546: 旧 "タグを選択 / 新規作成" は ' を' 助詞接続で iter1093-1545 sweep の
           em-dash 区切と divergent。assignee-picker PopoverContent (iter1545) と同 pattern。 */
        aria-label="タグ — 選択 / 新規作成"
      >
        <Command>
          <CommandInput
            placeholder="タグを検索 or 作成…"
            /* iter1550: 旧 "タグを検索 or 新規作成 (Item に紐付けるラベル、新規 tag は色がランダム生成)" は ' を' 助詞接続で
               iter1093-1549 sweep の em-dash 区切と divergent。iter1549 assignee-picker CommandInput と同 surface 内 pattern。 */
            aria-label="タグ — Item に紐付けるラベルを検索 or 新規作成 (新規 tag は色がランダム生成)"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{isLoading ? '読み込み中…' : '候補なし'}</CommandEmpty>
            <CommandGroup heading="タグ">
              {(tags ?? []).map((t) => {
                const checked = selectedSet.has(t.id)
                return (
                  <CommandItem
                    key={t.id}
                    value={`${t.name} ${t.id}`}
                    onSelect={() => {
                      void toggle(t.id)
                    }}
                    data-testid={`tag-option-${t.id}`}
                    // iter1179: 旧 aria-label 2 path とも visible "{t.name}" を中位置
                    //「タグ「**{t.name}**」」に持ち voice control prefix-matching
                    //「click {t.name}」 match 不可 (substring 一致のみ)。iter1124
                    // trigger 同 pattern を CommandItem (option) にも展開、visible
                    // 冒頭固定 + em-dash 区切で descriptive 末尾保持。
                    aria-label={
                      checked ? `${t.name} — タグ付与中 (クリックで解除)` : `${t.name} — タグを付与`
                    }
                  >
                    <CheckIcon
                      className={cn('mr-2 size-4', checked ? 'opacity-100' : 'opacity-0')}
                      aria-hidden="true"
                    />
                    <span
                      className="mr-2 inline-block size-3 rounded-full"
                      style={{ backgroundColor: t.color }}
                      aria-hidden="true"
                    />
                    <span aria-hidden="true">{t.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {canCreate && (
              <CommandGroup heading="新規作成">
                <CommandItem
                  value={`__create__ ${query}`}
                  onSelect={() => {
                    void handleCreate()
                  }}
                  data-testid="tag-create-new"
                  // iter1225: 旧 CommandItem は aria-label 無、visible content `「query」を作成`
                  // の accessible name は children text composition で voice control「click 作成」
                  // が visible 末尾 "を **作成**" 内に substring としてあるが prefix では無く
                  // match 不可。tag-picker option iter1179 と同 sweep を tag-create-new にも
                  // 展開。visible "{query} を作成" を明示 aria-label に冒頭 visible {query}
                  // 固定 + em-dash 区切で "を作成" descriptive 末尾保持。
                  aria-label={`${query.trim() || '新規 tag'} — 「${query.trim()}」を新規 tag として作成`}
                >
                  <PlusIcon className="mr-2 size-4" aria-hidden="true" />「{query.trim()}」を作成
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
