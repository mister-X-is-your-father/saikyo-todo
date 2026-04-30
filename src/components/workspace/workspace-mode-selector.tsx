'use client'

/**
 * iter518 (queue MS-1 UI): workspace_settings.default_mode 編集 inline editor。
 * 3 値 toggle (none / taskchute / gtd) を radio 群風 button で表示。
 * 詳細: docs/methodology-modes-plan.md §6 (Mode switch UX)
 *
 * - viewer 以下も current mode を見られる (RLS で読める)
 * - mutation で server 側 PermissionError (admin 以上必要)
 * - URL `?mode=` の override は別 hook で対応 (本 component は workspace 設定のみ)
 */
import { ListChecks, Sparkles, Square, Timer } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'
import { cn } from '@/lib/utils'

import {
  useUpdateWorkspaceDefaultMode,
  useWorkspaceDefaultMode,
  type WorkspaceMode,
} from '@/features/workspace/hooks'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  workspaceId: string
}

interface ModeOption {
  value: WorkspaceMode
  label: string
  description: string
  icon: typeof Square
}

const MODE_OPTIONS: readonly ModeOption[] = [
  {
    value: 'none',
    label: 'なし (デフォルト)',
    description: '既存通り。Today / Kanban / Gantt 等の view を自由に使う',
    icon: Square,
  },
  {
    value: 'taskchute',
    label: 'TaskChute',
    description: '1 列タイムライン + 打刻 + 累積残時間。段取り力を鍛える',
    icon: Timer,
  },
  {
    value: 'gtd',
    label: 'GTD',
    description: 'Inbox + Process + Weekly Review。思考力を鍛える',
    icon: ListChecks,
  },
]

export function WorkspaceModeSelector({ workspaceId }: Props) {
  const q = useWorkspaceDefaultMode(workspaceId)
  const upd = useUpdateWorkspaceDefaultMode(workspaceId)

  const current: WorkspaceMode = q.data?.defaultMode ?? 'none'

  async function handleSelect(next: WorkspaceMode) {
    if (next === current || upd.isPending) return
    try {
      await upd.mutateAsync(next)
      toast.success(
        next === 'none'
          ? 'モードを「なし」に戻しました'
          : `「${next === 'taskchute' ? 'TaskChute' : 'GTD'}」モードに切替えました`,
      )
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'モード切替に失敗 (admin 以上が必要)')
    }
  }

  return (
    <Card data-testid="workspace-mode-selector">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm" role="heading" aria-level={2}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          作業モード (workspace default)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="workspace の default 作業モード"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const selected = current === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${opt.label}: ${opt.description}`}
                disabled={upd.isPending}
                onClick={() => void handleSelect(opt.value)}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition',
                  'hover:border-primary/50 hover:bg-accent/40',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  selected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-background',
                  upd.isPending && 'cursor-not-allowed opacity-50',
                )}
                data-testid={`mode-option-${opt.value}`}
                data-selected={selected ? 'true' : 'false'}
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={cn('h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')}
                    aria-hidden="true"
                  />
                  <span className={cn('text-sm font-medium', selected && 'text-primary')}>
                    {opt.label}
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] leading-tight">
                  {opt.description}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-muted-foreground mt-2 text-[11px]">
          URL <code>?mode=taskchute</code> 等で session 単位で override 可能 (workspace
          設定は変えずに試せる)。
        </p>
      </CardContent>
    </Card>
  )
}
