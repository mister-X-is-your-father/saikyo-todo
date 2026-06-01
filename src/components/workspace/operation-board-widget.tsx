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
import {
  buildTodayForecast,
  forecastSeverity,
  formatTodayForecastJa,
} from '@/features/today/forecast'
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
      /* iter1573: 旧 aria-label paren convention `"今日の作戦盤 (期限超過 X / MUST Y / 今日予定 Z)"` は
         iter1093-1572 sweep の em-dash 区切と divergent。visible "今日の作戦盤" は元から冒頭 prefix
         (voice control OK)、区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
      aria-label={`今日の作戦盤 — 期限超過 ${board.overdue.total} 件 / 今日 MUST ${board.mustToday.count} 件 / 今日予定 ${board.todayScheduled.count} 件`}
      data-testid="operation-board-widget"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base" role="heading" aria-level={2}>
          <Target className="text-primary h-4 w-4" aria-hidden="true" />
          今日の作戦盤
          <span className="text-foreground/80 text-xs font-normal">{today}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {forecast.totalEstimateMin > 0
          ? (() => {
              const sev = forecastSeverity(forecast)
              // iter1512: sevCls 4 階調 (ok/info/warn/danger) は bg-{color}-50 + text-{color}-700
              // で light 固定、dark mode で 明色 box が dark page 上に浮く + contrast 不適。
              // iter1376 RecoveryPlanSection / iter1493 data-widget-card error と同 pattern で
              // bg を `dark:bg-{color}-950/30`、text を `dark:text-{color}-300` に補完。
              const sevCls =
                sev === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : sev === 'info'
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'
                    : sev === 'warn'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
              return (
                <div
                  className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${sevCls}`}
                  data-testid="operation-board-forecast"
                  data-severity={sev}
                  role="status"
                  aria-label={`今日完了予測 ${formatTodayForecastJa(forecast)}`}
                >
                  <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-medium tabular-nums" aria-hidden="true">
                    {Math.floor(forecast.totalEstimateMin / 60)}h{forecast.totalEstimateMin % 60}m
                  </span>
                  {/* iter1391: opacity-80 が chip の sevCls text 色 (emerald-700 等) を
                      ~3.55:1 に落とす (WCAG 1.4.3)。size で hierarchy は保てるので opacity を外す。 */}
                  <span className="text-[11px]" aria-hidden="true">
                    の見積 / 残
                  </span>
                  <span className="font-medium tabular-nums" aria-hidden="true">
                    {Math.floor(forecast.remainingMinutesUntilEnd / 60)}h
                    {forecast.remainingMinutesUntilEnd % 60}m
                  </span>
                  <span className="ml-auto font-semibold" aria-hidden="true">
                    {forecast.canFinishToday
                      ? `余裕 ${-forecast.overflowMin}m`
                      : `超過 ${forecast.overflowMin}m`}
                  </span>
                  {forecast.estimateUnknownCount > 0 ? (
                    // iter918: parent role="status" aria-label "今日完了予測 ${...} 件 見積なし)"
                    // 既同梱、内側 visible のみ aria-hidden 抜けで二重読み上げ → 兄弟 4 span
                    // (Timer / 合計 / の見積 残 / 残値 / 余裕|超過) と同 pattern に揃え。
                    <span className="text-[10px]" aria-hidden="true">
                      (見積無 {forecast.estimateUnknownCount})
                    </span>
                  ) : null}
                </div>
              )
            })()
          : null}

        {/* iter541 (queue fluffy-7 expansion): forecast.quickWins / focusBlocks の compact 表示 */}
        {(forecast.quickWins.length > 0 || forecast.focusBlocks.length > 0) && (
          <div
            className="grid grid-cols-2 gap-2 text-xs"
            data-testid="operation-board-forecast-tactics"
          >
            {forecast.quickWins.length > 0 && (
              <div className="space-y-0.5 rounded bg-emerald-50/60 p-1.5 dark:bg-emerald-950/50">
                {/* iter1390: bg-emerald-50/60 は opacity tint で dark 時に暗緑になり、
                    emerald-800 見出し / 内側 muted・title text が全て <4.5 (WCAG 1.4.3)。
                    dark: 変種 bg + 見出し dark:text-emerald-300 で解消 (muted/title は theme-aware)。 */}
                <h3
                  className="font-medium text-emerald-800 dark:text-emerald-300"
                  id="op-board-quickwins-heading"
                >
                  <span aria-hidden="true">⚡ </span>Quick wins ({forecast.quickWins.length})
                </h3>
                <ul className="space-y-0.5" aria-labelledby="op-board-quickwins-heading">
                  {forecast.quickWins.slice(0, 3).map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => openItem(it.id)}
                        className="hover:bg-muted/60 focus-visible:ring-ring flex min-h-11 w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left focus-visible:ring-2 focus-visible:outline-none"
                        /* iter1493: iter1093-1151 sweep の em-dash visible-prefix convention に
                           合わせ () 区切から em-dash 区切に。visible-prefix ${it.title} は無変更、
                           voice control prefix-matching「click {title}」維持。 */
                        aria-label={`${it.title} を開く — 見積 ${it.estimateMin}分`}
                      >
                        <span
                          className="text-muted-foreground text-[10px] tabular-nums"
                          aria-hidden="true"
                        >
                          {it.estimateMin}m
                        </span>
                        <span className="truncate" aria-hidden="true">
                          {it.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {forecast.focusBlocks.length > 0 && (
              <div className="space-y-0.5 rounded bg-sky-50/60 p-1.5 dark:bg-sky-950/50">
                {/* iter1390: 同上 (sky tint)。 */}
                <h3
                  className="font-medium text-sky-800 dark:text-sky-300"
                  id="op-board-focus-heading"
                >
                  <span aria-hidden="true">🎯 </span>集中ブロック ({forecast.focusBlocks.length})
                </h3>
                <ul className="space-y-0.5" aria-labelledby="op-board-focus-heading">
                  {forecast.focusBlocks.slice(0, 2).map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => openItem(it.id)}
                        className="hover:bg-muted/60 focus-visible:ring-ring flex min-h-11 w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left focus-visible:ring-2 focus-visible:outline-none"
                        /* iter1493: 同上 (quick-wins と pair で em-dash 統一)。 */
                        aria-label={`${it.title} を開く — 集中 ${it.estimateMin}分`}
                      >
                        <span
                          className="text-muted-foreground text-[10px] tabular-nums"
                          aria-hidden="true"
                        >
                          {it.estimateMin}m
                        </span>
                        <span className="truncate" aria-hidden="true">
                          {it.title}
                        </span>
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
            /* iter1511: 期限超過 icon は light 固定 text-red-600 で dark mode 視認性低、
               iter1508/1509/1510 と同 root。dark variant 補完。 */
            icon={
              <AlertOctagon className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
            }
            label="期限超過"
            count={board.overdue.total}
            tone="red"
          >
            <ItemList
              items={board.overdue.top3}
              onClick={openItem}
              tone="red"
              ariaLabel={`期限超過 ${board.overdue.total} 件のうち上位 ${board.overdue.top3.length} 件 (期日が古い順)`}
            />
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
            <ItemList
              items={board.mustToday.items}
              onClick={openItem}
              ariaLabel={`今日の MUST ${board.mustToday.count} 件 (期日が近い順)`}
            />
          </Section>
        )}

        {board.todayScheduled.count > 0 && (
          <Section
            icon={<CalendarClock className="text-primary h-4 w-4" aria-hidden="true" />}
            label="今日の予定"
            count={board.todayScheduled.count}
          >
            <ItemList
              items={board.todayScheduled.items}
              onClick={openItem}
              showTime
              ariaLabel={`今日の予定 ${board.todayScheduled.count} 件 (時刻順)`}
            />
          </Section>
        )}

        {board.doneYesterday.count > 0 && (
          <div>
            <button
              type="button"
              // iter514: pseudo で tap target を 44x44 化 (visual text-xs 維持)
              // iter1304 (mobile audit): iter514 の pseudo `-inset-3` (12px) は visible h-5
              // (20px) 前提 (item-checkbox iter505 convention) で、text-xs (16px) には 4px 不足
              // (16+24=40 < 44)。`min-h-11` 追加で button 自体を 44 tall 化、visible は
              // vertically center で見た目バランス維持 (comment-thread iter1303 と同 fix)。
              className="hover:text-foreground text-muted-foreground focus-visible:ring-ring relative flex min-h-11 items-center gap-1 rounded text-xs before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none"
              onClick={() => setShowDoneYesterday((v) => !v)}
              aria-expanded={showDoneYesterday}
              /* iter1647: controlled `<div id="operation-board-done-yesterday-list">` は
                 `{showDoneYesterday && (...)}` 条件下のみ render。collapsed 時の static
                 aria-controls は dangling reference (WAI-ARIA 1.2 §9.4 違反、SR stuttering)。
                 iter1645/1646 disclosure aria-controls conditional 化 sweep の取りこぼし回収。 */
              aria-controls={showDoneYesterday ? 'operation-board-done-yesterday-list' : undefined}
              /* iter1547: 旧 `件の一覧を{閉じる|表示}` は ' を' 助詞接続で iter1093-1546 sweep の
                 em-dash 区切と divergent。team-capacity-panel summary (iter1544) と同 pattern で
                 em-dash 化。visible prefix `昨日 done {count} 件` は維持 (voice control)。 */
              aria-label={
                showDoneYesterday
                  ? `昨日 done ${board.doneYesterday.count} 件 — 一覧を閉じる`
                  : `昨日 done ${board.doneYesterday.count} 件 — 一覧を表示`
              }
              data-testid="operation-board-done-yesterday-toggle"
            >
              {showDoneYesterday ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <CheckCircle2
                className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <span aria-hidden="true">昨日 done {board.doneYesterday.count} 件</span>
            </button>
            {showDoneYesterday && (
              <div id="operation-board-done-yesterday-list" className="pt-1 pl-5">
                <ItemList
                  items={board.doneYesterday.items}
                  onClick={openItem}
                  muted
                  ariaLabel={`昨日 done ${board.doneYesterday.count} 件`}
                />
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
  // iter1384: text-red-700 / text-amber-700 は dark bg 上で <4.5 (WCAG 1.4.3、推奨/期限超過
  // section 見出し)。dark:text-{red,amber}-400 を併記 (light は 700 維持、dark で pass)。
  const labelTone =
    tone === 'red'
      ? 'text-red-700 dark:text-red-400'
      : tone === 'amber'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-foreground'
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
          <span className="text-foreground/80 font-normal tabular-nums">({count})</span>
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
  ariaLabel,
}: {
  items: Item[]
  onClick: (id: string) => void
  tone?: 'red'
  muted?: boolean
  showTime?: boolean
  ariaLabel?: string
}) {
  // iter727: Section 親は role="group" + aria-labelledby を持つが、SR の list
  // shortcut で ul に直行されると label が解離するため、ul 自身に件数込み
  // aria-label を持たせる (iter720-725 と同 pattern)。
  return (
    <ul className="space-y-0.5" aria-label={ariaLabel}>
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
    // iter1384: 期限超過 row の title text-red-700 は dark bg 上で <4.5 (WCAG 1.4.3)。dark:red-400 併記。
    (tone === 'red' ? 'text-red-700 dark:text-red-400 ' : '') +
    (muted ? 'text-muted-foreground line-through ' : '')
  // visible text と同じ情報を SR にも届ける (色のみで意味伝達 = WCAG 1.4.1 違反を避け、
  // 時刻 / 期限 / 状態 prefix を 1 行 aria-label に集約)
  const statePrefix = tone === 'red' ? '期限超過: ' : muted ? '完了済: ' : highlight ? '推奨: ' : ''
  const timePart = showTime && item.dueTime ? ` ${item.dueTime.slice(0, 5)}` : ''
  const datePart = item.dueDate ? ` 期限 ${item.dueDate}` : ''
  // iter1542: 旧 ` を編集ダイアログで開く` は visible-prefix ${item.title} を満たすが
  // ' を' 助詞接続で iter1093-1541 sweep の em-dash 区切と divergent。inbox-view iter1541 と
  // 同 pattern で em-dash 化。
  const ariaLabel = `${statePrefix}${item.title}${timePart}${datePart} — 編集ダイアログで開く`
  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className={`hover:bg-muted/60 focus-visible:ring-ring flex min-h-11 w-full items-center gap-2 truncate rounded px-1 py-0.5 text-left focus-visible:ring-2 focus-visible:outline-none ${cls}`}
      data-testid={`operation-board-row-${item.id}`}
      aria-label={ariaLabel}
    >
      {showTime && item.dueTime ? (
        <span className="text-foreground/80 text-xs tabular-nums" aria-hidden="true">
          {item.dueTime.slice(0, 5)}
        </span>
      ) : null}
      <span className="truncate" aria-hidden="true">
        {item.title}
      </span>
      {item.dueDate ? (
        <span className="text-foreground/80 ml-auto pl-2 text-xs tabular-nums" aria-hidden="true">
          {item.dueDate}
        </span>
      ) : null}
    </button>
  )
}
