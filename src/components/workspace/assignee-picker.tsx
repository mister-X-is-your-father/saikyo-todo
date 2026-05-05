'use client'

/**
 * Assignee picker (Item.assignees 用 combobox)。
 * - Popover + cmdk (Command) の combobox パターン
 * - workspace member (user) と AI agent (actor_type='agent') の両方を選択可能
 * - 保存は親からの onChange で即時反映
 *
 * P0「AI 自動実行モード」 scope A iter4 (iter509): AI agent を選択肢に追加。
 * iter508 で整備した `useWorkspaceAgents` / `assigneeRefEquals` /
 * `toggleAssigneeRef` / `formatAgentRoleLabelJa` を組み合わせる。
 */
import { useMemo, useState } from 'react'

import { BotIcon, CheckIcon, UserIcon } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { useWorkspaceAgents } from '@/features/agent/hooks'
import { formatAgentRoleLabelJa, toggleAssigneeRef } from '@/features/item/ai-assignee'
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
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId)
  const { data: agents, isLoading: agentsLoading } = useWorkspaceAgents(workspaceId)
  const [open, setOpen] = useState(false)

  const isLoading = membersLoading || agentsLoading

  const selectedUserIds = useMemo(
    () => new Set(value.filter((v) => v.actorType === 'user').map((v) => v.actorId)),
    [value],
  )
  const selectedAgentIds = useMemo(
    () => new Set(value.filter((v) => v.actorType === 'agent').map((v) => v.actorId)),
    [value],
  )

  const userLabelFor = (userId: string) =>
    members?.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 6)
  const agentLabelFor = (agentId: string) => {
    const a = agents?.find((x) => x.id === agentId)
    return a ? formatAgentRoleLabelJa(a.role) : `AI ${agentId.slice(0, 6)}`
  }

  const selectedLabels = useMemo(() => {
    const userLabels = Array.from(selectedUserIds).map(userLabelFor)
    const agentLabels = Array.from(selectedAgentIds).map(agentLabelFor)
    return [...userLabels, ...agentLabels]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserIds, selectedAgentIds, members, agents])

  async function toggle(ref: AssigneeRef) {
    const next = toggleAssigneeRef(value, ref)
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
          className="min-h-11 justify-start gap-2"
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
            <span className="text-muted-foreground" aria-hidden="true">
              未アサイン
            </span>
          ) : (
            <span className="truncate" aria-hidden="true">
              {selectedLabels.join(', ')}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
        aria-label="アサイン (メンバー / AI Agent) を選択"
      >
        <Command>
          <CommandInput
            placeholder="メンバー / AI を検索…"
            aria-label="アサイン候補を検索 (workspace メンバー / AI Agent)"
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? '読み込み中…' : 'メンバー / AI が見つかりません'}
            </CommandEmpty>
            <CommandGroup heading="ワークスペース メンバー">
              {(members ?? []).map((m) => {
                const checked = selectedUserIds.has(m.userId)
                const label = m.displayName ?? m.userId.slice(0, 6)
                const ref: AssigneeRef = { actorType: 'user', actorId: m.userId }
                return (
                  <CommandItem
                    key={m.userId}
                    value={`${label} ${m.userId}`}
                    onSelect={() => {
                      void toggle(ref)
                    }}
                    data-testid={`assignee-option-${m.userId}`}
                    aria-label={
                      checked
                        ? `「${label}」をアサイン中 (クリックで解除)`
                        : `「${label}」をアサインする`
                    }
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
            {(agents ?? []).length > 0 && (
              <CommandGroup heading="AI エージェント">
                {(agents ?? []).map((a) => {
                  const checked = selectedAgentIds.has(a.id)
                  const label = formatAgentRoleLabelJa(a.role)
                  const ref: AssigneeRef = { actorType: 'agent', actorId: a.id }
                  return (
                    <CommandItem
                      key={a.id}
                      value={`${label} ${a.role} ${a.id}`}
                      onSelect={() => {
                        void toggle(ref)
                      }}
                      data-testid={`assignee-option-agent-${a.role}`}
                      aria-label={
                        checked
                          ? `AI Agent「${label}」をアサイン中 (クリックで解除)`
                          : `AI Agent「${label}」をアサインする`
                      }
                    >
                      <CheckIcon
                        className={cn('mr-2 size-4', checked ? 'opacity-100' : 'opacity-0')}
                        aria-hidden="true"
                      />
                      <BotIcon className="text-muted-foreground mr-2 size-4" aria-hidden="true" />
                      {label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
