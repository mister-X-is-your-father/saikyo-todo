'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { parseAsString, useQueryState } from 'nuqs'
import { toast } from 'sonner'

import { todayISO } from '@/lib/date/iso'
import { isAppError } from '@/lib/errors'
import { moveCursor } from '@/lib/keyboard/list-cursor'
import { getChipToneClasses } from '@/lib/ui/chip-tone'

import { formatFriendlyDate } from '@/features/item/date-tokens'
import { useToggleCompleteItem } from '@/features/item/hooks'
import { priorityClass, priorityLabel } from '@/features/item/priority'
import type { Item } from '@/features/item/schema'
import {
  composeStreakBriefSignals,
  computeVelocity,
  countDoneToday,
  countDoneTodayByPriority,
  doneTodayToBriefSignal,
  formatDoneTodayByPriorityJa,
} from '@/features/item/velocity'
import { buildTodayGroups } from '@/features/today/build-groups'

import { EmptyState } from '@/components/shared/async-states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FocusQuickAddButton } from '@/components/workspace/focus-quick-add-button'
import { ItemCheckbox } from '@/components/workspace/item-checkbox'
import { MustBadge } from '@/components/workspace/must-badge'
import { OperationBoardWidget } from '@/components/workspace/operation-board-widget'
import { StartTimerButton } from '@/components/workspace/start-timer-button'
import { StatusBadge } from '@/components/workspace/status-badge'

// Phase 6.15 iter 84: 純粋分類関数を `@/features/today/build-groups` に移動。
// 単体テスト (build-groups.test.ts) で 4 group 仕様を検証。

export function TodayView({
  workspaceId,
  items,
}: {
  workspaceId: string
  items: Item[]
  currentUserId?: string
}) {
  const today = todayISO()
  // iter261 basics: dueDate を formatFriendlyDate で「明日 / 4/30 (木)」表示にするため、
  // 比較基準の Date object も用意 (todayISO は string で fixed すれば render 安定)。
  const todayDate = useMemo(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }, [])
  const groups = buildTodayGroups(items, today)
  const total = groups.reduce((sum, g) => sum + g.items.length, 0)
  // Phase 6.15 iter 63: title click で ItemEditDialog 開く (Gantt iter31 と同パターン)
  const [, setOpenItemId] = useQueryState('item', parseAsString)

  // Phase 6.15 iter 253: Vim/TickTick 風キーボードカーソル。
  // group 順 (期限超過 → 今日 → 明日 → 今週内) で flat 化したリストに対して
  // j/k で上下、Enter/e で開く、x/Space で完了切替、Esc で解除。
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const [rawSelectedId, setSelectedId] = useState<string | null>(null)
  // 選択 id が flat list から消えたら描画では null として扱う (完了済 fade out / フィルタ削除に追随)。
  // setState せず derive することで cascade render を回避。
  const selectedId =
    rawSelectedId && flatItems.some((i) => i.id === rawSelectedId) ? rawSelectedId : null
  const toggle = useToggleCompleteItem(workspaceId)
  // effect 内で最新値を参照するための ref。useEffect で同期して render 中の代入を避ける。
  const flatRef = useRef(flatItems)
  const selectedRef = useRef(selectedId)
  const toggleRef = useRef(toggle)
  const setOpenRef = useRef(setOpenItemId)
  useEffect(() => {
    flatRef.current = flatItems
    selectedRef.current = selectedId
    toggleRef.current = toggle
    setOpenRef.current = setOpenItemId
  })

  useEffect(() => {
    if (total === 0) return
    function onKey(e: KeyboardEvent) {
      if (e.isComposing) return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (t?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const list = flatRef.current
      const cur = selectedRef.current

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedId(moveCursor(list, cur, 'down'))
        return
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedId(moveCursor(list, cur, 'up'))
        return
      }
      if (e.key === 'Escape') {
        if (cur != null) {
          e.preventDefault()
          setSelectedId(null)
        }
        return
      }
      if (e.key === 'Enter' || e.key === 'e') {
        if (cur != null) {
          e.preventDefault()
          void setOpenRef.current(cur)
        }
        return
      }
      if (e.key === 'x' || e.key === ' ') {
        if (cur == null) return
        const item = list.find((i) => i.id === cur)
        if (!item) return
        e.preventDefault()
        const isDone = Boolean(item.doneAt)
        toggleRef.current.mutate(
          { id: item.id, expectedVersion: item.version, complete: !isDone },
          {
            onError: (err) =>
              toast.error(isAppError(err) ? err.message : '完了状態の変更に失敗しました'),
          },
        )
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  // iter1732 ai-automation: header chip 用の velocity/streak data を compute
  // (= React Compiler が自動 memo、useMemo manual 不要)。total===0 early return より
  // 前で実行されるため Hook 順序 invariant も維持。
  const velocitySummary = computeVelocity(items, { windowDays: 7 }, todayDate)
  const streakSignals = composeStreakBriefSignals(velocitySummary)

  if (total === 0) {
    return (
      <div className="space-y-4" data-testid="today-view">
        <OperationBoardWidget items={items} today={today} />
        <EmptyState
          icon={
            <span aria-hidden="true" className="text-3xl">
              🎉
            </span>
          }
          title="今日のタスクはありません"
          // iter273 basics: 旧説明はスキーマ用語 (scheduled_for / dueDate) で
          // 一般ユーザに不親切だった → 自然言語入力例で置き換え。Today/Backlog の
          // 両方を満たす予定 (scheduledFor) 設定の手順をクイック追加例で示す。
          description={
            <span>
              QuickAdd で{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">
                明日 資料準備
              </code>{' '}
              /{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">
                tomorrow 9am review
              </code>{' '}
              /{' '}
              <code className="bg-muted text-foreground rounded px-1 text-[11px]">
                3/15 リリース
              </code>{' '}
              のように日付を含めるとここに表示されます
            </span>
          }
          action={<FocusQuickAddButton testId="today-empty-quick-add" />}
        />
      </div>
    )
  }

  // iter1729 ai-automation: UX 卓越憲章 派生 P0「Today × 軸5 やる気 — 累計完了 chip」
  // を Today view header に配線。iter1726 countDoneToday + iter1727 doneTodayToBriefSignal
  // 着地 substrate を初配線、count=0 (idle) でも「今日 まだ 0 件」 励まし chip を表示、
  // count>=1 で達成感 chip 配色 (info → success)。Duolingo「Today's progress」 と同 UI 軸。
  // iter1730 refactor: chip class を手書き 3 軸 → 中央 chip-tone vocabulary (iter1531 dark
  // sweep 完了済) の `getChipToneClasses` 経由に統一。色 token (success→emerald / info→blue
  // / idle→slate) が他 chip と完全一致、設計判断 (light + dark variant) を 1 module に集約。
  // iter1732 ai-automation: iter1720 composeStreakBriefSignals (= milestone + comparison
  // fan-out) を利用、streak milestone chip も Today view header に並列 render (= 2 chip)。
  const doneTodaySignal = doneTodayToBriefSignal(countDoneToday(items, todayDate))
  const doneTodayChipClasses = getChipToneClasses(doneTodaySignal.tone)
  // iter1738 basics: 今日完了 chip aria-label に priority 別 内訳を append
  // (= iter1737 formatDoneTodayByPriorityJa を初配線、3 層情報設計 SR detail)。
  // priority bucket >= 2 の時のみ append、単一偏在は冗長省略 (iter386 / iter408 等同手法)。
  const doneTodayByPriority = countDoneTodayByPriority(items, todayDate)
  const doneTodayPriorityBuckets = ([1, 2, 3, 4] as const).filter(
    (p) => doneTodayByPriority[p] > 0,
  ).length
  const doneTodayPriorityDetail =
    doneTodayPriorityBuckets >= 2 ? ` (${formatDoneTodayByPriorityJa(doneTodayByPriority)})` : ''
  // streak milestone chip は velocity 集計内に done が 1 件でもあれば表示 (= 「過去 7 日」
  // 内に達成ありなら milestone chip を SR / hover に出す、= dashboard chip iter1709 と同 gate)
  const showStreakChip = velocitySummary.byDay.some((d) => d.count > 0)
  const streakChipClasses = getChipToneClasses(streakSignals.milestone.tone)

  return (
    <div className="space-y-4" data-testid="today-view">
      <OperationBoardWidget items={items} today={today} />
      {/* iter726: 静的キーボードヒントは aria-live="polite" の誤用 (live region は
          値変更時の再 announce 用、静的命令文には不要)。SR ユーザは <p> として
          通常 reading 順で 1 回読み上げれば十分。 iter443 inbox-view と同 anti-pattern 修正。
          iter1729 ai-automation: 右端に「今日累計完了」 chip を追加 (= 軸 5 やる気)。 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          キーボード: j/k で移動 · Enter または e で編集 · x または Space で完了切替 · Esc で解除
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {showStreakChip && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium tabular-nums ${streakChipClasses.bgClass} ${streakChipClasses.textClass}`}
              data-testid="today-streak-chip"
              data-tone={streakSignals.milestone.tone}
              role="status"
              aria-label={`完了 streak — ${streakSignals.milestone.text}`}
            >
              {streakSignals.milestone.text}
            </span>
          )}
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium tabular-nums ${doneTodayChipClasses.bgClass} ${doneTodayChipClasses.textClass}`}
            data-testid="today-done-count-chip"
            data-tone={doneTodaySignal.tone}
            role="status"
            aria-label={`今日累計完了 — ${doneTodaySignal.text}${doneTodayPriorityDetail}`}
          >
            {doneTodaySignal.text}
          </span>
        </div>
      </div>
      {groups.map((g) => {
        const headingId = `today-group-heading-${g.label.replace(/[^a-zA-Z0-9]/g, '-')}`
        return (
          g.items.length > 0 && (
            <Card key={g.label} role="region" aria-labelledby={headingId}>
              <CardHeader className="pb-2">
                <CardTitle
                  id={headingId}
                  className={`text-base ${g.label === '期限超過' ? 'text-red-600 dark:text-red-400' : ''}`}
                  role="heading"
                  aria-level={2}
                >
                  {/* iter1656: 旧 visible `${g.label} (${N})` paren convention は g.label が
                     内部 paren を持つ「今日 (6/1 月)」case で double paren `今日 (6/1 月) (2)` と
                     なり awkward。iter1093-1655 sweep 全般の em-dash 区切 convention に揃え
                     `${g.label} — ${N} 件` で全 group (期限超過 / 今日 / 明日 / 今週内) を統一。 */}
                  {g.label} — {g.items.length} 件
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.items.map((it) => {
                  const isCursor = it.id === selectedId
                  return (
                    <div
                      key={it.id}
                      onClick={() => void setOpenItemId(it.id)}
                      // iter1011 mobile audit: 320px viewport で title が 0 width に潰れる
                      // (右側 chip 群 dueTime / dueDate / StatusBadge / StartTimer ≈ 200px
                      // + MUST 56px が shrink-0 で領域専有 → middle.flex-1.min-w-0 は
                      // 残り < 60px で truncate が 0px まで縮む)。`flex-wrap` を付与し
                      // 右側 chip 群が次行に wrap 出来るようにする (desktop は元通り 1 行で収まる)。
                      className={`hover:bg-muted/50 flex cursor-pointer flex-wrap items-start gap-2 rounded p-1.5 ${isCursor ? 'ring-primary bg-muted ring-2' : ''}`}
                      data-testid={`today-row-${it.id}`}
                      data-cursor={isCursor ? 'true' : undefined}
                      aria-current={isCursor ? 'true' : undefined}
                    >
                      <ItemCheckbox item={it} workspaceId={workspaceId} />
                      <span
                        className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${priorityClass(it.priority)}`}
                        title={`p${it.priority ?? 4}`}
                        role="img"
                        aria-label={priorityLabel(it.priority)}
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void setOpenItemId(it.id)
                          }}
                          className="hover:text-primary focus-visible:ring-ring truncate rounded text-left font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
                          data-testid={`today-title-${it.id}`}
                          // iter1156: 旧 aria-label `「title」を編集` は visible "{title}"
                          // を位置 1 (「」内) に持ち voice control prefix-matching
                          //「click {title}」 match 不可 (substring 一致のみ)。
                          // iter1093-1155 sweep convention (kanban-title iter1155 と同 pattern)
                          // に揃え visible title 冒頭固定 + em-dash 区切で descriptive 末尾。
                          aria-label={`${it.title} — 編集`}
                        >
                          <span aria-hidden="true">{it.title}</span>
                        </button>
                        {it.isMust && <MustBadge data-testid={`today-must-${it.id}`} />}
                      </div>
                      <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                        {it.dueTime && (
                          // iter1057: role 無 span + aria-label を `role="img"` で
                          // authoritative 化 (iter1023/1049-1056 同 pattern、role=img sweep
                          // 10 弾目)。
                          <span
                            className="tabular-nums"
                            role="img"
                            /* iter1567: 旧 `期限時刻 ${HH:MM}` は visible (= "HH:MM" のみ) を末尾に持ち
                               voice control prefix-matching「click HH:MM」 が strict prefix-match で
                               不可。iter1093-1566 sweep convention で visible 冒頭固定 + em-dash 区切。 */
                            aria-label={`${it.dueTime.slice(0, 5)} — 期限時刻`}
                          >
                            <span aria-hidden="true">{it.dueTime.slice(0, 5)}</span>
                          </span>
                        )}
                        {it.dueDate && it.dueDate !== today && (
                          // iter436: 旧 outer `title={dueDate}` (mouse only) 削除、
                          // inner `<time dateTime>` が HTML5 semantic として SR / AT
                          // に伝える単一 source。iter435 / iter436 で title= 系 date
                          // 表示を統一。
                          // iter1057: 同 role="img" 付与で aria-label authoritative 化。
                          <span
                            className="text-red-600 dark:text-red-400"
                            role="img"
                            aria-label={`期限 ${it.dueDate}`}
                          >
                            <span aria-hidden="true">
                              期限{' '}
                              <time dateTime={it.dueDate}>
                                {formatFriendlyDate(it.dueDate, todayDate)}
                              </time>
                            </span>
                          </span>
                        )}
                        <StatusBadge status={it.status} />
                        <span onClick={(e) => e.stopPropagation()}>
                          <StartTimerButton item={it} size="sm" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        )
      })}
    </div>
  )
}
