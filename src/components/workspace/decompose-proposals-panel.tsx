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

import { RotateCw, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useCancelInvocation, useDecomposeItem } from '@/features/agent/hooks'
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
import { Textarea } from '@/components/ui/textarea'

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
  const decompose = useDecomposeItem(workspaceId)
  const cancel = useCancelInvocation()

  const list = proposals.data ?? []
  const isAgentRunning = progress.status === 'queued' || progress.status === 'running'
  // 直近 invocation が完了していて、かつ pending=0 のときは "0 件" フォールバック CTA を出す
  const completedWithNoProposals =
    progress.status === 'completed' && list.length === 0 && !isAgentRunning

  if (proposals.isLoading) return null
  // 提案 / Agent 実行中 / フォールバック対象 のいずれかでなければ何も出さない
  if (list.length === 0 && !isAgentRunning && !completedWithNoProposals) return null

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
    if (list.length > 1) {
      // 1 件なら確認なしで OK (個別却下と等価)、複数あれば事故防止に確認を挟む
      if (!window.confirm(`pending な提案 ${list.length} 件をまとめて却下しますか?`)) return
    }
    try {
      const r = await rejectAll.mutateAsync()
      toast.success(`${r.count} 件却下しました`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '却下に失敗')
    }
  }

  async function handleCancel() {
    if (!progress.invocationId) return
    try {
      await cancel.mutateAsync(progress.invocationId)
      toast.success('中止リクエストを送信しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '中止に失敗')
    }
  }

  async function handleRedecompose(opts: { clearExisting: boolean }) {
    try {
      if (opts.clearExisting && list.length > 0) {
        await rejectAll.mutateAsync()
      }
      const r = await decompose.mutateAsync({ workspaceId, itemId: parentItemId })
      const proposed = r.toolCalls.filter((c) => c.name === 'propose_child_item').length
      toast.success(`再分解完了 (${proposed} 件提案)`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '再分解に失敗')
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
            {isAgentRunning
              ? 'Researcher が分解中…'
              : completedWithNoProposals
                ? '提案が出ませんでした'
                : `AI 分解の提案 (${list.length})`}
          </div>
          {isAgentRunning ? (
            <p
              className="text-muted-foreground mt-0.5 line-clamp-3 text-xs italic"
              data-testid="agent-streaming-text"
            >
              {progress.streamingText || '思考中…'}
            </p>
          ) : completedWithNoProposals ? (
            <p className="text-muted-foreground text-xs" data-testid="proposals-empty-msg">
              Researcher は完了しましたが提案を出力しませんでした。
              ヒントを足してもう一度試すか、下の bulk 入力から手動で追加できます。
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              行ごとに採用 / 却下 / 編集できます。採用すると子タスクとして items に追加されます。
            </p>
          )}
        </div>
        {isAgentRunning && progress.invocationId && (
          <div className="flex shrink-0 items-center">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={cancel.isPending}
              onClick={() => void handleCancel()}
              data-testid="agent-cancel"
              title="実行中の Agent を中止"
              aria-label={
                cancel.isPending
                  ? '実行中の Agent を中止中…'
                  : '実行中の Agent を中止 (Researcher / 分解処理を停止)'
              }
            >
              <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              中止
            </Button>
          </div>
        )}
        {!isAgentRunning && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {list.length > 0 && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={accept.isPending || rejectAll.isPending || decompose.isPending}
                  onClick={() => void handleAcceptAll()}
                  data-testid="proposals-accept-all"
                  aria-label={
                    accept.isPending
                      ? `保留中の提案 ${list.length} 件を採用中…`
                      : `保留中の提案 ${list.length} 件をすべて採用`
                  }
                >
                  全て採用
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={rejectAll.isPending || accept.isPending || decompose.isPending}
                  onClick={() => void handleRejectAll()}
                  data-testid="proposals-reject-all"
                  aria-label={
                    rejectAll.isPending
                      ? `保留中の提案 ${list.length} 件を却下中…`
                      : `保留中の提案 ${list.length} 件をすべて却下`
                  }
                >
                  全て却下
                </Button>
              </>
            )}
            {/* 再分解 CTA: pending を残したまま追加 / 全クリアして再生成 */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1"
              disabled={decompose.isPending || rejectAll.isPending}
              onClick={() => void handleRedecompose({ clearExisting: false })}
              data-testid="proposals-redecompose"
              title="既存の提案を残したまま追加で分解"
              aria-label={
                list.length > 0
                  ? `既存の保留中 ${list.length} 件を残して追加で AI 分解`
                  : 'AI 分解を再実行'
              }
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              {list.length > 0 ? '追加分解' : '再分解'}
            </Button>
            {list.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={decompose.isPending || rejectAll.isPending}
                onClick={() => void handleRedecompose({ clearExisting: true })}
                data-testid="proposals-redecompose-fresh"
                title="既存提案を全て却下してから再分解"
                aria-label={`保留中の ${list.length} 件を全て却下してから AI 分解をやり直し`}
              >
                やり直し
              </Button>
            )}
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
        className="rounded border bg-white p-2 dark:bg-slate-900"
        data-testid={`proposal-${proposal.id}-edit`}
      >
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSaveEdit()
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`p-title-${proposal.id}`}>タイトル</Label>
            <IMEInput
              id={`p-title-${proposal.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              aria-required="true"
              minLength={1}
              maxLength={500}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`p-desc-${proposal.id}`}>説明</Label>
            <Textarea
              id={`p-desc-${proposal.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={10000}
              aria-label="提案 description"
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
                required
                aria-required="true"
                minLength={1}
                maxLength={2000}
              />
            </div>
          )}
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={update.isPending}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={update.isPending}
              data-testid={`proposal-${proposal.id}-save`}
              aria-label={
                update.isPending
                  ? `提案「${proposal.title}」の編集を保存中…`
                  : `提案「${proposal.title}」の編集を保存`
              }
            >
              {update.isPending ? '保存中…' : '保存'}
            </Button>
          </div>
        </form>
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
            <span
              className="rounded bg-red-100 px-1 py-0.5 text-[10px] text-red-700"
              role="img"
              aria-label="MUST 提案"
            >
              MUST
            </span>
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
          aria-label={
            disabled
              ? `「${proposal.title}」を採用処理中…`
              : `「${proposal.title}」を採用して子タスクとして追加`
          }
        >
          <span aria-hidden="true">✓ </span>採用
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          disabled={disabled}
          onClick={() => void handleReject()}
          data-testid={`proposal-${proposal.id}-reject`}
          title="却下"
          aria-label={
            disabled ? `「${proposal.title}」を却下処理中…` : `「${proposal.title}」を却下`
          }
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}
