'use client'

/**
 * iter519 (queue TC-1): TaskChute mode の 1 列 linear timeline view (skeleton)。
 * 詳細: docs/methodology-modes-plan.md §1 (T-1 1 列 linear timeline) + §5 TC-1
 *
 * scope A: 今日の item を 1 列で時刻昇順に並べるだけ。次 iter で打刻 / 累積残 ticker /
 * 見積 vs 実績 inline / routine 露出 を載せる。
 *
 * 設計判断:
 *   - 既存 today-view (グルーピング表示) は **置き換えない** — view plugin として
 *     並列登録し、URL `?mode=taskchute` 時にユーザが選択できるようにする
 *   - sort は pure helper `sortForTimeline` で外出し (9 unit test)、UI は描画のみ
 *   - 完了済 / archive 済 / scheduledFor 未指定 (= 今日対象でない) は呼出元で
 *     filter してくる前提 (本 component は「並べて表示するだけ」)
 */
import { useMemo } from 'react'

import { Clock4, Sparkles, Timer } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'

import { todayISO } from '@/lib/date/iso'

import { extractEstimateMinutes } from '@/features/item/estimate'
import { priorityClass, priorityLabel } from '@/features/item/priority'
import type { Item } from '@/features/item/schema'
import { buildTaskChuteTicker } from '@/features/taskchute/cumulative-remaining'
import { sortForTimeline } from '@/features/taskchute/sort-for-timeline'

import { EmptyState } from '@/components/shared/async-states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ItemCheckbox } from '@/components/workspace/item-checkbox'
import { MustBadge } from '@/components/workspace/must-badge'
import { StartTimerButton } from '@/components/workspace/start-timer-button'
import { StatusBadge } from '@/components/workspace/status-badge'

interface Props {
  workspaceId: string
  items: Item[]
}

export function TaskChuteView({ workspaceId, items }: Props) {
  const today = todayISO()
  // 今日対象 (scheduledFor=today もしくは dueDate=today)、active な item のみに絞る
  const targetItems = useMemo(
    () =>
      items.filter((it) => {
        if (it.archivedAt) return false
        if (it.doneAt) return false // 完了済は別 section にしてもよいが scope A では非表示
        const scheduled = it.scheduledFor === today
        const due = it.dueDate === today
        return scheduled || due
      }),
    [items, today],
  )

  const ordered = useMemo(() => sortForTimeline(targetItems), [targetItems])
  const [, setOpenItemId] = useQueryState('item', parseAsString)

  // iter543 (queue methodology TC-3 wire-up): cumulative-remaining ticker を呼んで
  // header summary + 各 row の累積残 / eta を計算 (sortForTimeline 後の順序を保つ)
  const ticker = useMemo(() => {
    const tickerInput = ordered.map(({ item }) => ({
      id: item.id,
      doneAt: item.doneAt ?? null,
      status: item.status,
      estimateMin: extractEstimateMinutes(item.description) ?? null,
    }))
    return buildTaskChuteTicker(tickerInput)
  }, [ordered])
  // item.id → row index で row 横の累積残 / eta を引けるように map 化
  const tickerByItemId = useMemo(() => {
    const m = new Map<string, { cumulativeRemainingMin: number; eta: string | null }>()
    for (const row of ticker.rows) {
      m.set(row.item.id, {
        cumulativeRemainingMin: row.cumulativeRemainingMin,
        eta: row.eta,
      })
    }
    return m
  }, [ticker.rows])

  if (ordered.length === 0) {
    return (
      <Card role="region" aria-labelledby="taskchute-empty-heading">
        <CardHeader>
          <CardTitle
            id="taskchute-empty-heading"
            className="flex items-center gap-1.5 text-base"
            role="heading"
            aria-level={2}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            TaskChute (今日の 1 列 timeline)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="今日やる task が空です"
            description="ルーティンを投入するか、quick-add で task を作って今日の段取りを組み立てましょう"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      data-testid="taskchute-view"
      role="region"
      /* iter1575: 旧 aria-label paren convention `"TaskChute mode (...)"` は iter1093-1574 sweep の
         em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
      aria-label={`TaskChute mode — 今日の 1 列 timeline ${ordered.length} 件、合計 ${ticker.totalEstimateMin} 分 / 残 ${ticker.remainingEstimateMin} 分`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-base" role="heading" aria-level={2}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          TaskChute (今日の 1 列 timeline)
          <span className="text-muted-foreground ml-auto text-[11px] font-normal">
            {ordered.length} 件
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ticker.totalEstimateMin > 0 ? (
          <div
            className="bg-muted/40 mb-3 flex items-center gap-2 rounded px-2 py-1.5 text-xs"
            data-testid="taskchute-ticker-summary"
            role="status"
            aria-label={`合計 ${ticker.totalEstimateMin} 分 / 完了済 ${ticker.doneEstimateMin} 分 / 残 ${ticker.remainingEstimateMin} 分${
              ticker.estimateUnknownCount > 0 ? ` (見積無 ${ticker.estimateUnknownCount} 件)` : ''
            }`}
          >
            <Timer className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium tabular-nums" aria-hidden="true">
              合計 {Math.floor(ticker.totalEstimateMin / 60)}h{ticker.totalEstimateMin % 60}m
            </span>
            <span className="text-muted-foreground" aria-hidden="true">
              / 完了
            </span>
            <span
              className="font-medium text-emerald-700 tabular-nums dark:text-emerald-400"
              aria-hidden="true"
            >
              {Math.floor(ticker.doneEstimateMin / 60)}h{ticker.doneEstimateMin % 60}m
            </span>
            <span className="text-muted-foreground" aria-hidden="true">
              / 残
            </span>
            {/* iter1389: emerald-700/amber-700 は ticker bar の bg-muted/40 (dark で暗色) 上で
                dark 時 <4.5 (WCAG 1.4.3、完了/残 estimate)。dark:{emerald,amber}-400 を併記。 */}
            <span
              className="font-medium text-amber-700 tabular-nums dark:text-amber-400"
              aria-hidden="true"
            >
              {Math.floor(ticker.remainingEstimateMin / 60)}h{ticker.remainingEstimateMin % 60}m
            </span>
            {ticker.estimateUnknownCount > 0 ? (
              <span className="text-muted-foreground ml-auto text-[10px]" aria-hidden="true">
                見積無 {ticker.estimateUnknownCount}
              </span>
            ) : null}
          </div>
        ) : null}

        <ol
          className="divide-border divide-y"
          aria-label={`今日の task を時刻昇順で並べた 1 列 timeline ${ordered.length} 件`}
        >
          {ordered.map(({ item, timeLabel }) => (
            <li
              key={item.id}
              className="hover:bg-accent/40 group flex items-center gap-2 py-2 transition"
              data-testid={`taskchute-row-${item.id}`}
            >
              {/* iter1023: 旧 outer span は role 無で aria-label の SR 適用が不確実
                  (browser / SR で picked-up が分かれる)。`role="img"` を付与し
                  aria-label を authoritative 化 + 子要素を aria-hidden で SR 重複
                  排除 (iter98 PDCA / iter417 priority chip と同 pattern)。
                  「--:--」 visible (timeLabel 無の場合) は aria-hidden で SR が
                  「ダッシュ ダッシュ コロン」 と読み上げる noise を抑止。 */}
              <span
                className="text-muted-foreground inline-flex w-12 shrink-0 items-center gap-0.5 font-mono text-[11px] tabular-nums"
                role="img"
                /* iter1612: 旧 aria-label `"予定時刻 ${timeLabel}"` (timeLabel ありの path) は
                   visible "${timeLabel}" を末尾に持ち voice control prefix-matching「click HH:MM」 が
                   strict prefix-match で不可。iter1604 ETA chip と同 pattern、visible 冒頭固定 +
                   em-dash 区切。null path (`'時刻未指定'`) は visible "--:--" のみで text-prefix 無、維持。 */
                aria-label={timeLabel ? `${timeLabel} — 予定時刻` : '時刻未指定'}
              >
                {timeLabel ? (
                  <>
                    <Clock4 className="h-3 w-3" aria-hidden="true" />
                    <span aria-hidden="true">{timeLabel}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground/50" aria-hidden="true">
                    --:--
                  </span>
                )}
              </span>
              <ItemCheckbox workspaceId={workspaceId} item={item} />
              {/* iter1321: 旧 aria-label `${item.title} を編集` は visible "を編集" を末尾に
                  持つ codebase legacy 形式。iter1226 workspace-mode-selector / iter1093-1225 sweep
                  convention に揃え em-dash 区切で descriptive を明示分離 (`${title} — 編集`)。
                  voice control prefix-match は不変だが SR / codebase consistency 向上。 */}
              <button
                type="button"
                onClick={() => void setOpenItemId(item.id)}
                className="hover:text-primary focus-visible:ring-ring flex-1 truncate rounded text-left text-sm transition focus-visible:ring-2 focus-visible:outline-none"
                aria-label={`${item.title} — 編集`}
              >
                <span aria-hidden="true">{item.title}</span>
              </button>
              {item.isMust ? <MustBadge /> : null}
              {/*
                iter434 mode-M: visible text を "優先度: 最優先 (p1)" (10 char,
                ~90px @10px) → "P{n}" (3 char, ~24px) に compact 化。フル text は
                aria-label に温存し SR 読み上げは劣化なし、mobile 375px 幅で title
                truncate に余裕 (~66px 解放)。`role="img"` で children を AT 上隠蔽
                (iter98 PDCA / iter417 TaskChute aria-label 重複 prefix と同 pattern)。
              */}
              <span
                className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${priorityClass(item.priority)}`}
                role="img"
                aria-label={priorityLabel(item.priority)}
              >
                <span aria-hidden="true">P{item.priority ?? 4}</span>
              </span>
              <StatusBadge status={item.status} />
              {(() => {
                const tickerRow = tickerByItemId.get(item.id)
                if (!tickerRow?.eta) return null
                return (
                  // iter1052: role 無 span + aria-label の SR picked-up divergence を
                  // `role="img"` で authoritative 化 (iter1023/1049/1050/1051 同 pattern)。
                  <span
                    className="text-muted-foreground inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] tabular-nums"
                    title={`予測完了 ${tickerRow.eta}`}
                    role="img"
                    /* iter1604: 旧 aria-label `"予測完了時刻 ${eta}"` は visible "${eta}" を末尾に
                       持ち voice control prefix-matching「click HH:MM」 が strict prefix-match で不可。
                       iter1553-1603 visible 冒頭 em-dash sweep に合わせ visible 冒頭固定 + em-dash 区切。 */
                    aria-label={`${tickerRow.eta} — 予測完了時刻`}
                    data-testid={`taskchute-eta-${item.id}`}
                  >
                    <span aria-hidden="true">→{tickerRow.eta}</span>
                  </span>
                )
              })()}
              <StartTimerButton item={item} size="sm" />
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground mt-3 text-[11px]">
          時刻指定 → priority → 作成順 で sort。次 iter で 打刻 + 累積残時間 + 見積 vs 実績 inline
          表示が載ります。
        </p>
      </CardContent>
    </Card>
  )
}
