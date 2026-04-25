'use client'

/**
 * AI 分解 staging 提案を 1 件ごとに採用 / 却下 / 編集できるパネル。
 * ItemEditDialog の "子タスク" タブに表示。pending 数 > 0 の時のみ自然に出現する。
 *
 * - 行クリックで編集モード (title / description / MUST + DoD)
 * - ✓ で採用 → items に新規 INSERT、accepted_item_id をセット
 * - ✗ で却下 → status_proposal=rejected
 * - "全て却下" / "順次採用" 一括ボタン
 *
 * Realtime 購読は MVP 不要 (1 トリガで Researcher が一気に proposals を吐く想定で、
 * decomposeItem mutation の onSuccess で invalidate しているため即時反映される)。
 */
import { useState } from 'react'

import { Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useAgentInvocationProgressByTarget } from '@/features/agent/realtime'
import {
  useAcceptProposal,
  usePendingProposals,
  useRejectAllPendingProposals,
  useRejectProposal,
  useUpdateProposal,
} from '@/features/decompose-proposal/hooks'
import { useDecomposeProposalsRealtime } from '@/features/decompose-proposal/realtime'
import type { DecomposeProposal } from '@/features/decompose-proposal/schema'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  workspaceId: string
  parentItemId: string
}

export function DecomposeProposalsPanel({ workspaceId, parentItemId }: Props) {
  useDecomposeProposalsRealtime(parentItemId)
  const progress = useAgentInvocationProgressByTarget(parentItemId)
  const proposals = usePendingProposals(parentItemId)
  const accept = useAcceptProposal(workspaceId, parentItemId)
  const reject = useRejectProposal(parentItemId)
  const rejectAll = useRejectAllPendingProposals(parentItemId)

  const list = proposals.data ?? []
  const isAgentRunning = progress.status === 'queued' || progress.status === 'running'
  // 提案が無くて Agent も走っていなければ何も出さない
  if (proposals.isLoading) return null
  if (list.length === 0 && !isAgentRunning) return null

  async function handleAcceptAll() {
    let ok = 0
    for (const p of list) {
      try {
        await accept.mutateAsync(p.id)
        ok += 1
      } catch (e) {
        console.error('[proposals] accept failed', e)
      }
    }
    toast.success(`${ok}/${list.length} 件採用しました`)
  }

  async function handleRejectAll() {
    try {
      const r = await rejectAll.mutateAsync()
      toast.success(`${r.count} 件却下しました`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '却下に失敗')
    }
  }

  return (
    <div
      className="space-y-2 rounded-lg border bg-amber-50/50 p-3 dark:bg-amber-950/20"
      data-testid="decompose-proposals-panel"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles
              className={`h-3.5 w-3.5 text-amber-600 dark:text-amber-400 ${
                isAgentRunning ? 'animate-pulse' : ''
              }`}
            />
            {isAgentRunning ? 'Researcher が分解中…' : `AI 分解の提案 (${list.length})`}
          </div>
          {isAgentRunning ? (
            <p
              className="text-muted-foreground mt-0.5 line-clamp-3 text-xs italic"
              data-testid="agent-streaming-text"
            >
              {progress.streamingText || '思考中…'}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              行ごとに採用 / 却下 / 編集できます。採用すると子タスクとして items に追加されます。
            </p>
          )}
        </div>
        {!isAgentRunning && list.length > 0 && (
          <div className="flex shrink-0 gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={accept.isPending || rejectAll.isPending}
              onClick={() => void handleAcceptAll()}
              data-testid="proposals-accept-all"
            >
              全て採用
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={rejectAll.isPending || accept.isPending}
              onClick={() => void handleRejectAll()}
              data-testid="proposals-reject-all"
            >
              全て却下
            </Button>
          </div>
        )}
      </div>

      <ul className="space-y-1.5" data-testid="proposals-list">
        {list.map((p) => (
          <ProposalRow
            key={p.id}
            proposal={p}
            workspaceId={workspaceId}
            parentItemId={parentItemId}
            onAccept={() => accept.mutateAsync(p.id)}
            onReject={() => reject.mutateAsync(p.id)}
            disabled={accept.isPending || reject.isPending}
          />
        ))}
      </ul>
    </div>
  )
}

interface RowProps {
  proposal: DecomposeProposal
  workspaceId: string
  parentItemId: string
  onAccept: () => Promise<unknown>
  onReject: () => Promise<unknown>
  disabled: boolean
}

function ProposalRow({ proposal, parentItemId, onAccept, onReject, disabled }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(proposal.title)
  const [description, setDescription] = useState(proposal.description)
  const [isMust, setIsMust] = useState(proposal.isMust)
  const [dod, setDod] = useState(proposal.dod ?? '')
  const update = useUpdateProposal(parentItemId)

  async function handleSaveEdit() {
    if (!title.trim()) {
      toast.error('タイトルを入力してください')
      return
    }
    if (isMust && !dod.trim()) {
      toast.error('MUST には DoD が必要です')
      return
    }
    try {
      await update.mutateAsync({
        id: proposal.id,
        patch: {
          title: title.trim(),
          description,
          isMust,
          dod: isMust ? dod.trim() : null,
        },
      })
      setEditing(false)
      toast.success('提案を更新しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '更新に失敗')
    }
  }

  async function handleAccept() {
    try {
      await onAccept()
      toast.success(`「${proposal.title}」を採用しました`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '採用に失敗')
    }
  }

  async function handleReject() {
    try {
      await onReject()
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '却下に失敗')
    }
  }

  if (editing) {
    return (
      <li
        className="space-y-2 rounded border bg-white p-2 dark:bg-slate-900"
        data-testid={`proposal-${proposal.id}-edit`}
      >
        <div className="space-y-1">
          <Label htmlFor={`p-title-${proposal.id}`}>タイトル</Label>
          <IMEInput
            id={`p-title-${proposal.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`p-desc-${proposal.id}`}>説明</Label>
          <IMEInput
            id={`p-desc-${proposal.id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={isMust}
            onChange={(e) => setIsMust(e.target.checked)}
            data-testid={`proposal-${proposal.id}-must`}
          />
          <span className="font-medium text-red-700">MUST</span>
        </label>
        {isMust && (
          <div className="space-y-1">
            <Label htmlFor={`p-dod-${proposal.id}`}>DoD</Label>
            <IMEInput
              id={`p-dod-${proposal.id}`}
              value={dod}
              onChange={(e) => setDod(e.target.value)}
            />
          </div>
        )}
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={update.isPending}
          >
            キャンセル
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSaveEdit()}
            disabled={update.isPending}
            data-testid={`proposal-${proposal.id}-save`}
          >
            {update.isPending ? '保存中…' : '保存'}
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li
      className="flex items-start gap-2 rounded border bg-white px-2 py-1.5 text-sm dark:bg-slate-900"
      data-testid={`proposal-${proposal.id}`}
    >
      <button
        type="button"
        className="hover:bg-muted min-w-0 flex-1 cursor-pointer rounded px-1 py-0.5 text-left transition"
        onClick={() => setEditing(true)}
        data-testid={`proposal-${proposal.id}-edit-btn`}
      >
        <div className="flex items-center gap-1.5">
          {proposal.isMust && (
            <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] text-red-700">MUST</span>
          )}
          <span className="truncate font-medium">{proposal.title}</span>
        </div>
        {proposal.description && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
            {proposal.description}
          </p>
        )}
      </button>
      <div className="flex shrink-0 gap-1">
        <Button
          size="sm"
          variant="default"
          className="h-7 px-2"
          disabled={disabled}
          onClick={() => void handleAccept()}
          data-testid={`proposal-${proposal.id}-accept`}
          title="採用 → 子タスクとして追加"
        >
          ✓ 採用
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          disabled={disabled}
          onClick={() => void handleReject()}
          data-testid={`proposal-${proposal.id}-reject`}
          title="却下"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  )
}
