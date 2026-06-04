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
import { useRef } from 'react'

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
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])

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

  // WAI-ARIA radiogroup: 矢印 / Home / End で focus 巡回 (roving tabindex と組合せ)
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % MODE_OPTIONS.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = MODE_OPTIONS.length - 1
    }
    if (nextIndex !== null) {
      e.preventDefault()
      buttonsRef.current[nextIndex]?.focus()
      const target = MODE_OPTIONS[nextIndex]
      if (target) void handleSelect(target.value)
    }
  }

  return (
    <Card
      data-testid="workspace-mode-selector"
      role="region"
      aria-labelledby="workspace-mode-selector-heading"
    >
      <CardHeader className="pb-2">
        <CardTitle
          id="workspace-mode-selector-heading"
          className="flex items-center gap-1.5 text-sm"
          role="heading"
          aria-level={2}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          作業モード (workspace default)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          /* iter1592: 旧 aria-label paren convention `"workspace の default 作業モード (現在: X)"` は
             iter1093-1591 sweep の em-dash 区切と divergent。区切のみ '(現在:' → ' — 現在' に統一、closing ')' は削除。 */
          aria-label={`workspace の default 作業モード — 現在 ${MODE_OPTIONS.find((o) => o.value === current)?.label ?? current}`}
          /* iter2215: workspace-mode radiogroup の aria-label は browser tooltip にならず
             sighted は hover で current mode context disclose 不可。item-decompose-btn iter2213 /
             engineer-trigger-group iter2207 と同 title=aria-label sync pattern。 */
          title={`workspace の default 作業モード — 現在 ${MODE_OPTIONS.find((o) => o.value === current)?.label ?? current}`}
          aria-describedby="workspace-mode-hint"
          aria-busy={upd.isPending || undefined}
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {MODE_OPTIONS.map((opt, index) => {
            const Icon = opt.icon
            const selected = current === opt.value
            return (
              <button
                key={opt.value}
                ref={(el) => {
                  buttonsRef.current[index] = el
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                // iter1226: 旧 aria-label `${opt.label}: ${opt.description}` は visible-prefix
                // 満たすが ": " 区切で iter1093-1225 sweep の em-dash convention と divergence。
                // 視覚 prefix は同じ ({opt.label}) で voice control prefix-matching は変わらないが、
                // codebase 全体の aria-label 統一 (": " → " — ") で SR 読み上げ時の区切が
                // 一貫し、認識コスト下がる。
                aria-label={`${opt.label} — ${opt.description}`}
                tabIndex={selected ? 0 : -1}
                disabled={upd.isPending}
                aria-busy={upd.isPending || undefined}
                onClick={() => void handleSelect(opt.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
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
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <Icon
                    className={cn('h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')}
                  />
                  <span className={cn('text-sm font-medium', selected && 'text-primary')}>
                    {opt.label}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-[11px] leading-tight',
                    // 選択カードは bg-primary/5 の tint 上で muted-foreground が
                    // 4.5:1 を割る (WCAG 1.4.3)。選択時は label と同様 emphasis を
                    // 兼ねて foreground/80 に上げ contrast 担保 (iter1331)。
                    selected ? 'text-foreground/80' : 'text-muted-foreground',
                  )}
                  aria-hidden="true"
                >
                  {opt.description}
                </span>
              </button>
            )
          })}
        </div>
        <p id="workspace-mode-hint" className="text-muted-foreground mt-2 text-[11px]">
          URL <code>?mode=taskchute</code> 等で session 単位で override 可能 (workspace
          設定は変えずに試せる)。
        </p>
      </CardContent>
    </Card>
  )
}
