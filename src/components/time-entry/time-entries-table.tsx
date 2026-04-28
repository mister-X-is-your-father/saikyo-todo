'use client'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { categoryLabel } from '@/features/time-entry/categories'
import { useSyncTimeEntry } from '@/features/time-entry/hooks'
import type { TimeEntry } from '@/features/time-entry/schema'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function SyncBadge({ status }: { status: TimeEntry['syncStatus'] }) {
  if (status === 'synced') {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-emerald-100 text-emerald-700"
        aria-label="外部同期: 完了"
        data-testid="sync-badge"
      >
        synced
      </Badge>
    )
  }
  if (status === 'failed') {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-red-100 text-red-700"
        aria-label="外部同期: 失敗"
        data-testid="sync-badge"
      >
        failed
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="border-transparent bg-slate-100 text-slate-700"
      aria-label="外部同期: 未実行"
      data-testid="sync-badge"
    >
      pending
    </Badge>
  )
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h === 0) return `${mm}分`
  if (mm === 0) return `${h}h`
  return `${h}h${mm}m`
}

export function TimeEntriesTable({
  workspaceId,
  entries,
}: {
  workspaceId: string
  entries: TimeEntry[]
}) {
  const sync = useSyncTimeEntry(workspaceId)

  async function handleSync(id: string) {
    try {
      await sync.mutateAsync(id)
      toast.success('Sync キューに投入しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Sync 失敗')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="time-entries-table">
        <caption className="sr-only">
          稼働時間記録一覧 (日付 / カテゴリ / 作業内容 / 時間 / 外部同期ステータス)
        </caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="py-2">
              日付
            </th>
            <th scope="col" className="py-2">
              カテゴリ
            </th>
            <th scope="col" className="py-2">
              作業内容
            </th>
            <th scope="col" className="py-2 text-right">
              時間
            </th>
            <th scope="col" className="py-2">
              Sync
            </th>
            <th scope="col" className="py-2">
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b align-top" data-testid={`time-entry-row-${e.id}`}>
              <td className="py-2">{e.workDate}</td>
              <td className="py-2">{categoryLabel(e.category)}</td>
              <td className="max-w-[320px] truncate py-2">{e.description || '—'}</td>
              <td className="py-2 text-right">{formatMinutes(e.durationMinutes)}</td>
              <td className="py-2">
                <SyncBadge status={e.syncStatus} />
                {e.syncError && (
                  <div
                    className="text-muted-foreground mt-1 max-w-[220px] truncate text-[10px]"
                    title={e.syncError}
                    aria-label={`同期エラー: ${e.syncError}`}
                    data-testid={`sync-error-${e.id}`}
                  >
                    {e.syncError}
                  </div>
                )}
              </td>
              <td className="py-2 text-right">
                {e.syncStatus !== 'synced' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sync.isPending}
                    onClick={() => handleSync(e.id)}
                    data-testid={`time-entry-sync-${e.id}`}
                    aria-label={
                      sync.isPending
                        ? `「${e.description || '(無題)'}」(${e.workDate}) を Sync 中…`
                        : `「${e.description || '(無題)'}」(${e.workDate}) を${
                            e.syncStatus === 'failed' ? '再' : ''
                          }Sync`
                    }
                  >
                    {e.syncStatus === 'failed' ? '再Sync' : 'Sync'}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
