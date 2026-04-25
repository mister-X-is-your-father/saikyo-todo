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
          className="h-8 justify-start gap-2"
        >
          <TagIcon className="size-4" />
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground">タグなし</span>
          ) : (
            <span className="flex flex-wrap gap-1">
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
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="タグを検索 or 作成…" value={query} onValueChange={setQuery} />
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
                  >
                    <CheckIcon
                      className={cn('mr-2 size-4', checked ? 'opacity-100' : 'opacity-0')}
                    />
                    <span
                      className="mr-2 inline-block size-3 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
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
                >
                  <PlusIcon className="mr-2 size-4" />「{query.trim()}」を作成
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
