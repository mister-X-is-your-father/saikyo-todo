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
          // iter1123: visible "未アサイン" / member names を aria-label 冒頭固定
          // (iter1072 tag-picker pioneer + iter1093-1122 sweep convention)。
          aria-label={
            selectedLabels.length === 0
              ? '未アサイン — アサインを選択 (現在未アサイン)'
              : `${selectedLabels.join(', ')} — アサインを選択 (現在 ${selectedLabels.length} 件)`
          }
          // iter1743: 多 assignee 時 inner span truncate で long member 名 list 切れ、
          // aria-label は browser tooltip にならず sighted は hover で全 member 見れず。
          // title 付与で sighted hover → 全 member list disclose (iter1720-1742 sweep を
          // assignee-picker にも展開、多選択 list の visibility 改善)。
          // iter2301: iter1743 は non-empty 時のみ title (= 全 list) で empty 時は title=undefined。
          // empty 時の aria-label "未アサイン — アサインを選択 (現在未アサイン)" の "アサインを
          // 選択" 操作 hint が sighted hover で disclose 不可だった (iter1743 design 当時は
          // この hint 未追加だった)。両 path とも aria-label と同 text の title に揃え、
          // empty 時は select hint、non-empty 時は full list を hover disclose。MCP path A で
          // ItemEditDialog 探索中に発見。
          title={
            selectedLabels.length === 0
              ? '未アサイン — アサインを選択 (現在未アサイン)'
              : `${selectedLabels.join(', ')} — アサインを選択 (現在 ${selectedLabels.length} 件)`
          }
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <UserIcon className="size-4" aria-hidden="true" />
          {selectedLabels.length === 0 ? (
            // iter1369: outline button bg (#f5f5f5) 上で text-muted-foreground は 4.34:1
            // (<4.5、WCAG 1.4.3)。text-foreground/80 で placeholder の淡さを保ちつつ pass。
            <span className="text-foreground/80" aria-hidden="true">
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
        /* iter1545: 旧 "アサイン (メンバー / AI Agent) を選択" は ' を' 助詞接続。
           iter1093-1544 sweep convention に揃え em-dash 区切。 */
        aria-label="アサイン — メンバー / AI Agent を選択"
        /* iter2251: assignee-picker PopoverContent も tag-picker と pair で title 付与。
           picker family 2 element (tag / assignee) PopoverContent title 完成、共通の
           「選択 popover」 hover disclose pattern を統一。 */
        title="アサイン — メンバー / AI Agent を選択"
      >
        <Command>
          <CommandInput
            placeholder="メンバー / AI を検索…"
            /* iter1549: 旧 "アサイン候補を検索 (workspace メンバー / AI Agent)" は ' を' 助詞接続で
               iter1093-1548 sweep の em-dash 区切と divergent。iter1545 PopoverContent と同 surface 内で
               aria-label convention 統一。 */
            aria-label="アサイン候補 — workspace メンバー / AI Agent を検索"
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
                    // iter1180: 旧 aria-label 2 path とも visible "{label}" を中位置
                    //「「**{label}**」」に持ち voice control prefix-matching「click {label}」
                    // match 不可。iter1123 trigger 同 pattern を user option にも展開、
                    // visible 冒頭固定 + em-dash 区切で descriptive 末尾保持。
                    aria-label={
                      checked ? `${label} — アサイン中 (クリックで解除)` : `${label} — アサインする`
                    }
                  >
                    <CheckIcon
                      className={cn('mr-2 size-4', checked ? 'opacity-100' : 'opacity-0')}
                      aria-hidden="true"
                    />
                    <span aria-hidden="true">{label}</span>
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
                      // iter1180: 旧 aria-label 2 path とも visible "{label}" を中位置
                      //「AI Agent「**{label}**」」に持ち voice control prefix-matching
                      //「click {label}」 match 不可。visible 冒頭固定 + em-dash 区切で
                      // descriptive 末尾保持 (AI Agent 文脈情報は末尾)。
                      aria-label={
                        checked
                          ? `${label} — AI Agent アサイン中 (クリックで解除)`
                          : `${label} — AI Agent をアサイン`
                      }
                    >
                      <CheckIcon
                        className={cn('mr-2 size-4', checked ? 'opacity-100' : 'opacity-0')}
                        aria-hidden="true"
                      />
                      <BotIcon className="text-muted-foreground mr-2 size-4" aria-hidden="true" />
                      <span aria-hidden="true">{label}</span>
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
