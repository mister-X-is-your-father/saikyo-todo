'use client'

/**
 * Assignee picker (Item.assignees 用 combobox)。
 * - Popover + cmdk (Command) の combobox パターン
 * - workspace member (user) 複数選択、actor_type='user' のみ (agent は POST_MVP)
 * - 保存は親からの onChange で即時反映
 */
import { useMemo, useState } from 'react'

import { CheckIcon, UserIcon } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import type { AssigneeRef } from '@/features/item/repository'
import { useWorkspaceMembers } from '@/features/workspace/hooks'

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
  value: AssigneeRef[]
  onChange: (next: AssigneeRef[]) => void | Promise<void>
  disabled?: boolean
}

export function AssigneePicker({ workspaceId, value, onChange, disabled }: Props) {
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId)
  const [open, setOpen] = useState(false)

  const selectedUserIds = useMemo(
    () => new Set(value.filter((v) => v.actorType === 'user').map((v) => v.actorId)),
    [value],
  )

  const labelFor = (userId: string) =>
    members?.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 6)

  const selectedLabels = useMemo(() => {
    return Array.from(selectedUserIds).map(labelFor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserIds, members])

  async function toggle(userId: string) {
    const isSelected = selectedUserIds.has(userId)
    const nextUserIds = new Set(selectedUserIds)
    if (isSelected) nextUserIds.delete(userId)
    else nextUserIds.add(userId)
    const next: AssigneeRef[] = Array.from(nextUserIds).map((id) => ({
      actorType: 'user',
      actorId: id,
    }))
    try {
      await onChange(next)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'assignee 変更に失敗')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          data-testid="assignee-picker-trigger"
          className="h-8 justify-start gap-2"
          aria-label={
            selectedLabels.length === 0
              ? 'アサインを選択 (現在未アサイン)'
              : `アサインを選択 (現在 ${selectedLabels.length} 件: ${selectedLabels.join(', ')})`
          }
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <UserIcon className="size-4" aria-hidden="true" />
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground">未アサイン</span>
          ) : (
            <span className="truncate">{selectedLabels.join(', ')}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="メンバーを検索…" />
          <CommandList>
            <CommandEmpty>{isLoading ? '読み込み中…' : 'メンバーが見つかりません'}</CommandEmpty>
            <CommandGroup heading="ワークスペース メンバー">
              {(members ?? []).map((m) => {
                const checked = selectedUserIds.has(m.userId)
                const label = m.displayName ?? m.userId.slice(0, 6)
                return (
                  <CommandItem
                    key={m.userId}
                    value={`${label} ${m.userId}`}
                    onSelect={() => {
                      void toggle(m.userId)
                    }}
                    data-testid={`assignee-option-${m.userId}`}
                  >
                    <CheckIcon
                      className={cn('mr-2 size-4', checked ? 'opacity-100' : 'opacity-0')}
                      aria-hidden="true"
                    />
                    {label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
