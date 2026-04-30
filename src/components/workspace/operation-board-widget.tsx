'use client'

/**
 * iter522 (queue P0-1 fluffy → widget): 「今日の作戦盤」 widget UI。
 *
 * 設計方針 (FEEDBACK_QUEUE.md fluffy 撲滅原則):
 *   - AI 文章生成 (PM Stand-up) を置き換える deterministic widget
 *   - 「見て即わかる」 — 推奨 / overdue / MUST today / 今日 scheduled / 昨日 done を
 *     1 card に集約、各 row click で ItemEditDialog 起動
 *   - pure helper `buildOperationBoard` (iter521 で着地) を呼ぶだけ、副作用なし
 *
 * 表示 priorityは 6 軸 1 (圧倒的可視化) と 4 (作業漏れ防止):
 *   1. 推奨 (Eisenhower 最高 score) — 「次にやるべきはコレ」
 *   2. overdue (赤強調 top 3 + total) — 「これ落ちてる」
 *   3. 今日の MUST (件数 + list) — 「絶対やる」
 *   4. 今日 scheduled (件数 + 時刻順 list) — 「今日の予定」
 *   5. 昨日 done (collapsed by default) — 「昨日の成果」
 */
import { useMemo, useState } from 'react'

import {
  AlertOctagon,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Crown,
  Target,
  Timer,
} from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'

import { todayISO } from '@/lib/date/iso'

import { extractEstimateMinutes } from '@/features/item/estimate'
import type { Item } from '@/features/item/schema'
import { buildTodayForecast } from '@/features/today/forecast'
import { buildOperationBoard } from '@/features/today/operation-board'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  items: Item[]
  /** 省略時は todayISO()。test 時に injection 用 */
  today?: string
}

/**
 * 「今日の作戦盤」widget (Today view 上部に配置)。
 *
 * AI 不使用 — algorithm のみで「今やるべき / 落ちてる / 予定 / 昨日成果」を一覧表示。
 */
export function OperationBoardWidget({ items, today: todayProp }: Props) {
  const today = todayProp ?? todayISO()
  const board = buildOperationBoard(items, today)
  const [, setOpenItemId] = useQueryState('item', parseAsString)
  const [showDoneYesterday, setShowDoneYesterday] = useState(false)

  // iter536 (queue fluffy-7 完結 wire-up): forecast を取得して header に summary line を表示
  // active な item の集合は board の todayScheduled (= 今日対象 + active) を流用
  const forecastInput = useMemo(
    () =>
      board.todayScheduled.items.map((it) => ({
        id: it.id,
        title: it.title,
        estimateMin: extractEstimateMinutes(it.description) ?? null,
        isMust: it.isMust,
        priority: it.priority,
      })),
    [board.todayScheduled.items],
  )
  const forecast = useMemo(() => buildTodayForecast(forecastInput), [forecastInput])

  // 全セクションが空なら widget そのものを描画しない (Today 未利用 user に noise を出さない)
  const hasAnything =
    board.recommended !== null ||
    board.mustToday.count > 0 ||
    board.overdue.total > 0 ||
    board.todayScheduled.count > 0 ||
    board.doneYesterday.count > 0

  if (!hasAnything) return null

  function openItem(id: string) {
    void setOpenItemId(id)
  }

  return (
    <Card
      className="border-primary/30 bg-primary/5"
      role="region"
      aria-label="今日の作戦盤"
      data-testid="operation-board-widget"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="text-primary h-4 w-4" aria-hidden="true" />
          今日の作戦盤
          <span className="text-muted-foreground text-xs font-normal">{today}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {forecast.totalEstimateMin > 0 ? (
          <div
            className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${forecast.canFinishToday ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
            data-testid="operation-board-forecast"
            role="status"
            aria-label={
              forecast.canFinishToday
                ? `今日終わる予測: 残 ${forecast.remainingMinutesUntilEnd} 分中 ${forecast.totalEstimateMin} 分の見積、${-forecast.overflowMin} 分余裕`
                : `今日終わらない予測: ${forecast.overflowMin} 分超過`
            }
          >
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium tabular-nums">
              {Math.floor(forecast.totalEstimateMin / 60)}h{forecast.totalEstimateMin % 60}m
            </span>
            <span className="text-[11px] opacity-80">の見積 / 残</span>
            <span className="font-medium tabular-nums">
              {Math.floor(forecast.remainingMinutesUntilEnd / 60)}h
              {forecast.remainingMinutesUntilEnd % 60}m
            </span>
            <span className="ml-auto font-semibold">
              {forecast.canFinishToday
                ? `余裕 ${-forecast.overflowMin}m`
                : `超過 ${forecast.overflowMin}m`}
            </span>
            {forecast.estimateUnknownCount > 0 ? (
              <span className="text-[10px] opacity-70">
                (見積無 {forecast.estimateUnknownCount})
              </span>
            ) : null}
          </div>
        ) : null}

        {/* iter541 (queue fluffy-7 expansion): forecast.quickWins / focusBlocks の compact 表示 */}
        {(forecast.quickWins.length > 0 || forecast.focusBlocks.length > 0) && (
          <div
            className="grid grid-cols-2 gap-2 text-xs"
            data-testid="operation-board-forecast-tactics"
          >
            {forecast.quickWins.length > 0 && (
              <div className="space-y-0.5 rounded bg-emerald-50/60 p-1.5">
                <div className="font-medium text-emerald-800">
                  ⚡ Quick wins ({forecast.quickWins.length})
                </div>
                <ul className="space-y-0.5">
                  {forecast.quickWins.slice(0, 3).map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => openItem(it.id)}
                        className="hover:bg-muted/60 flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left"
                        aria-label={`${it.title} を開く (見積 ${it.estimateMin}分)`}
                      >
                        <span className="text-muted-foreground text-[10px] tabular-nums">
                          {it.estimateMin}m
                        </span>
                        <span className="truncate">{it.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {forecast.focusBlocks.length > 0 && (
              <div className="space-y-0.5 rounded bg-sky-50/60 p-1.5">
                <div className="font-medium text-sky-800">
                  🎯 集中ブロック ({forecast.focusBlocks.length})
                </div>
                <ul className="space-y-0.5">
                  {forecast.focusBlocks.slice(0, 2).map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => openItem(it.id)}
                        className="hover:bg-muted/60 flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left"
                        aria-label={`${it.title} を開く (集中 ${it.estimateMin}分)`}
                      >
                        <span className="text-muted-foreground text-[10px] tabular-nums">
                          {it.estimateMin}m
                        </span>
                        <span className="truncate">{it.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {board.recommended ? (
          <Section
            icon={<Crown className="h-4 w-4 text-amber-500" aria-hidden="true" />}
            label="推奨第 1 タスク"
            tone="amber"
          >
            <ItemRow item={board.recommended} onClick={openItem} highlight />
          </Section>
        ) : null}

        {board.overdue.total > 0 && (
          <Section
            icon={<AlertOctagon className="h-4 w-4 text-red-600" aria-hidden="true" />}
            label="期限超過"
            count={board.overdue.total}
            tone="red"
          >
            <ItemList items={board.overdue.top3} onClick={openItem} tone="red" />
            {board.overdue.total > board.overdue.top3.length ? (
              <p className="text-muted-foreground pl-6 text-xs">
                ほか {board.overdue.total - board.overdue.top3.length} 件
              </p>
            ) : null}
          </Section>
        )}

        {board.mustToday.count > 0 && (
          <Section
            icon={
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-red-600 text-[9px] font-bold text-white"
                aria-hidden="true"
              >
                M
              </span>
            }
            label="今日の MUST"
            count={board.mustToday.count}
          >
            <ItemList items={board.mustToday.items} onClick={openItem} />
          </Section>
        )}

        {board.todayScheduled.count > 0 && (
          <Section
            icon={<CalendarClock className="text-primary h-4 w-4" aria-hidden="true" />}
            label="今日の予定"
            count={board.todayScheduled.count}
          >
            <ItemList items={board.todayScheduled.items} onClick={openItem} showTime />
          </Section>
        )}

        {board.doneYesterday.count > 0 && (
          <div>
            <button
              type="button"
              className="hover:text-foreground text-muted-foreground flex items-center gap-1 text-xs"
              onClick={() => setShowDoneYesterday((v) => !v)}
              aria-expanded={showDoneYesterday}
              data-testid="operation-board-done-yesterday-toggle"
            >
              {showDoneYesterday ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              昨日 done {board.doneYesterday.count} 件
            </button>
            {showDoneYesterday && (
              <div className="pt-1 pl-5">
                <ItemList items={board.doneYesterday.items} onClick={openItem} muted />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Section({
  icon,
  label,
  count,
  tone,
  children,
}: {
  icon: React.ReactNode
  label: string
  count?: number
  tone?: 'red' | 'amber'
  children: React.ReactNode
}) {
  const labelTone =
    tone === 'red' ? 'text-red-700' : tone === 'amber' ? 'text-amber-700' : 'text-foreground'
  // SR の heading shortcut で 4 sub-section (推奨/期限超過/MUST/予定/昨日 done)
  // に直行可能。visual サイズ text-xs / font-medium 維持。iter427 / iter428 /
  // iter430 / iter431 / iter432 と同 pattern (widget heading semantic 統一 6 件目)。
  const headingId = `operation-section-${label.replace(/[^a-zA-Z0-9]/g, '-')}`
  return (
    <div className="space-y-1" role="group" aria-labelledby={headingId}>
      <h3 id={headingId} className={`flex items-center gap-1.5 text-xs font-medium ${labelTone}`}>
        {icon}
        <span>{label}</span>
        {typeof count === 'number' ? (
          <span className="text-muted-foreground font-normal tabular-nums">({count})</span>
        ) : null}
      </h3>
      <div className="pl-5">{children}</div>
    </div>
  )
}

function ItemList({
  items,
  onClick,
  tone,
  muted,
  showTime,
}: {
  items: Item[]
  onClick: (id: string) => void
  tone?: 'red'
  muted?: boolean
  showTime?: boolean
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((it) => (
        <li key={it.id}>
          <ItemRow item={it} onClick={onClick} tone={tone} muted={muted} showTime={showTime} />
        </li>
      ))}
    </ul>
  )
}

function ItemRow({
  item,
  onClick,
  highlight,
  tone,
  muted,
  showTime,
}: {
  item: Item
  onClick: (id: string) => void
  highlight?: boolean
  tone?: 'red'
  muted?: boolean
  showTime?: boolean
}) {
  const cls =
    (highlight ? 'font-semibold ' : '') +
    (tone === 'red' ? 'text-red-700 ' : '') +
    (muted ? 'text-muted-foreground line-through ' : '')
  // visible text と同じ情報を SR にも届ける (色のみで意味伝達 = WCAG 1.4.1 違反を避け、
  // 時刻 / 期限 / 状態 prefix を 1 行 aria-label に集約)
  const statePrefix = tone === 'red' ? '期限超過: ' : muted ? '完了済: ' : highlight ? '推奨: ' : ''
  const timePart = showTime && item.dueTime ? ` ${item.dueTime.slice(0, 5)}` : ''
  const datePart = item.dueDate ? ` 期限 ${item.dueDate}` : ''
  const ariaLabel = `${statePrefix}${item.title}${timePart}${datePart} を編集ダイアログで開く`
  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className={`hover:bg-muted/60 flex w-full items-center gap-2 truncate rounded px-1 py-0.5 text-left ${cls}`}
      data-testid={`operation-board-row-${item.id}`}
      aria-label={ariaLabel}
    >
      {showTime && item.dueTime ? (
        <span className="text-muted-foreground text-xs tabular-nums" aria-hidden="true">
          {item.dueTime.slice(0, 5)}
        </span>
      ) : null}
      <span className="truncate" aria-hidden="true">
        {item.title}
      </span>
      {item.dueDate ? (
        <span
          className="text-muted-foreground ml-auto pl-2 text-xs tabular-nums"
          aria-hidden="true"
        >
          {item.dueDate}
        </span>
      ) : null}
    </button>
  )
}
