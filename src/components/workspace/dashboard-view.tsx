'use client'

/**
 * Dashboard View (4th ViewPlugin)。
 * - MUST Item 一覧 (due_date asc)、期限警告色分け (overdue=red / soon=amber)
 * - WIP 警告バナー (wipInProgress > wipLimit)
 * - Burndown chart (recharts LineChart: open 線 + closed 線)
 *
 * 他 View と違い、props で渡される items は使わず、自前の hooks で MUST summary + burndown を fetch。
 * (items board の filter が dashboard には不要、完結して表示したい)
 */
import { useMemo } from 'react'

import { AlertTriangle, Flame } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { isAppError } from '@/lib/errors'

import { useMonthlyCost } from '@/features/agent/cost-hooks'
import { useBurndown, useMustSummary } from '@/features/dashboard/hooks'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BudgetPanel } from '@/components/workspace/budget-panel'
import { StatusBadge } from '@/components/workspace/status-badge'

interface Props {
  workspaceId: string
}

function formatDayShort(iso: string): string {
  // 'YYYY-MM-DD' → 'MM/DD'
  return iso.slice(5).replace('-', '/')
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(`${baseISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function DashboardView({ workspaceId }: Props) {
  const summary = useMustSummary(workspaceId)
  const burndown = useBurndown(workspaceId, 14)
  const cost = useMonthlyCost(workspaceId, 3)

  const todayStr = todayISO()
  const soonStr = addDaysISO(todayStr, 7)

  const burndownData = useMemo(() => {
    return (burndown.data ?? []).map((p) => ({ ...p, label: formatDayShort(p.date) }))
  }, [burndown.data])

  if (summary.isLoading) return <Loading message="ダッシュボード読込中..." />
  if (summary.error) {
    return (
      <ErrorState
        message={isAppError(summary.error) ? summary.error.message : '取得に失敗しました'}
        onRetry={() => void summary.refetch()}
      />
    )
  }
  if (!summary.data) return null

  const s = summary.data

  return (
    <div className="space-y-6" data-testid="dashboard-view">
      {/* サマリ stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="MUST 件数" value={s.items.length} tone="default" />
        <StatCard
          label="進行中 / WIP 上限"
          value={`${s.wipInProgress}/${s.wipLimit}`}
          tone={s.wipExceeded ? 'danger' : 'default'}
        />
        <StatCard
          label="期限超過"
          value={s.overdueCount}
          tone={s.overdueCount > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="7日以内"
          value={s.dueSoonCount}
          tone={s.dueSoonCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* WIP 警告 */}
      {s.wipExceeded ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
          data-testid="wip-warning"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">WIP 上限超過</div>
            <div className="text-xs">
              進行中の MUST が {s.wipInProgress} 件 (上限 {s.wipLimit}{' '}
              件)。新規着手前に完了を優先してください。
            </div>
          </div>
        </div>
      ) : null}

      {/* Burndown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">バーンダウン (14 日)</CardTitle>
        </CardHeader>
        <CardContent>
          {burndown.isLoading ? (
            <Loading message="グラフ読込中..." />
          ) : burndown.error ? (
            <ErrorState
              message={isAppError(burndown.error) ? burndown.error.message : '取得失敗'}
              onRetry={() => void burndown.refetch()}
            />
          ) : (
            // ResponsiveContainer は親が display:none / 幅 0 だと
            //   "The width(-1) and height(-1) of chart should be greater than 0"
            // を console warn する。minWidth=0 + width="100%" + height="100%" を明示
            // して dev hidden 状態のレース condition で警告が出ないようにする
            <div className="h-64 w-full" style={{ minWidth: 0, minHeight: 256 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={burndownData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="open"
                    name="未完了"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="closed"
                    name="完了"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI 月次コスト上限 + 当月利用状況 */}
      <BudgetPanel workspaceId={workspaceId} />

      {/* AI コスト月次 (直近 3 ヶ月) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI コスト (直近 3 ヶ月)</CardTitle>
        </CardHeader>
        <CardContent>
          {cost.isLoading ? (
            <Loading message="集計中..." />
          ) : cost.error ? (
            <ErrorState
              message={isAppError(cost.error) ? cost.error.message : '取得失敗'}
              onRetry={() => void cost.refetch()}
            />
          ) : (cost.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              まだ AI 実行がありません。Researcher / PM Agent を使うとここに記録されます。
            </p>
          ) : (
            <div className="overflow-x-auto" data-testid="ai-cost-table">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  AI Agent (Researcher / PM 等) の月次コストサマリ (月 / Role / 実行数 / 成功失敗
                  内訳 / Input/Output トークン数 / Cost USD)
                </caption>
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th scope="col" className="py-1.5 pr-3">
                      月
                    </th>
                    <th scope="col" className="py-1.5 pr-3">
                      Role
                    </th>
                    <th scope="col" className="py-1.5 pr-3 text-right">
                      実行数
                    </th>
                    <th scope="col" className="py-1.5 pr-3 text-right">
                      成功/失敗
                    </th>
                    <th scope="col" className="py-1.5 pr-3 text-right">
                      Input
                    </th>
                    <th scope="col" className="py-1.5 pr-3 text-right">
                      Output
                    </th>
                    <th scope="col" className="py-1.5 text-right">
                      Cost (USD)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(cost.data ?? []).map((r) => (
                    <tr key={`${r.month}-${r.role}`} className="border-b last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-xs">{r.month}</td>
                      <td className="py-1.5 pr-3">{r.role}</td>
                      <td className="py-1.5 pr-3 text-right">{r.invocations}</td>
                      <td className="py-1.5 pr-3 text-right">
                        <span className="text-green-600">{r.completed}</span>/
                        <span className="text-red-600">{r.failed}</span>
                      </td>
                      <td className="py-1.5 pr-3 text-right font-mono">
                        {r.inputTokens.toLocaleString()}
                      </td>
                      <td className="py-1.5 pr-3 text-right font-mono">
                        {r.outputTokens.toLocaleString()}
                      </td>
                      <td className="py-1.5 text-right font-mono">${r.costUsd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MUST 一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-red-500" />
            MUST Item 一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {s.items.length === 0 ? (
            <EmptyState
              title="MUST Item がありません"
              description="絶対に落とせないタスクに MUST を立ててください"
            />
          ) : (
            <ul className="divide-y text-sm">
              {s.items.map((item) => {
                const overdue = item.dueDate && item.dueDate < todayStr && !item.doneAt
                const soon =
                  !overdue &&
                  item.dueDate &&
                  item.dueDate >= todayStr &&
                  item.dueDate <= soonStr &&
                  !item.doneAt
                return (
                  <li
                    key={item.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-2"
                    data-testid="must-item-row"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{item.title}</span>
                      {item.dod ? (
                        <span className="text-muted-foreground truncate text-xs">
                          DoD: {item.dod}
                        </span>
                      ) : null}
                    </div>
                    <StatusBadge status={item.status} />
                    <span
                      className={
                        overdue
                          ? 'text-xs font-semibold text-red-600'
                          : soon
                            ? 'text-xs font-semibold text-amber-600'
                            : 'text-muted-foreground text-xs'
                      }
                    >
                      {item.dueDate ?? '期限なし'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {item.doneAt ? '完了' : overdue ? '期限超過' : soon ? '期日近' : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: 'default' | 'warning' | 'danger'
}) {
  const toneCls =
    tone === 'danger'
      ? 'border-red-500/50 bg-red-500/5'
      : tone === 'warning'
        ? 'border-amber-500/50 bg-amber-500/5'
        : ''
  return (
    <div className={`rounded-lg border p-4 ${toneCls}`}>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
