'use client'

/**
 * Item のコメントスレッド。
 * - 一覧表示 + IMEInput で投稿
 * - 著者本人のみ編集 / 削除ボタン表示 (service 側で最終チェック)
 */
import { useState } from 'react'

import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

import { isAppError } from '@/lib/errors'

import {
  useCreateItemComment,
  useItemComments,
  useSoftDeleteItemComment,
  useUpdateItemComment,
} from '@/features/comment/hooks'
import type { CommentOnItem } from '@/features/comment/schema'
import { useWorkspaceMembers } from '@/features/workspace/hooks'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  itemId: string
  workspaceId: string
  currentUserId: string
}

export function CommentThread({ itemId, workspaceId, currentUserId }: Props) {
  const { data: comments, isLoading } = useItemComments(itemId)
  const { data: members } = useWorkspaceMembers(workspaceId)
  const create = useCreateItemComment(itemId)
  const [body, setBody] = useState('')

  async function handlePost() {
    const trimmed = body.trim()
    if (!trimmed) return
    try {
      await create.mutateAsync({
        itemId,
        body: trimmed,
        idempotencyKey: uuidv4(),
      })
      setBody('')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '投稿に失敗しました')
    }
  }

  const displayName = (userId: string) =>
    members?.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 6)

  return (
    <div className="space-y-4" data-testid="comment-thread">
      {isLoading ? (
        <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
          読み込み中…
        </p>
      ) : (comments?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
          まだコメントはありません
        </p>
      ) : (
        // iter447: ul に aria-label を付与し SR の list navigation で
        // 「コメント一覧 N 件」 が context として伝わるように (iter427 / iter428 /
        // iter438 と同 pattern 8 件目)。
        <ul className="space-y-3" aria-label={`コメント一覧 — ${comments!.length} 件`}>
          {comments!.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              itemId={itemId}
              authorName={displayName(c.authorActorId)}
              isOwn={c.authorActorType === 'user' && c.authorActorId === currentUserId}
            />
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <Textarea
          placeholder="コメントを入力… (@user で言及・通知。Cmd/Ctrl+Enter で投稿)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Phase 6.15 iter 228: Cmd/Ctrl+Enter で投稿 (Slack / GitHub / Notion 標準)。
            // IME 変換中 (compositionend 前) は無視。空 / pending 時は no-op。
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.nativeEvent.isComposing) {
              if (!body.trim() || create.isPending) return
              e.preventDefault()
              void handlePost()
            }
          }}
          rows={3}
          data-testid="comment-input"
          aria-label={
            body.length === 0
              ? 'コメント本文 (必須、最大 10000 文字、@user で言及・通知、Cmd/Ctrl+Enter で投稿)'
              : body.trim() === ''
                ? `コメント本文 (現在 ${body.length} / 10000 文字、空白のみは不正)`
                : body.length > 9500
                  ? `コメント本文 (現在 ${body.length} / 10000 文字、上限近接、Cmd/Ctrl+Enter で投稿)`
                  : `コメント本文 (現在 ${body.length} / 10000 文字、Cmd/Ctrl+Enter で投稿)`
          }
          /* iter1969: state-dependent aria-label (空 / 空白のみ / 上限近接 / 通常) は SR のみ伝達、
             title で sighted hover disclose (period-goal iter1967 と同 textarea pattern)。 */
          title={
            body.length === 0
              ? 'コメント本文 (必須、最大 10000 文字、@user で言及・通知、Cmd/Ctrl+Enter で投稿)'
              : body.trim() === ''
                ? `コメント本文 (現在 ${body.length} / 10000 文字、空白のみは不正)`
                : body.length > 9500
                  ? `コメント本文 (現在 ${body.length} / 10000 文字、上限近接、Cmd/Ctrl+Enter で投稿)`
                  : `コメント本文 (現在 ${body.length} / 10000 文字、Cmd/Ctrl+Enter で投稿)`
          }
          maxLength={10_000}
          required
          aria-required="true"
          aria-keyshortcuts="Meta+Enter Control+Enter"
          aria-invalid={(body.length > 0 && body.trim() === '') || undefined}
        />
        <div className="flex justify-end">
          <Button
            onClick={handlePost}
            disabled={create.isPending || !body.trim()}
            aria-busy={create.isPending || undefined}
            size="sm"
            className="min-h-11"
            data-testid="comment-post"
            // iter356: aria-keyshortcuts で SR / voice control に shortcut を expose。
            // WCAG 2.1.4 (Character Key Shortcuts) ARIA 1.2 attribute、modifier 必須形式。
            aria-keyshortcuts="Meta+Enter Control+Enter"
            // iter1168: 旧 aria-label の pending path "コメントを投稿中…" は visible
            // "送信中…" を含まず WCAG 2.5.3 (Label in Name) 違反 (visible は "送信中…"
            // で "投稿中…" は別語)。default / not-trim path も visible "投稿" 中位置で
            // voice control prefix-matching「click 投稿」 match 不可。iter1093-1167 sweep
            // convention に揃え visible 冒頭固定 + em-dash 区切で descriptive 末尾。
            // iter1791: aria-label は browser tooltip にならず sighted は hover で context
            // (shortcut hint / @user mention notification) 即把握できなかった。
            // iter1789 cancel/save/edit/delete と同 pattern を comment-post にも展開。
            aria-label={
              !body.trim()
                ? '投稿 — コメントを投稿するには本文を入力してください'
                : create.isPending
                  ? '送信中… — コメントを投稿中…'
                  : '投稿 — コメントを投稿 (Cmd/Ctrl+Enter でも可、@user で言及・通知)'
            }
            title={
              !body.trim()
                ? '投稿 — コメントを投稿するには本文を入力してください'
                : create.isPending
                  ? '送信中… — コメントを投稿中…'
                  : '投稿 — コメントを投稿 (Cmd/Ctrl+Enter でも可、@user で言及・通知)'
            }
          >
            <span aria-hidden="true">{create.isPending ? '送信中…' : '投稿'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function CommentItem({
  comment,
  itemId,
  authorName,
  isOwn,
}: {
  comment: CommentOnItem
  itemId: string
  authorName: string
  isOwn: boolean
}) {
  const update = useUpdateItemComment(itemId)
  const softDelete = useSoftDeleteItemComment(itemId)
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(comment.body)

  async function handleSave() {
    const trimmed = body.trim()
    if (!trimmed) return
    try {
      await update.mutateAsync({
        id: comment.id,
        expectedVersion: comment.version,
        patch: { body: trimmed },
      })
      setEditing(false)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '更新に失敗しました')
    }
  }

  async function handleDelete() {
    if (!confirm('このコメントを削除しますか?')) return
    try {
      await softDelete.mutateAsync({ id: comment.id, expectedVersion: comment.version })
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '削除に失敗しました')
    }
  }

  return (
    <li className="bg-muted/40 rounded border p-3 text-sm" data-testid={`comment-${comment.id}`}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">
          {authorName}
          {comment.authorActorType === 'agent' && (
            <span
              className="bg-primary/10 text-primary ml-2 rounded px-1.5 py-0.5 text-[10px]"
              role="img"
              aria-label="AI Agent による投稿"
              // iter1845: visible "AI" 略語のみで sighted は hover で full label
              // "AI Agent による投稿" 即把握できなかった。iter1841 StatusBadge / iter1843 MustBadge
              // と同 pattern で role="img" badge に title 付与。
              title="AI Agent による投稿"
            >
              <span aria-hidden="true">AI</span>
            </span>
          )}
        </span>
        <time
          className="text-muted-foreground"
          dateTime={
            comment.createdAt instanceof Date
              ? comment.createdAt.toISOString()
              : new Date(comment.createdAt).toISOString()
          }
        >
          {new Date(comment.createdAt).toLocaleString('ja-JP')}
        </time>
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              // Phase 6.15 iter 229: 編集 textarea でも Cmd/Ctrl+Enter で保存、
              // Esc で編集モードを抜ける (radix Dialog 内に居ても Esc は dialog
              // 全体を閉じてしまうので、編集中だけ stopPropagation で止める)。
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.nativeEvent.isComposing) {
                if (!body.trim() || update.isPending) return
                e.preventDefault()
                void handleSave()
              } else if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                e.stopPropagation()
                setEditing(false)
                setBody(comment.body)
              }
            }}
            rows={3}
            aria-keyshortcuts="Meta+Enter Control+Enter Escape"
            aria-label={
              body.length === 0
                ? 'コメント編集 (必須、最大 10000 文字、Cmd/Ctrl+Enter で保存、Esc で編集破棄)'
                : body.trim() === ''
                  ? `コメント編集 (現在 ${body.length} / 10000 文字、空白のみは不正)`
                  : body.length > 9500
                    ? `コメント編集 (現在 ${body.length} / 10000 文字、上限近接、Cmd/Ctrl+Enter で保存、Esc で編集破棄)`
                    : `コメント編集 (現在 ${body.length} / 10000 文字、Cmd/Ctrl+Enter で保存、Esc で編集破棄)`
            }
            required
            aria-required="true"
            aria-invalid={(body.length > 0 && body.trim() === '') || undefined}
            maxLength={10_000}
            data-testid={`comment-edit-input-${comment.id}`}
            /* iter1973: state-dependent aria-label (空 / 空白のみ / 上限近接 / 通常) は SR のみ伝達、
               title で sighted hover disclose (iter1969 comment-input / iter1967 period-goal と pair、
               comment-thread 内 2 textarea sweep 完備)。 */
            title={
              body.length === 0
                ? 'コメント編集 (必須、最大 10000 文字、Cmd/Ctrl+Enter で保存、Esc で編集破棄)'
                : body.trim() === ''
                  ? `コメント編集 (現在 ${body.length} / 10000 文字、空白のみは不正)`
                  : body.length > 9500
                    ? `コメント編集 (現在 ${body.length} / 10000 文字、上限近接、Cmd/Ctrl+Enter で保存、Esc で編集破棄)`
                    : `コメント編集 (現在 ${body.length} / 10000 文字、Cmd/Ctrl+Enter で保存、Esc で編集破棄)`
            }
          />
          <div
            className="flex justify-end gap-2"
            role="group"
            /* iter1584: paren convention を em-dash 区切に統一 (iter1093-1583 sweep)。 */
            aria-label={`コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」の編集操作 — キャンセル / 保存`}
            /* iter2037: comment edit operations group も workflows/sprints/goals operations
               group iter2031-2035 と同 pattern で hover disclose、4 entity operations family。 */
            title={`コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」の編集操作 — キャンセル / 保存`}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => setEditing(false)}
              data-testid={`comment-edit-cancel-${comment.id}`}
              // iter1104: visible-prefix sweep (iter1093-1103) を comment-* button にも展開
              // 旧 aria-label は visible 末尾持ちで voice control prefix-matching match 不可
              // iter1789: aria-label は browser tooltip にならず sighted は hover で context 即把握できず。
              // iter1785 ItemEditDialog cancel/save と同 pattern を comment-thread にも展開。
              aria-label="キャンセル — コメントの編集を破棄"
              title="キャンセル — コメントの編集を破棄"
            >
              <span aria-hidden="true">キャンセル</span>
            </Button>
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              onClick={handleSave}
              disabled={update.isPending || !body.trim()}
              aria-busy={update.isPending || undefined}
              data-testid={`comment-save-${comment.id}`}
              aria-keyshortcuts="Meta+Enter Control+Enter"
              // iter1169: not-trim path で旧 aria-label "コメントを保存するには本文を
              // 入力してください" は visible "保存" を中位置 "コメントを **保存** するには…"
              // に持ち voice control prefix-matching「click 保存」 match 不可
              // (pending / default は iter1104 で既に visible-prefix 化、not-trim 漏れ)。
              // iter1789: 同 pattern で sighted hover に conditional 3 path context を disclose。
              aria-label={
                !body.trim()
                  ? '保存 — コメントを保存するには本文を入力してください'
                  : update.isPending
                    ? '保存中… — コメントの編集を保存中'
                    : '保存 — コメントの編集を保存 (Cmd/Ctrl+Enter でも可)'
              }
              title={
                !body.trim()
                  ? '保存 — コメントを保存するには本文を入力してください'
                  : update.isPending
                    ? '保存中… — コメントの編集を保存中'
                    : '保存 — コメントの編集を保存 (Cmd/Ctrl+Enter でも可)'
              }
            >
              <span aria-hidden="true">保存</span>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="break-words whitespace-pre-wrap">{comment.body}</p>
          {isOwn && (
            <div
              className="mt-2 flex justify-end gap-2"
              role="group"
              /* iter1584: paren convention を em-dash 区切に統一 (iter1093-1583 sweep)。 */
              aria-label={`コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」の操作 — 編集 / 削除、自分の投稿のみ`}
              /* iter2133: comment ops group (編集 / 削除) の aria-label は browser tooltip に
                 ならず sighted は hover で comment body preview context disclose 不可。
                 proposal-edit-ops iter2131 / sprint-defaults-ops iter2129 と同
                 title=aria-label sync pattern。 */
              title={`コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」の操作 — 編集 / 削除、自分の投稿のみ`}
            >
              {/* iter1303 mobile audit (iPhone SE 320px): boundingBox 24x16 — 高さ 16px は
                  `before:-inset-3` (12px) で expand しても 16+24=40 で WCAG 2.5.5 (44x44) 未達
                  (item-checkbox iter505 convention は visible h-5 w-5=20px 前提で 20+24=44、
                  text-xs 16px は 4px 不足)。`min-h-11 inline-flex items-center` で button 自体を
                  44px tall 化、visible text は vertically center で見た目バランス保持。pseudo は
                  hover 拡張 anchor として残置。 */}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative inline-flex min-h-11 items-center rounded text-xs before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none disabled:before:hidden"
                onClick={() => {
                  setBody(comment.body)
                  setEditing(true)
                }}
                disabled={softDelete.isPending}
                aria-busy={softDelete.isPending || undefined}
                data-testid={`comment-edit-${comment.id}`}
                aria-label={`編集 — コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」を編集`}
                // iter1789: visible "編集" のみで sighted は hover で comment body preview 即把握できず。
                // edit/cancel/save と同 pattern で comment-edit にも title 付与。
                title={`編集 — コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」を編集`}
              >
                <span aria-hidden="true">編集</span>
              </button>
              <button
                type="button"
                className="hover:text-destructive text-muted-foreground focus-visible:ring-ring relative inline-flex min-h-11 items-center rounded text-xs before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 disabled:before:hidden"
                onClick={handleDelete}
                disabled={softDelete.isPending}
                aria-busy={softDelete.isPending || undefined}
                data-testid={`comment-delete-${comment.id}`}
                aria-label={
                  softDelete.isPending
                    ? `削除中… — コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」を削除中`
                    : `削除 — コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」を削除`
                }
                // iter1789: visible "削除" のみで sighted は hover で comment body preview 即把握できず。
                // conditional 2 path 各々 title で sighted hover で comment preview disclose。
                title={
                  softDelete.isPending
                    ? `削除中… — コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」を削除中`
                    : `削除 — コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」を削除`
                }
              >
                <span aria-hidden="true">削除</span>
              </button>
            </div>
          )}
        </>
      )}
    </li>
  )
}
