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
      <Badge variant="outline" className="border-transparent bg-emerald-100 text-emerald-700">
        synced
      </Badge>
    )
  }
  if (status === 'failed') {
    return (
      <Badge variant="outline" className="border-transparent bg-red-100 text-red-700">
        failed
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-transparent bg-slate-100 text-slate-700">
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
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">日付</th>
            <th className="py-2">カテゴリ</th>
            <th className="py-2">作業内容</th>
            <th className="py-2 text-right">時間</th>
            <th className="py-2">Sync</th>
            <th className="py-2"></th>
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
