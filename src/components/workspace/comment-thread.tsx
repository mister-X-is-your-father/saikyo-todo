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
        <p className="text-muted-foreground text-sm" role="status">
          まだコメントはありません
        </p>
      ) : (
        <ul className="space-y-3">
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
          placeholder="コメントを入力… (@user で言及・通知)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          data-testid="comment-input"
          aria-label="コメント本文"
          maxLength={10_000}
          required
          aria-required="true"
        />
        <div className="flex justify-end">
          <Button
            onClick={handlePost}
            disabled={create.isPending || !body.trim()}
            size="sm"
            data-testid="comment-post"
            aria-label={
              !body.trim()
                ? 'コメントを投稿するには本文を入力してください'
                : create.isPending
                  ? 'コメントを投稿中…'
                  : 'コメントを投稿 (@user で言及・通知)'
            }
          >
            {create.isPending ? '送信中…' : '投稿'}
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
            >
              AI
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
            rows={3}
            aria-label="コメント編集"
            required
            aria-required="true"
            maxLength={10_000}
            data-testid={`comment-edit-input-${comment.id}`}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              キャンセル
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={update.isPending || !body.trim()}
              data-testid={`comment-save-${comment.id}`}
            >
              保存
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="break-words whitespace-pre-wrap">{comment.body}</p>
          {isOwn && (
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs"
                onClick={() => {
                  setBody(comment.body)
                  setEditing(true)
                }}
                disabled={softDelete.isPending}
                data-testid={`comment-edit-${comment.id}`}
                aria-label={`コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」を編集`}
              >
                編集
              </button>
              <button
                type="button"
                className="hover:text-destructive text-muted-foreground text-xs disabled:opacity-50"
                onClick={handleDelete}
                disabled={softDelete.isPending}
                data-testid={`comment-delete-${comment.id}`}
                aria-label={
                  softDelete.isPending
                    ? `コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」を削除中…`
                    : `コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」を削除`
                }
              >
                削除
              </button>
            </div>
          )}
        </>
      )}
    </li>
  )
}
