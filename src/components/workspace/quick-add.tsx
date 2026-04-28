'use client'

import { useMemo, useState } from 'react'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useDecomposeItem } from '@/features/agent/hooks'
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
  const decompose = useDecomposeItem(workspaceId)

  const preview = useMemo(
    () => (text.trim() ? parseQuickAdd(text, { today: new Date() }) : null),
    [text],
  )

  /**
   * preview chip 状態を SR 向け一文に集約 (aria-live で読み上げる対象)。
   * "予定: 2026-04-28 / 優先度: 最優先 / タグ: 会議 / 担当: alice / MUST / AI 分解候補"
   */
  const previewSummary = useMemo(() => {
    if (!preview || !preview.title) return ''
    const parts: string[] = []
    if (preview.scheduledFor) {
      parts.push(`予定: ${preview.scheduledFor}${preview.dueTime ? ` ${preview.dueTime}` : ''}`)
    }
    if (preview.priority) parts.push(`優先度 p${preview.priority}`)
    if (preview.tags.length > 0) parts.push(`タグ: ${preview.tags.join(', ')}`)
    if (preview.assignees.length > 0) parts.push(`担当: ${preview.assignees.join(', ')}`)
    if (preview.isMust) parts.push('MUST')
    if (preview.decomposeHint) parts.push('AI 分解候補')
    return parts.length > 0 ? parts.join(' / ') : 'なし'
  }, [preview])

  async function submit() {
    if (!preview || !preview.title) return
    if (preview.isMust) {
      // MUST + DoD 必須制約 — QuickAdd では DoD が無いので case 先送り
      toast.error('MUST を使うには編集ダイアログで DoD を入れてください')
      return
    }
    try {
      const created = await create.mutateAsync({
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
      setText('')
      // Phase 6.15 iter 231: 末尾 `?` で AI 分解を fire-and-forget で起動。
      // toast.success は即時表示し、分解結果 (子タスク作成) は items realtime で非同期に反映。
      // 失敗しても作成自体は成功しているので警告 toast のみ。
      if (preview.decomposeHint && created?.id) {
        toast.success(`作成しました — Researcher が「${preview.title}」を分解中…`)
        void decompose
          .mutateAsync({ workspaceId, itemId: created.id })
          .then((r) => {
            const proposed = r.toolCalls.filter((c) => c.name === 'propose_child_item').length
            const made = r.toolCalls.filter((c) => c.name === 'create_item').length
            if (proposed > 0) {
              toast.success(`AI 分解完了 — 提案 ${proposed} 件 (子タスクタブで確認)`)
            } else if (made > 0) {
              toast.success(`AI 分解完了 (子 ${made} 件作成)`)
            } else {
              toast.success('AI 分解完了')
            }
          })
          .catch((err) => {
            toast.warning(isAppError(err) ? `AI 分解失敗: ${err.message}` : 'AI 分解に失敗しました')
          })
      } else {
        toast.success('作成しました')
      }
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
          aria-label="クイック追加 — タスクをすばやく作成 (Enter で確定、自然言語で日時・優先度・タグを指定可)"
          aria-describedby="quick-add-preview quick-add-hint"
          maxLength={500}
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
          aria-label={
            !preview?.title
              ? 'タスクを作成するにはタイトルを入力してください'
              : create.isPending
                ? `「${preview.title}」を作成中…`
                : `「${preview.title}」を作成`
          }
        >
          {create.isPending ? '...' : '作成'}
        </Button>
      </div>
      {preview && preview.title && (
        <div
          id="quick-add-preview"
          className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`解析結果: ${previewSummary}`}
        >
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
            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-700">
              <span aria-hidden="true">🧠 </span>AI 分解
            </span>
          )}
        </div>
      )}
      <p id="quick-add-hint" className="text-muted-foreground text-[11px]">
        キーワード: 明日/今日/明後日/来週X曜/+Nd (N 日後)/+Nw (N 週後)/HH:MM/p1-p4/#tag/@user/MUST。
        末尾 <code>?</code> で AI 分解候補化。
      </p>
    </div>
  )
}
