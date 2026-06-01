'use client'

import { isAppError } from '@/lib/errors'

import { useTimeEntries } from '@/features/time-entry/hooks'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { FocusFormCta } from '@/components/shared/focus-form-cta'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { CreateTimeEntryForm } from './create-time-entry-form'
import { EstimateBiasInsight } from './estimate-bias-insight'
import { TimeEntriesTable } from './time-entries-table'
import { TopItemsByTimeChip } from './top-items-by-time-chip'

export function TimeEntriesPanel({ workspaceId }: { workspaceId: string }) {
  const q = useTimeEntries(workspaceId)

  return (
    <div className="space-y-4">
      <EstimateBiasInsight workspaceId={workspaceId} />
      <TopItemsByTimeChip workspaceId={workspaceId} />
      <Card role="region" aria-labelledby="time-entries-new-heading">
        <CardHeader>
          <CardTitle
            id="time-entries-new-heading"
            className="text-base"
            role="heading"
            aria-level={2}
          >
            新規 稼働記録
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTimeEntryForm workspaceId={workspaceId} />
        </CardContent>
      </Card>

      <Card role="region" aria-labelledby="time-entries-list-heading">
        <CardHeader>
          <CardTitle
            id="time-entries-list-heading"
            className="text-base"
            role="heading"
            aria-level={2}
          >
            <span aria-hidden="true">一覧 {q.data ? `(${q.data.length} 件)` : ''}</span>
            {/* iter1653: 旧 sr-only `一覧 ${N} 件` space-separator は iter1619 keybindings-help
                / iter1633 dashboard MUST list / iter1640 list aria-label sweep の em-dash
                convention と divergent。区切を em-dash に統一。 */}
            <span className="sr-only">{q.data ? `一覧 — ${q.data.length} 件` : '一覧'}</span>
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
              action={<FocusFormCta targetId="teDate" testId="time-entries-empty-create" />}
            />
          ) : (
            <TimeEntriesTable workspaceId={workspaceId} entries={q.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
