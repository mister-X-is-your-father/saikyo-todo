'use client'

import { isAppError } from '@/lib/errors'

import { useTimeEntries } from '@/features/time-entry/hooks'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { CreateTimeEntryForm } from './create-time-entry-form'
import { TimeEntriesTable } from './time-entries-table'

export function TimeEntriesPanel({ workspaceId }: { workspaceId: string }) {
  const q = useTimeEntries(workspaceId)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">新規 稼働記録</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTimeEntryForm workspaceId={workspaceId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <span aria-hidden="true">一覧 {q.data ? `(${q.data.length} 件)` : ''}</span>
            <span className="sr-only">{q.data ? `一覧 ${q.data.length} 件` : '一覧'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Loading />
          ) : q.error ? (
            <ErrorState
              message={isAppError(q.error) ? q.error.message : '取得失敗'}
              onRetry={() => void q.refetch()}
            />
          ) : (q.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="まだ記録がありません"
              description="上のフォームから作成してください"
            />
          ) : (
            <TimeEntriesTable workspaceId={workspaceId} entries={q.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
