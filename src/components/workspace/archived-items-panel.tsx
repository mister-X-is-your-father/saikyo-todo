'use client'

/**
 * アーカイブ済 items 一覧 panel (Phase 6.15 iter 23 — POST_MVP "アーカイブビュー")。
 *
 * useItems から `archivedAt !== null` の items を抽出して表に表示。
 * iter 26 で **「復元」button** を追加 — useUnarchiveItem で archived_at を null に戻す。
 * 物理削除 (= 30 日 hard delete cron) は次フェーズ。
 */
import { useMemo } from 'react'
import Link from 'next/link'

import { format, isValid, parseISO } from 'date-fns'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useItems, useUnarchiveItem } from '@/features/item/hooks'

import { EmptyState } from '@/components/shared/async-states'
import { Button } from '@/components/ui/button'
import { MustBadge } from '@/components/workspace/must-badge'
import { StatusBadge } from '@/components/workspace/status-badge'

interface Props {
  workspaceId: string
}

function fmt(v: Date | string | null | undefined): string {
  if (!v) return '-'
  const d = typeof v === 'string' ? parseISO(v) : v
  return isValid(d) ? format(d, 'yyyy-MM-dd HH:mm') : '-'
}

/**
 * date セルを `<time dateTime>` で wrap (機械可読 ISO + 表示文字列)。
 * 値が無効/null なら plain '-' を返し time element を出さない (dateTime 必須属性
 * のため空文字 dateTime は invalid)。
 */
function FmtTime({ value }: { value: Date | string | null | undefined }) {
  if (!value) return <>-</>
  const d = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(d)) return <>-</>
  return <time dateTime={d.toISOString()}>{format(d, 'yyyy-MM-dd HH:mm')}</time>
}

export function ArchivedItemsPanel({ workspaceId }: Props) {
  const { data: allItems, isLoading, error } = useItems(workspaceId)
  const unarchive = useUnarchiveItem(workspaceId)

  const archived = useMemo(
    () => (allItems ?? []).filter((i) => i.archivedAt !== null && !i.deletedAt),
    [allItems],
  )

  async function handleRestore(itemId: string, expectedVersion: number) {
    try {
      await unarchive.mutateAsync({ id: itemId, expectedVersion })
      toast.success('アーカイブを復元しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '復元に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <p className="text-muted-foreground p-4 text-sm" role="status" aria-live="polite">
        読み込み中…
      </p>
    )
  }
  if (error) {
    return (
      <p className="text-destructive p-4 text-sm" role="alert">
        アーカイブ一覧の取得に失敗しました
      </p>
    )
  }
  if (archived.length === 0) {
    return (
      // iter291 basics: 旧の inline div → EmptyState に統一 (Today/Inbox/Workflows/
      // Sprints/Goals/items-board と同パターンで 7 view 目)。アーカイブと削除の
      // 違い (削除は復元不可、アーカイブは履歴 + 後で復元可) を 1 行で示す。
      <div data-testid="archive-empty">
        <EmptyState
          title="アーカイブ済の Item はありません"
          description={
            <span>
              ItemEditDialog の{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">アーカイブ</code>{' '}
              button から 実行すると、ここに移動します。 削除と違い、いつでも{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">復元</code> button
              で 戻せます。完了済タスクの履歴 / 過去の参考資料を「捨てずに片付ける」場所として
              活用してください。
            </span>
          }
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border" data-testid="archive-list">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          {/* iter1615: 旧 sr-only caption paren convention `(タイトル / ステータス / ...)` は
              iter1093-1614 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */}
          アーカイブ済 Item 一覧 — タイトル / ステータス / 期限 / アーカイブ日時 / 復元操作
        </caption>
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              タイトル
            </th>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              ステータス
            </th>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              期限
            </th>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              アーカイブ日時
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              操作
            </th>
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
                {item.isMust && <MustBadge className="mr-1" iconOnly />}
                {/* iter1300: 旧 aria-label `「${item.title}」を開く (${date} にアーカイブ)` は
                    visible {item.title} を `「」` 内 position 1 に持ち voice control prefix-matching
                    「click <title 先頭語>」 match 不可 (substring 一致のみ)。personal-period-view
                    iter1157 / backlog-title iter1158 の convention に揃え visible title 冒頭固定 +
                    em-dash 区切で descriptive 末尾。 */}
                <Link
                  href={`/${workspaceId}?item=${item.id}`}
                  className="text-primary focus-visible:ring-ring rounded hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  data-testid={`archive-title-link-${item.id}`}
                  aria-label={`${item.title} — 開く (${fmt(item.archivedAt)} にアーカイブ済み)`}
                >
                  <span aria-hidden="true">{item.title}</span>
                </Link>
              </td>
              <td className="px-3 py-2 text-xs">
                {/* iter291 basics: 生 enum 文字列 → StatusBadge で graphical 化 (iter261 の波及) */}
                <StatusBadge status={item.status} className="text-[10px]" />
              </td>
              <td className="px-3 py-2 text-xs">
                <FmtTime value={item.dueDate} />
              </td>
              <td className="text-muted-foreground px-3 py-2 text-xs">
                <FmtTime value={item.archivedAt} />
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  data-testid={`archive-restore-${item.id}`}
                  disabled={unarchive.isPending}
                  aria-busy={unarchive.isPending || undefined}
                  onClick={() => void handleRestore(item.id, item.version)}
                  // iter1161: 旧 aria-label 2 path とも visible "復元" / "復元中…" を
                  // 中位置 ("を **復元中…**" / "を **復元** (...) にアーカイブ") に持ち
                  // voice control prefix-matching「click 復元 / 復元中…」 match 不可
                  // (substring 一致のみ)。iter1093-1160 sweep convention に揃え
                  // visible 冒頭固定 + em-dash 区切で descriptive 末尾保持。
                  aria-label={
                    unarchive.isPending
                      ? `復元中… — 「${item.title}」を復元中…`
                      : `復元 — 「${item.title}」を復元 (${fmt(item.archivedAt)} にアーカイブ)`
                  }
                >
                  <span aria-hidden="true">{unarchive.isPending ? '復元中…' : '復元'}</span>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
