'use client'

/**
 * iter477 P0 (queue: チームメンバー余裕時間 一覧 scope A 完了):
 * チーム member 別の今日 / 今週 capacity load を 1 panel で 一覧表示する
 * UI bind。iter465 (computeMemberCapacityLoad + formatMemberCapacityLoadJa)
 * + iter466 (capacity-period) + iter469 (computeTeamCapacityLoads +
 * sortTeamCapacityLoadsByUrgency) + iter476 (useWorkspaceItemAssignees) を
 * 1 component で接続。
 *
 * 「各チームメンバーが今日、今週、どれくらい余裕な時間があるのかをぱっと一覧」
 * (2026-04-29 ユーザ要望) の scope A vertical slice 完成。
 *
 * 構成:
 *  - <details> で disclosure (= JS 不要 / SR / keyboard 完全対応、shadcn 非依存)
 *  - 開いた時のみ useItems / useWorkspaceMembers / useWorkspaceStatuses /
 *    useWorkspaceItemAssignees を fetch (lazy)
 *  - row = member 1 件、今日 chip + 今週 chip + load tone (overload=red /
 *    tight=amber / comfortable=blue / free=emerald / unknown=zinc)
 *  - sortTeamCapacityLoadsByUrgency で「危ない member 上」順に並ぶ
 *  - capacity = workspace default 8h × N day (member 別 capacity は scope B+)
 */

import { useMemo, useState } from 'react'

import { Users } from 'lucide-react'

import { extractEstimateMinutes } from '@/features/item/estimate'
import { useItems, useWorkspaceItemAssignees } from '@/features/item/hooks'
import { useWorkspaceMembers, useWorkspaceStatuses } from '@/features/workspace/hooks'
import {
  formatMemberCapacityLoadJa,
  type MemberCapacityLoad,
} from '@/features/workspace/member-capacity'
import {
  computeTeamCapacityLoads,
  sortTeamCapacityLoadsByUrgency,
} from '@/features/workspace/team-capacity'

import { Loading } from '@/components/shared/async-states'

interface Props {
  workspaceId: string
}

const TONE_CLASS: Record<MemberCapacityLoad['loadStatus'], string> = {
  overloaded: 'text-rose-700 dark:text-rose-400',
  tight: 'text-amber-700 dark:text-amber-400',
  comfortable: 'text-blue-700 dark:text-blue-400',
  free: 'text-emerald-700 dark:text-emerald-400',
  unknown: 'text-muted-foreground',
}

export function TeamCapacityPanel({ workspaceId }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <section className="bg-card/50 rounded-md border p-3" aria-label="チームメンバー余裕時間 一覧">
      <details
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        data-testid="team-capacity-panel"
      >
        <summary
          id="team-capacity-summary"
          className="text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1.5 rounded text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          /* iter1544: 旧 ` を閉じる` / ` を開く` 助詞接続は iter1093-1543 sweep の em-dash 区切と
             divergent。sprint-swimlane summary (iter1042 系) と同 pattern で em-dash 化。 */
          aria-label={
            open
              ? 'チームメンバー 余裕時間 (今日 / 今週) — 閉じる'
              : 'チームメンバー 余裕時間 (今日 / 今週) — 開く'
          }
          data-testid="team-capacity-summary-toggle"
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          <span aria-hidden="true">チームメンバー 余裕時間 (今日 / 今週)</span>
        </summary>
        {open && <PanelBody workspaceId={workspaceId} />}
      </details>
    </section>
  )
}

function PanelBody({ workspaceId }: Props) {
  const itemsQ = useItems(workspaceId)
  const membersQ = useWorkspaceMembers(workspaceId)
  const statusesQ = useWorkspaceStatuses(workspaceId)
  const assigneesQ = useWorkspaceItemAssignees(workspaceId)

  const today = useMemo(() => new Date(), [])

  const rows = useMemo(() => {
    if (!itemsQ.data || !membersQ.data || !statusesQ.data || !assigneesQ.data) return []
    const doneStatusKeys = new Set<string>()
    for (const s of statusesQ.data) {
      if (s.type === 'done') doneStatusKeys.add(s.key)
    }
    const items = itemsQ.data.map((it) => ({
      id: it.id,
      estimateMinutes: extractEstimateMinutes(it.description),
      status: it.status,
      dueDate: it.dueDate ?? null,
    }))
    const members = membersQ.data.map((m) => ({
      actorType: 'user' as const,
      actorId: m.userId,
      displayName: m.displayName,
    }))
    const assignees = assigneesQ.data
    const computed = computeTeamCapacityLoads({
      members,
      items,
      getAssignees: (id) => assignees[id] ?? [],
      today,
      doneStatusKeys,
    })
    return sortTeamCapacityLoadsByUrgency(computed)
  }, [itemsQ.data, membersQ.data, statusesQ.data, assigneesQ.data, today])

  if (itemsQ.isLoading || membersQ.isLoading || statusesQ.isLoading || assigneesQ.isLoading) {
    return (
      <div className="mt-2">
        <Loading />
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <p
        className="text-muted-foreground mt-2 text-xs"
        role="status"
        aria-live="polite"
        data-testid="team-capacity-empty"
      >
        member が登録されていません
      </p>
    )
  }

  return (
    <ul className="mt-2 space-y-1.5" aria-labelledby="team-capacity-summary">
      {rows.map((row) => {
        const name = row.member.displayName ?? row.member.actorId.slice(0, 8) + '…'
        const today = row.todayLoad
        const week = row.weekLoad
        return (
          <li
            key={`${row.member.actorType}:${row.member.actorId}`}
            className="bg-background grid grid-cols-1 gap-1 rounded border px-2 py-1.5 text-xs sm:grid-cols-3"
            data-testid={`team-capacity-row-${row.member.actorId}`}
            data-load-today={today.loadStatus}
            data-load-week={week.loadStatus}
          >
            {/* iter1054: 3 chip 全てに `role="img"` 付与し aria-label authoritative 化
                (iter1023/1049-1053 同 pattern、role 無 div + aria-label の SR
                picked-up divergence を解消)。 */}
            <div className="font-medium" role="img" aria-label={`member: ${name}`}>
              <span aria-hidden="true">{name}</span>
            </div>
            <div
              className={TONE_CLASS[today.loadStatus]}
              role="img"
              aria-label={`今日: ${formatMemberCapacityLoadJa(today)}`}
            >
              <span className="text-muted-foreground mr-1" aria-hidden="true">
                今日
              </span>
              <span aria-hidden="true">{formatMemberCapacityLoadJa(today)}</span>
            </div>
            <div
              className={TONE_CLASS[week.loadStatus]}
              role="img"
              aria-label={`今週: ${formatMemberCapacityLoadJa(week)}`}
            >
              <span className="text-muted-foreground mr-1" aria-hidden="true">
                今週
              </span>
              <span aria-hidden="true">{formatMemberCapacityLoadJa(week)}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
