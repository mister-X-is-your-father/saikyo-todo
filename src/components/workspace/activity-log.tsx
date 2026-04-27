'use client'

/**
 * Item に関する Activity (audit_log) 一覧表示。
 * - admin 以上のみ閲覧可能 (サービス層で fallback 空配列)
 * - action ごとにラベル日本語化、before/after は JSON 折りたたみ
 */
import { useState } from 'react'

import { useAuditByTargetItem } from '@/features/audit/hooks'

const ACTION_LABEL: Record<string, string> = {
  create: '作成',
  update: '更新',
  status_change: 'ステータス変更',
  bulk_status_change: '一括ステータス変更',
  complete: '完了',
  uncomplete: '完了取消',
  move: '移動',
  reorder: '並び替え',
  delete: '削除',
  bulk_delete: '一括削除',
  set_assignees: '担当者変更',
  set_tags: 'タグ変更',
}

export function ActivityLog({ itemId }: { itemId: string }) {
  const { data, isLoading, error } = useAuditByTargetItem(itemId)
  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
        読み込み中…
      </p>
    )
  }
  if (error) {
    return (
      <p className="text-muted-foreground text-sm" role="alert">
        Activity の取得に失敗しました
      </p>
    )
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Activity は admin 以上のみ閲覧できます。まだ記録がないか、権限が不足しています。
      </p>
    )
  }
  return (
    <ul className="space-y-2" data-testid="activity-log">
      {data.map((entry) => (
        <ActivityRow key={entry.id} entry={entry} />
      ))}
    </ul>
  )
}

function ActivityRow({
  entry,
}: {
  entry: ReturnType<typeof useAuditByTargetItem>['data'] extends (infer U)[] | undefined ? U : never
}) {
  const [open, setOpen] = useState(false)
  const label = ACTION_LABEL[entry.action] ?? entry.action
  const hasDetail = entry.before != null || entry.after != null
  const detailId = `activity-detail-${entry.id}`
  return (
    <li className="rounded border p-2 text-xs" data-testid={`activity-row-${entry.id}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              entry.actorType === 'agent'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
            aria-label={entry.actorType === 'agent' ? '実行者: AI Agent' : '実行者: ユーザ'}
          >
            {entry.actorType === 'agent' ? 'AI' : 'user'}
          </span>
        </div>
        <time
          className="text-muted-foreground tabular-nums"
          dateTime={new Date(entry.ts).toISOString()}
        >
          {new Date(entry.ts).toLocaleString('ja-JP')}
        </time>
      </div>
      {hasDetail && (
        <button
          type="button"
          className="text-muted-foreground mt-1 text-[11px] underline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailId}
        >
          {open ? '詳細を閉じる' : '詳細を見る'}
        </button>
      )}
      {open && hasDetail && (
        <pre id={detailId} className="bg-muted/40 mt-1 overflow-x-auto rounded p-2 text-[10px]">
          {JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}
        </pre>
      )}
    </li>
  )
}
