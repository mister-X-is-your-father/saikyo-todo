'use client'

import { useMemo, useState } from 'react'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useCreateItem } from '@/features/item/hooks'
import { parseQuickAdd } from '@/features/item/nl-parse'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'

const PRIO_COLOR: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-blue-100 text-blue-700',
  4: 'bg-slate-100 text-slate-700',
}

/**
 * 1 行 TODO クイック追加。
 *   - 入力中に nl-parse の結果を右に chip で preview
 *   - Enter (IME 無視) で create
 *   - 末尾 `?` で Researcher decompose を enqueue (parse.decomposeHint=true)
 */
export function QuickAdd({ workspaceId }: { workspaceId: string }) {
  const [text, setText] = useState('')
  const create = useCreateItem(workspaceId)

  const preview = useMemo(
    () => (text.trim() ? parseQuickAdd(text, { today: new Date() }) : null),
    [text],
  )

  async function submit() {
    if (!preview || !preview.title) return
    if (preview.isMust) {
      // MUST + DoD 必須制約 — QuickAdd では DoD が無いので case 先送り
      toast.error('MUST を使うには編集ダイアログで DoD を入れてください')
      return
    }
    try {
      await create.mutateAsync({
        workspaceId,
        title: preview.title,
        description: '',
        status: 'todo',
        priority: preview.priority ?? 4,
        isMust: false,
        dueDate: preview.dueDate ?? null,
        dueTime: preview.dueTime ?? null,
        scheduledFor: preview.scheduledFor ?? null,
        idempotencyKey: crypto.randomUUID(),
      })
      // decomposeHint は enqueueResearcher — post-create で Server Action 呼ぶ (Phase 2 で配線)
      toast.success(
        preview.decomposeHint ? '作成しました (AI 分解は Phase 2 で配線予定)' : '作成しました',
      )
      setText('')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗しました')
    }
  }

  return (
    <div className="space-y-2" data-testid="quick-add">
      <div className="flex gap-2">
        <IMEInput
          id="quick-add-input"
          placeholder='例: "明日15時 p1 #会議 打ち合わせ準備"  (Enter で作成)'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void submit()
            }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={create.isPending || !preview?.title}
          data-testid="quick-add-submit"
        >
          {create.isPending ? '...' : '作成'}
        </Button>
      </div>
      {preview && preview.title && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
          <span className="truncate font-mono">→ {preview.title}</span>
          {preview.scheduledFor && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
              {preview.scheduledFor}
              {preview.dueTime ? ` ${preview.dueTime}` : ''}
            </span>
          )}
          {preview.priority && (
            <span className={`rounded px-1.5 py-0.5 ${PRIO_COLOR[preview.priority]}`}>
              p{preview.priority}
            </span>
          )}
          {preview.tags.map((t) => (
            <span key={t} className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">
              #{t}
            </span>
          ))}
          {preview.assignees.map((a) => (
            <span key={a} className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">
              @{a}
            </span>
          ))}
          {preview.isMust && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700">MUST</span>
          )}
          {preview.decomposeHint && (
            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-700">🧠 AI 分解</span>
          )}
        </div>
      )}
      <p className="text-muted-foreground text-[11px]">
        キーワード: 明日/今日/明後日/来週X曜/HH:MM/p1-p4/#tag/@user/MUST。末尾 <code>?</code> で AI
        分解候補化。
      </p>
    </div>
  )
}
