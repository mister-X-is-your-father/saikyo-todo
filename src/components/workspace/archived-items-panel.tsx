'use client'

/**
 * アーカイブ済 items 一覧 panel (Phase 6.15 iter 23 — POST_MVP "アーカイブビュー")。
 *
 * useItems から `archivedAt !== null` の items を抽出して表に表示するだけのシンプル版。
 * 復元 / 物理削除 (= 30日 hard delete) は次フェーズ。
 */
import { useMemo } from 'react'

import { format, isValid, parseISO } from 'date-fns'

import { useItems } from '@/features/item/hooks'

interface Props {
  workspaceId: string
}

function fmt(v: Date | string | null | undefined): string {
  if (!v) return '-'
  const d = typeof v === 'string' ? parseISO(v) : v
  return isValid(d) ? format(d, 'yyyy-MM-dd HH:mm') : '-'
}

export function ArchivedItemsPanel({ workspaceId }: Props) {
  const { data: allItems, isLoading, error } = useItems(workspaceId)

  const archived = useMemo(
    () => (allItems ?? []).filter((i) => i.archivedAt !== null && !i.deletedAt),
    [allItems],
  )

  if (isLoading) {
    return <p className="text-muted-foreground p-4 text-sm">読み込み中…</p>
  }
  if (error) {
    return <p className="text-destructive p-4 text-sm">アーカイブ一覧の取得に失敗しました</p>
  }
  if (archived.length === 0) {
    return (
      <div
        data-testid="archive-empty"
        className="text-muted-foreground rounded-lg border p-6 text-center text-sm"
      >
        アーカイブ済の Item はありません。 ItemEditDialog から「アーカイブ」を実行すると、
        ここに表示されます。
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border" data-testid="archive-list">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">タイトル</th>
            <th className="px-3 py-2 text-left font-semibold">ステータス</th>
            <th className="px-3 py-2 text-left font-semibold">期限</th>
            <th className="px-3 py-2 text-left font-semibold">アーカイブ日時</th>
          </tr>
        </thead>
        <tbody>
          {archived.map((item) => (
            <tr
              key={item.id}
              data-testid={`archive-row-${item.id}`}
              className="hover:bg-muted/50 border-t"
            >
              <td className="max-w-[300px] truncate px-3 py-2">
                {item.isMust && <span className="mr-1 text-xs text-red-500">⚠</span>}
                {item.title}
              </td>
              <td className="px-3 py-2 text-xs">{item.status}</td>
              <td className="px-3 py-2 text-xs">{fmt(item.dueDate)}</td>
              <td className="text-muted-foreground px-3 py-2 text-xs">{fmt(item.archivedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
