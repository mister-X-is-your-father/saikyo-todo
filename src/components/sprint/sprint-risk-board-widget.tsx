/**
 * iter529 (queue fluffy-2 premortem→widget): Sprint Risk Board widget UI。
 *
 * 設計目的 (FEEDBACK_QUEUE.md fluffy 撲滅原則):
 *   - AI が「失敗候補 / 原因 / 対策」 文章 (一般論 fluffy) を書く現状の premortem-service.ts
 *     を deterministic な risk score widget + 担当負荷 table に置換
 *   - widget 本体は `buildSprintRiskBoard` (iter526 着地) を消費するだけ、AI 不使用
 *
 * 表示 (DataWidgetCard shell + SeverityChip 統一 token):
 *   - top N risk items (default 5) — score + reasons chip + title
 *   - assignee load (人当たり) — itemCount / mustCount / totalScore
 *   - 全 item table は scope 外 (UI が大きくなるため、別 view で対応)
 */
import { AlertOctagon, Users } from 'lucide-react'

import { buildSprintRiskBoard, type RiskBoardItemFields } from '@/features/sprint/risk-board'

import { DataWidgetCard } from '@/components/shared/data-widget-card'
import { SeverityChip } from '@/components/shared/severity-chip'

interface Props<T extends RiskBoardItemFields> {
  items: readonly T[]
  /** ISO YYYY-MM-DD。dueProximity 計算基準 */
  today: string
  /** 表示する topN (default 5) */
  topN?: number
  /** assignee id → 表示名 のマップ (option、未指定なら id を表示) */
  assigneeNames?: Record<string, string>
  /** row click で何かする (item edit 開く等)、未指定なら static */
  onItemClick?: (item: T) => void
  className?: string
}

/** risk score → severity */
function riskSeverity(score: number): 'ok' | 'info' | 'warn' | 'danger' {
  if (score >= 50) return 'danger'
  if (score >= 30) return 'warn'
  if (score >= 15) return 'info'
  return 'ok'
}

export function SprintRiskBoardWidget<T extends RiskBoardItemFields>({
  items,
  today,
  topN = 5,
  assigneeNames,
  onItemClick,
  className,
}: Props<T>) {
  const board = buildSprintRiskBoard(items, { today, topN })

  // assignee load を totalScore 降順 sort、配列化
  const loadEntries = Array.from(board.assigneeLoad.entries())
    .map(([id, load]) => ({
      id,
      ...load,
      name: assigneeNames?.[id] ?? id.slice(0, 8),
    }))
    .sort((a, b) => b.totalScore - a.totalScore)

  return (
    <DataWidgetCard
      title="Sprint リスクボード"
      icon={<AlertOctagon className="h-4 w-4 text-rose-600" aria-hidden="true" />}
      count={board.all.length}
      empty={board.all.length === 0}
      emptyTitle="リスク対象 item がありません"
      emptyDescription="Sprint に item を割当てるとリスクボードがここに出ます"
      className={className}
      testId="sprint-risk-board-widget"
    >
      <div className="space-y-4">
        {/* topRisk list */}
        {board.topRisk.length > 0 && (
          <div>
            {/* heading semantic で SR の h ナビ navigation 可、size は text-xs 維持 */}
            <h3
              id="sprint-risk-top-heading"
              className="text-muted-foreground mb-1 text-xs font-normal"
            >
              要警戒 上位 {board.topRisk.length} 件
            </h3>
            <ul className="space-y-1.5" aria-labelledby="sprint-risk-top-heading">
              {board.topRisk.map((entry) => {
                const sev = riskSeverity(entry.riskScore)
                const titleEl = (
                  <span className="flex-1 truncate text-sm" title={entry.item.title}>
                    {entry.item.title}
                  </span>
                )
                const inner = (
                  <>
                    {titleEl}
                    <SeverityChip
                      severity={sev}
                      label={`score ${entry.riskScore}`}
                      ariaLabel={`risk score ${entry.riskScore}`}
                      className="shrink-0"
                      testId={`risk-score-${entry.item.id}`}
                    />
                  </>
                )

                return (
                  <li
                    key={entry.item.id}
                    className="space-y-1"
                    data-testid={`risk-row-${entry.item.id}`}
                  >
                    {onItemClick ? (
                      <button
                        type="button"
                        onClick={() => onItemClick(entry.item)}
                        className="hover:bg-muted/60 flex w-full items-center gap-2 rounded px-1 py-1"
                        aria-label={`${entry.item.title} を開く`}
                      >
                        {inner}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-1 py-1">{inner}</div>
                    )}
                    {entry.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-1.5">
                        {entry.reasons.map((reason, i) => (
                          <span
                            key={`${entry.item.id}-${i}`}
                            className="text-muted-foreground rounded bg-slate-100 px-1.5 py-0.5 text-[10px]"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* assignee load */}
        {loadEntries.length > 0 && (
          <div>
            <h3
              id="sprint-risk-load-heading"
              className="text-muted-foreground mb-1 flex items-center gap-1 text-xs font-normal"
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              担当者負荷 ({loadEntries.length} 名)
            </h3>
            <table className="w-full text-xs" aria-labelledby="sprint-risk-load-heading">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="py-1 text-left font-normal">担当</th>
                  <th className="py-1 text-right font-normal">件数</th>
                  <th className="py-1 text-right font-normal">MUST</th>
                  <th className="py-1 text-right font-normal">負荷</th>
                </tr>
              </thead>
              <tbody>
                {loadEntries.map((load) => (
                  <tr
                    key={load.id}
                    className="border-b last:border-0"
                    data-testid={`risk-load-row-${load.id}`}
                  >
                    <td className="truncate py-1" title={load.id}>
                      {load.name}
                    </td>
                    <td className="py-1 text-right tabular-nums">{load.itemCount}</td>
                    <td className="py-1 text-right tabular-nums">
                      {load.mustCount > 0 ? (
                        <span className="font-semibold text-rose-700">{load.mustCount}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-1 text-right font-semibold tabular-nums">
                      {load.totalScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DataWidgetCard>
  )
}
