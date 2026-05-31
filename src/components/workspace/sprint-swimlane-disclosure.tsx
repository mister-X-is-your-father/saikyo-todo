'use client'

/**
 * iter475 P0 (queue: Sprint 担当者 swim-lane Gantt scope A continued):
 * SprintCard の「担当者ビュー」 disclosure UI bind。iter472 orchestrator
 * `computeSprintSwimlane` + iter473 population summary + iter474 bulk
 * assignee fetch hook を 1 component で繋ぎ、sprint 配下 items を 担当者×時間
 * の swim-lane Gantt として render。
 *
 * 構成:
 *  - <details> で disclosure (shadcn Collapsible は他箇所で使ってるが、シンプル
 *    化のため details/summary native pattern。SR / keyboard 完全対応)
 *  - 開いた時のみ useItems / useSprintItemAssignees を fetch (lazy で server 負荷軽減)
 *  - lane = member 1 行、bar は inline style (left% / width%) で描画
 *  - lane header chip に loadSummaryJa / conflictsJa を表示
 *  - sprint header に population summary chip
 *  - assignee 名前は workspace member の displayName で逆引き、無ければ actorId 短縮
 */

import { useMemo, useState } from 'react'

import { Users } from 'lucide-react'

import { extractEstimateMinutes } from '@/features/item/estimate'
import { useItems, useSprintItemAssignees } from '@/features/item/hooks'
import {
  computeSprintSwimlane,
  formatSprintSwimlanePopulationJa,
  type SprintSwimlaneRow,
  summarizeSprintSwimlanePopulation,
} from '@/features/sprint/swimlane-orchestrator'
import { useWorkspaceMembers } from '@/features/workspace/hooks'

import { Loading } from '@/components/shared/async-states'

interface Props {
  workspaceId: string
  sprintId: string
  sprintName: string
  sprintStart: string
  sprintEnd: string
}

export function SprintSwimlaneDisclosure({
  workspaceId,
  sprintId,
  sprintName,
  sprintStart,
  sprintEnd,
}: Props) {
  const [open, setOpen] = useState(false)
  return (
    <details
      className="border-t pt-2"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      data-testid={`sprint-swimlane-${sprintId}`}
    >
      <summary
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1.5 rounded text-xs focus-visible:ring-2 focus-visible:outline-none"
        // iter1042: visible "担当者ビュー (swim-lane Gantt)" を aria-label の prefix に
        // 固定し WCAG 2.5.3 satisfy (旧 aria-label には "ビュー" が無く literal
        // substring 不一致だった)。
        aria-label={
          open
            ? `担当者ビュー (swim-lane Gantt) を閉じる — Sprint「${sprintName}」の担当者 swim-lane Gantt を閉じる`
            : `担当者ビュー (swim-lane Gantt) を開く — Sprint「${sprintName}」の担当者 swim-lane Gantt を開く`
        }
        data-testid={`sprint-swimlane-summary-${sprintId}`}
      >
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        <span aria-hidden="true">担当者ビュー (swim-lane Gantt)</span>
      </summary>
      {open && (
        <SwimlaneBody
          workspaceId={workspaceId}
          sprintId={sprintId}
          sprintName={sprintName}
          sprintStart={sprintStart}
          sprintEnd={sprintEnd}
        />
      )}
    </details>
  )
}

function SwimlaneBody({ workspaceId, sprintId, sprintName, sprintStart, sprintEnd }: Props) {
  const itemsQ = useItems(workspaceId)
  const assigneesQ = useSprintItemAssignees(workspaceId, sprintId)
  const membersQ = useWorkspaceMembers(workspaceId)

  const memberNameByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of membersQ.data ?? []) {
      if (m.displayName) map.set(m.userId, m.displayName)
    }
    return map
  }, [membersQ.data])

  const rows = useMemo<SprintSwimlaneRow<{ id: string; title: string }>[]>(() => {
    if (!itemsQ.data || !assigneesQ.data) return []
    const sprintItems = itemsQ.data
      .filter((it) => it.sprintId === sprintId)
      .map((it) => ({
        id: it.id,
        title: it.title,
        startDate: it.startDate ?? null,
        dueDate: it.dueDate ?? null,
        description: it.description,
      }))
    const estimateMap = new Map<string, number>()
    for (const it of sprintItems) {
      const est = extractEstimateMinutes(it.description)
      if (typeof est === 'number') estimateMap.set(it.id, est)
    }
    const assignees = assigneesQ.data
    return computeSprintSwimlane({
      sprint: { startDate: sprintStart, endDate: sprintEnd },
      items: sprintItems,
      getAssignees: (id) => assignees[id] ?? [],
      estimateMinutesByItemId: estimateMap,
    })
  }, [itemsQ.data, assigneesQ.data, sprintId, sprintStart, sprintEnd])

  const population = useMemo(() => summarizeSprintSwimlanePopulation(rows), [rows])

  if (itemsQ.isLoading || assigneesQ.isLoading) {
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
        data-testid="sprint-swimlane-empty"
      >
        この sprint に割当 item がありません
      </p>
    )
  }

  const populationLabel = formatSprintSwimlanePopulationJa(population)

  return (
    <div
      className="mt-2 space-y-1.5"
      role="group"
      aria-label={`Sprint「${sprintName}」 担当者 swim-lane (lane ${rows.length} 件)`}
    >
      {/* iter1053: role 無 div + aria-label の SR picked-up divergence を `role="img"`
          で authoritative 化 (iter1023/1049/1050/1051/1052 同 pattern)。 */}
      <div
        className="text-muted-foreground text-[11px]"
        role="img"
        /* iter1563: 旧 aria-label `"Sprint 全体: ${populationLabel}"` は visible "${populationLabel}" を
           末尾に持ち voice control prefix-matching が strict prefix-match で不可 (substring 一致のみ)。
           iter1553-1562 status/role/health/傾向 chip family と同 pattern、visible 冒頭固定 + em-dash 区切。 */
        aria-label={`${populationLabel} — Sprint 全体`}
        data-testid="sprint-swimlane-population"
      >
        <span aria-hidden="true">{populationLabel}</span>
      </div>
      <ul className="space-y-1" aria-label={`Sprint Swimlane lane 一覧 ${rows.length} 件`}>
        {rows.map((row) => (
          <li
            key={row.laneKey ?? '__unassigned__'}
            className="bg-card/50 rounded border px-2 py-1.5"
            data-testid={`swimlane-row-${row.laneKey ?? 'unassigned'}`}
          >
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="font-medium">
                {row.assigneeRef
                  ? (memberNameByUserId.get(row.assigneeRef.actorId) ??
                    `${row.assigneeRef.actorType}:${row.assigneeRef.actorId.slice(0, 8)}…`)
                  : '未割当'}
              </span>
              {/* iter1053: 同 pattern で lane chip にも role="img" 付与。 */}
              <span
                className={
                  // iter1394: 固定暗色 amber-700 は dark card bg 上で <4.5 (WCAG 1.4.3)。dark:amber-400 併記。
                  row.loadSummary.conflictPairCount > 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-muted-foreground'
                }
                role="img"
                /* iter1564: 旧 `lane: ${row.loadSummaryJa} / ${row.conflictsJa}` は ':' colon 区切で
                   visible "${loadSummaryJa}" を末尾に持ち voice control prefix-matching 不可。
                   iter1553-1563 sweep convention + iter1563 同 file 内 population chip と同 pattern、
                   visible 冒頭固定 + em-dash 区切。 */
                aria-label={`${row.loadSummaryJa} — lane / ${row.conflictsJa}`}
              >
                <span aria-hidden="true">{row.loadSummaryJa}</span>
              </span>
            </div>
            <div
              className="bg-muted relative mt-1 h-3 w-full overflow-hidden rounded-sm"
              role="img"
              aria-label={(() => {
                // iter442: 競合 (conflicted) 件数を aria-label に含めて WCAG 1.4.1
                // 「色のみで意味伝達」 を回避。amber bar は SR で identifiable に。
                const conflicted = row.items.filter((it) => it.conflicted).length
                return conflicted > 0
                  ? `bar 数 ${row.items.length} 件 (うち競合あり ${conflicted} 件)`
                  : `bar 数 ${row.items.length} 件`
              })()}
            >
              {row.items.map((it) => (
                <span
                  key={it.item.id}
                  title={`${it.item.title} (${it.position.visibleStart}〜${it.position.visibleEnd}${
                    it.conflicted ? ' / 重複あり' : ''
                  })`}
                  className={
                    it.conflicted
                      ? // iter1571: ring-amber-700 (固定暗色) は dark bg 上で対 swimlane bar に
                        // 視認性低下 (ring is darker than bar)。dark:ring-amber-400 併記で
                        // dark mode 視認性確保 (iter1493/1512-1535 chip ring dark sweep と同 pattern)。
                        'absolute top-0 h-full bg-amber-500/70 ring-1 ring-amber-700 dark:ring-amber-400'
                      : 'absolute top-0 h-full bg-blue-500/70'
                  }
                  style={{
                    left: `${it.position.leftPct}%`,
                    width: `${Math.max(it.position.widthPct, 0.5)}%`,
                  }}
                  data-testid={`swimlane-bar-${it.item.id}`}
                  data-conflicted={it.conflicted ? 'true' : 'false'}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
