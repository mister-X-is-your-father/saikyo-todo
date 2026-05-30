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
import { useRef, useState } from 'react'

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

import { MustBadge } from './must-badge'

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
      await cancel.mutateAsync({
        invocationId: progress.invocationId,
        targetItemId: parentItemId,
      })
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
        <div
          className="min-w-0 flex-1"
          role="status"
          aria-live="polite"
          data-testid="decompose-proposals-status"
        >
          <div
            className="flex items-center gap-1.5 text-sm font-semibold"
            role="heading"
            aria-level={3}
          >
            <Sparkles
              className={`h-3.5 w-3.5 text-amber-600 dark:text-amber-400 ${
                isAgentRunning ? 'motion-safe:animate-pulse' : ''
              }`}
              aria-hidden="true"
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
            <p
              className="text-muted-foreground text-xs"
              data-testid="proposals-empty-msg"
              role="status"
              aria-live="polite"
            >
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
              className="min-h-11"
              variant="ghost"
              disabled={cancel.isPending}
              aria-busy={cancel.isPending || undefined}
              onClick={() => void handleCancel()}
              data-testid="agent-cancel"
              title="実行中の Agent を中止"
              // iter1166: 旧 aria-label 2 path とも visible "中止" を中位置 "Agent を
              // **中止** ..." に持ち voice control prefix-matching「click 中止」
              // match 不可。iter1093-1165 sweep convention に揃え visible "中止"
              // 冒頭固定 + em-dash 区切で descriptive 末尾保持。
              aria-label={
                cancel.isPending
                  ? '中止 — 実行中の Agent を中止中…'
                  : '中止 — 実行中の Agent を中止 (Researcher / 分解処理を停止)'
              }
            >
              <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              <span aria-hidden="true">中止</span>
            </Button>
          </div>
        )}
        {!isAgentRunning && (
          <div
            className="flex shrink-0 flex-wrap items-center justify-end gap-1.5"
            role="group"
            aria-label={`AI 分解提案の bulk 操作 (全て採用 / 全て却下 / 再分解、保留中 ${list.length} 件)`}
          >
            {list.length > 0 && (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  variant="outline"
                  disabled={accept.isPending || rejectAll.isPending || decompose.isPending}
                  aria-busy={accept.isPending || undefined}
                  onClick={() => void handleAcceptAll()}
                  data-testid="proposals-accept-all"
                  // iter1046: visible "全て採用" / "全て却下" を aria-label の prefix に
                  // 固定し WCAG 2.5.3 satisfy (旧 aria-label は "すべて採用" / "すべて却下"
                  // で kana 不一致 = literal "全て採用" / "全て却下" substring 無し)。
                  aria-label={
                    accept.isPending
                      ? `全て採用 — 保留中の提案 ${list.length} 件を採用中…`
                      : `全て採用 — 保留中の提案 ${list.length} 件をすべて採用`
                  }
                >
                  <span aria-hidden="true">全て採用</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  variant="ghost"
                  disabled={rejectAll.isPending || accept.isPending || decompose.isPending}
                  aria-busy={rejectAll.isPending || undefined}
                  onClick={() => void handleRejectAll()}
                  data-testid="proposals-reject-all"
                  aria-label={
                    rejectAll.isPending
                      ? `全て却下 — 保留中の提案 ${list.length} 件を却下中…`
                      : `全て却下 — 保留中の提案 ${list.length} 件をすべて却下`
                  }
                >
                  <span aria-hidden="true">全て却下</span>
                </Button>
              </>
            )}
            {/* 再分解 CTA: pending を残したまま追加 / 全クリアして再生成 */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11 gap-1"
              disabled={decompose.isPending || rejectAll.isPending}
              aria-busy={decompose.isPending || undefined}
              onClick={() => void handleRedecompose({ clearExisting: false })}
              data-testid="proposals-redecompose"
              title="既存の提案を残したまま追加で分解"
              // iter1046: visible "追加分解" / "再分解" を aria-label の prefix に
              // 固定し WCAG 2.5.3 satisfy (旧 aria-label は "追加で AI 分解" /
              // "AI 分解を再実行" で literal substring 無し)。
              aria-label={
                list.length > 0
                  ? `追加分解 — 既存の保留中 ${list.length} 件を残して追加で AI 分解`
                  : '再分解 — AI 分解を再実行'
              }
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span aria-hidden="true">{list.length > 0 ? '追加分解' : '再分解'}</span>
            </Button>
            {list.length > 0 && (
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                variant="ghost"
                disabled={decompose.isPending || rejectAll.isPending}
                aria-busy={decompose.isPending || undefined}
                onClick={() => void handleRedecompose({ clearExisting: true })}
                data-testid="proposals-redecompose-fresh"
                title="既存提案を全て却下してから再分解"
                // iter1122: visible "やり直し" を aria-label 冒頭固定 (iter1093-1121 sweep)。
                aria-label={`やり直し — 保留中の ${list.length} 件を全て却下してから AI 分解をやり直し`}
              >
                <span aria-hidden="true">やり直し</span>
              </Button>
            )}
          </div>
        )}
      </div>

      <ul
        className="space-y-1.5"
        data-testid="proposals-list"
        aria-label={`AI 分解提案 一覧 ${list.length} 件`}
      >
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
  // iter500: validation 失敗 path で first invalid field に focus shift
  // (iter499 CreateTimeEntryForm pattern を続編、manual handleSubmit 系 form の
  // a11y 統一)。
  const titleRef = useRef<HTMLInputElement>(null)
  const dodRef = useRef<HTMLInputElement>(null)

  async function handleSaveEdit() {
    if (!title.trim()) {
      toast.error('タイトルを入力してください')
      titleRef.current?.focus()
      titleRef.current?.select()
      return
    }
    if (isMust && !dod.trim()) {
      toast.error('MUST には DoD が必要です')
      dodRef.current?.focus()
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
          noValidate
          aria-label={`提案「${proposal.title}」の編集フォーム`}
          aria-busy={update.isPending || undefined}
          data-testid={`proposal-${proposal.id}-edit-form`}
          onSubmit={(e) => {
            e.preventDefault()
            void handleSaveEdit()
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`p-title-${proposal.id}`}>タイトル</Label>
            <IMEInput
              ref={titleRef}
              id={`p-title-${proposal.id}`}
              className="h-11"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              aria-required="true"
              aria-invalid={!title.trim() || undefined}
              minLength={1}
              maxLength={500}
              enterKeyHint="next"
              // iter1201: 旧 aria-label `提案タイトル (...)` (全 4 path) は visible Label
              // "タイトル" を中位置 "提案 **タイトル** (...)" に持ち voice control
              // prefix-matching「click タイトル」 match 不可 (substring 一致のみ)。
              // sprint-defaults-length iter1200 と同 sweep を p-title-${id} にも展開。
              // Input は htmlFor Label が visible なので Label text "タイトル" を冒頭固定。
              aria-label={
                title.length === 0
                  ? 'タイトル — 提案タイトル (必須、最大 500 文字)'
                  : title.trim() === ''
                    ? `タイトル — 提案タイトル (現在 ${title.length} / 500 文字、空白のみは不正)`
                    : title.length > 480
                      ? `タイトル — 提案タイトル (現在 ${title.length} / 500 文字、上限近接)`
                      : `タイトル — 提案タイトル (現在 ${title.length} / 500 文字)`
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`p-desc-${proposal.id}`}>説明 (Cmd/Ctrl+Enter で保存)</Label>
            <Textarea
              id={`p-desc-${proposal.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              // iter317: Cmd/Ctrl+Enter で保存 (iter313-316 と同 pattern、form 内 Textarea
              // でも default Enter は改行のため modifier 併用必須)。title 空 / pending 中は noop。
              onKeyDown={(e) => {
                if (
                  (e.metaKey || e.ctrlKey) &&
                  e.key === 'Enter' &&
                  !e.nativeEvent.isComposing &&
                  title.trim() &&
                  !update.isPending
                ) {
                  e.preventDefault()
                  void handleSaveEdit()
                }
              }}
              rows={3}
              maxLength={10000}
              aria-keyshortcuts="Meta+Enter Control+Enter"
              // iter1202: 旧 aria-label `提案 description (...)` (全 3 path) は visible
              // Label "説明 (Cmd/Ctrl+Enter で保存)" を全く含まず WCAG 2.5.3 (Label in
              // Name) 違反 + voice control「click 説明」 match 不可 (ja "説明" → en
              // "description" の language divergence)。p-title iter1201 と同 sweep を
              // p-desc Textarea にも展開。Textarea は htmlFor Label が visible なので
              // Label text "説明" を冒頭固定 + em-dash 区切で descriptive 末尾保持。
              aria-label={
                description.length === 0
                  ? '説明 — 提案 description (任意、最大 10000 文字、Markdown 可、Cmd/Ctrl+Enter で保存)'
                  : description.length > 9500
                    ? `説明 — 提案 description (現在 ${description.length} / 10000 文字、上限近接、Cmd/Ctrl+Enter で保存)`
                    : `説明 — 提案 description (現在 ${description.length} / 10000 文字、Cmd/Ctrl+Enter で保存)`
              }
            />
          </div>
          <label className="flex min-h-11 items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={isMust}
              onChange={(e) => setIsMust(e.target.checked)}
              data-testid={`proposal-${proposal.id}-must`}
              aria-label={
                isMust
                  ? 'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'
                  : 'MUST が OFF: 通常タスク — クリックで ON、DoD 必須化'
              }
            />
            {/* iter1371: item-edit-dialog と同型。dark card bg で text-red-700 は <4.5。 */}
            <span className="font-medium text-red-700 dark:text-red-400" aria-hidden="true">
              MUST
            </span>
          </label>
          {isMust && (
            <div className="space-y-1">
              <Label htmlFor={`p-dod-${proposal.id}`}>DoD</Label>
              <IMEInput
                ref={dodRef}
                id={`p-dod-${proposal.id}`}
                className="h-11"
                value={dod}
                onChange={(e) => setDod(e.target.value)}
                required
                aria-required="true"
                aria-invalid={(isMust && !dod.trim()) || undefined}
                minLength={1}
                maxLength={2000}
                enterKeyHint="send"
                // iter1210: 旧 aria-label `提案 DoD (...)` (全 4 path) は visible Label
                // "DoD" を中位置 "提案 **DoD** (...)" に持ち voice control prefix-matching
                // 「click DoD」 match 不可 (substring 一致のみ)。p-title iter1201 / p-desc
                // iter1202 と同 sweep を p-dod にも展開。Input は htmlFor Label が visible
                // なので Label text "DoD" を冒頭固定 + em-dash 区切で descriptive 末尾保持。
                aria-label={
                  dod.length === 0
                    ? 'DoD — 提案 DoD (MUST 必須、最大 2000 文字、完了条件を具体記述)'
                    : dod.trim() === ''
                      ? `DoD — 提案 DoD (現在 ${dod.length} / 2000 文字、空白のみは不正)`
                      : dod.length > 1900
                        ? `DoD — 提案 DoD (現在 ${dod.length} / 2000 文字、上限近接)`
                        : `DoD — 提案 DoD (現在 ${dod.length} / 2000 文字)`
                }
              />
            </div>
          )}
          <div
            className="flex justify-end gap-1"
            role="group"
            aria-label={`提案「${proposal.title}」の編集 form 操作 (キャンセル / 保存)`}
          >
            {/* iter1106: visible-prefix sweep (iter1093-1105) を decompose-proposal edit
                buttons にも展開。visible "キャンセル" / "保存" / "保存中…" を冒頭固定。 */}
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={update.isPending}
              data-testid={`proposal-${proposal.id}-edit-cancel`}
              aria-label={`キャンセル — 提案「${proposal.title}」の編集を破棄`}
            >
              <span aria-hidden="true">キャンセル</span>
            </Button>
            <Button
              type="submit"
              size="sm"
              className="min-h-11"
              disabled={update.isPending}
              aria-busy={update.isPending || undefined}
              data-testid={`proposal-${proposal.id}-save`}
              aria-keyshortcuts="Meta+Enter Control+Enter"
              aria-label={
                update.isPending
                  ? `保存中… — 提案「${proposal.title}」の編集を保存中`
                  : `保存 — 提案「${proposal.title}」の編集を保存 (Cmd/Ctrl+Enter でも可)`
              }
            >
              <span aria-hidden="true">{update.isPending ? '保存中…' : '保存'}</span>
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
        className="hover:bg-muted focus-visible:ring-ring min-w-0 flex-1 cursor-pointer rounded px-1 py-0.5 text-left transition focus-visible:ring-2 focus-visible:outline-none"
        onClick={() => setEditing(true)}
        data-testid={`proposal-${proposal.id}-edit-btn`}
        // iter1148: 旧 aria-label `提案「title」を編集` は visible title を中位置
        // (位置 3 "提案「**title**」") に持ち voice control prefix-matching「click {title}」
        // match 不可。iter1093-1147 sweep convention に揃え visible title 冒頭固定 +
        // em-dash 区切で descriptive 残す。
        aria-label={`${proposal.title} — 提案を編集${proposal.isMust ? ' (MUST)' : ''}`}
      >
        <div className="flex items-center gap-1.5">
          {proposal.isMust && <MustBadge />}
          {/* iter919: button aria-label "提案「X」を編集 (MUST)" が title 同梱、
              内側 visible {proposal.title} は二重読み上げ → aria-hidden で
              SR 単独経路に集約 (iter862/894 inbox-view 同 pattern)。 */}
          <span className="truncate font-medium" aria-hidden="true">
            {proposal.title}
          </span>
        </div>
        {proposal.description && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
            {proposal.description}
          </p>
        )}
      </button>
      <div
        className="flex shrink-0 gap-1"
        role="group"
        aria-label={`提案「${proposal.title}」の操作 (採用 / 却下)`}
      >
        <Button
          size="sm"
          variant="default"
          className="min-h-11 px-2"
          disabled={disabled}
          aria-busy={disabled || undefined}
          onClick={() => void handleAccept()}
          data-testid={`proposal-${proposal.id}-accept`}
          title="採用 → 子タスクとして追加"
          // iter1044: visible "✓ 採用" を aria-label の prefix に固定し WCAG 2.5.3
          // satisfy (旧 aria-label は "を採用して..." で literal "✓ 採用" 連続 substring 無し)。
          aria-label={
            disabled
              ? `✓ 採用 — 「${proposal.title}」を採用処理中…`
              : `✓ 採用 — 「${proposal.title}」を採用して子タスクとして追加`
          }
        >
          <span aria-hidden="true">✓ 採用</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          // iter1044: icon-only X button は size="sm" + min-h-11 で高さ 44 OK だが
          // 幅 36px < 44 で WCAG 2.5.5 違反 (iter1024/1028/1029 同 hazard)。min-w-11 で satisfy。
          className="min-h-11 min-w-11 px-2"
          disabled={disabled}
          aria-busy={disabled || undefined}
          onClick={() => void handleReject()}
          data-testid={`proposal-${proposal.id}-reject`}
          title="却下"
          // iter1217: 旧 aria-label は visible 概念名 "却下" を末尾 "「title」を **却下**" に
          // 持ち voice control prefix-matching「click 却下」 match 不可 (icon-only X、
          // visible text 無、title attribute "却下" は tooltip 専用)。template-item delete
          // iter1216 と同 sweep を proposal-reject にも展開。概念名 "却下" / "却下処理中…"
          // を aria-label 冒頭固定 + em-dash 区切で descriptive 末尾保持。
          aria-label={
            disabled
              ? `却下処理中… — 「${proposal.title}」を却下処理中`
              : `却下 — 「${proposal.title}」を却下`
          }
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}
