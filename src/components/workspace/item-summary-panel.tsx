'use client'

/**
 * Item 編集ダイアログの「サマリ」 Tab 内容 (FEEDBACK_QUEUE P0
 * 「『この案件、今どんな感じ？』『どう着地させるつもり？』を 1 画面で一目化」
 * scope A UI bind)。
 *
 * 既存 substrate を 1 panel に統合:
 *  - subtask 進捗 (`summarizeDescendantsProgress` iter417)
 *  - subtask 状態 hint (`formatDescendantsActivityHintJa` iter424)
 *  - 依存 readiness (`summarizeDependencyReadiness` + `formatDependencyReadiness`)
 *  - 最終更新時刻 (`findLatestUpdatedAt` + `formatLatestActivityJa` iter463)
 *  - 案件本体の dueDate / MUST 等 (item から直接)
 *
 * 各 chip は SR (`aria-label`) + DOM (`data-testid`) で観察可能、AI brief 等で
 * 同じ helper を 1 関数で使えば文言完全一致。
 *
 * scope B (risk score / 着地予測 / AI 要約) は別 iter。
 */
import { useMemo } from 'react'

import { fullPathOf } from '@/lib/db/ltree-path'

import {
  formatDescendantsActivityHintJa,
  formatDescendantsProgressJa,
  summarizeDescendantsProgress,
} from '@/features/item/descendants-progress'
import { useItems } from '@/features/item/hooks'
import { findLatestUpdatedAt, formatLatestActivityJa } from '@/features/item/latest-activity'
import type { Item } from '@/features/item/schema'
import { useItemDependencies } from '@/features/item-dependency/hooks'
import {
  formatDependencyReadiness,
  summarizeDependencyReadiness,
} from '@/features/item-dependency/readiness'
import { formatRelativeTime } from '@/features/notification/format'

interface Props {
  workspaceId: string
  item: Item
}

export function ItemSummaryPanel({ workspaceId, item }: Props) {
  const allItemsQ = useItems(workspaceId)
  const depsQ = useItemDependencies(item.id)

  const progress = useMemo(
    () =>
      allItemsQ.data
        ? summarizeDescendantsProgress({ id: item.id, parentPath: item.parentPath }, allItemsQ.data)
        : null,
    [allItemsQ.data, item.id, item.parentPath],
  )

  const readiness = useMemo(
    () => (depsQ.data ? summarizeDependencyReadiness(depsQ.data) : null),
    [depsQ.data],
  )

  const latestActivity = useMemo(() => {
    if (!allItemsQ.data) return null
    const parentFull = fullPathOf({ id: item.id, parentPath: item.parentPath })
    return findLatestUpdatedAt(
      { id: item.id, updatedAt: item.updatedAt },
      parentFull,
      allItemsQ.data,
    )
  }, [allItemsQ.data, item.id, item.parentPath, item.updatedAt])

  const now = new Date()

  return (
    <div
      className="space-y-3"
      role="region"
      aria-label={`案件サマリ${
        progress
          ? ` (進捗 ${progress.pctDone}%、完了 ${progress.done} / 全 ${progress.total} 件${
              progress.blocked > 0 ? `、blocked ${progress.blocked} 件` : ''
            })`
          : ''
      }`}
    >
      {/* iter1375: 3 stat box の tint (slate/amber/emerald-50) は light 固定色で dark に
          追従せず、dark では theme-aware な text-muted-foreground (明色) が light bg に乗り
          2.46:1 になっていた (WCAG 1.4.3)。各 tint に dark: 変種を付与して解消。 */}
      <div
        className={`rounded-md border px-3 py-2 ring-1 ${
          progress?.isComplete
            ? 'border-emerald-200 bg-emerald-50 ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:ring-emerald-800'
            : (progress?.blocked ?? 0) > 0
              ? 'border-amber-200 bg-amber-50 ring-amber-200 dark:border-amber-800 dark:bg-amber-950 dark:ring-amber-800'
              : 'border-slate-200 bg-slate-50 ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:ring-slate-700'
        }`}
        role="status"
        /* iter1669: 旧 `子タスク進捗: ${X} — ${Y}` の colon 区切は em-dash convention と
           mixed。両 path で colon → em-dash に統一、aria-label format を 1 形式に。
           iter1713: iter1709-1712 aria-atomic sweep (today / dashboard / forecast /
           budget) と同 sweep。chip 内容は progress / activity hint が item 完了に応じて
           変化、partial announce 解消で SR が「子タスク進捗 — ...」 を full re-announce。 */
        aria-atomic="true"
        aria-label={
          progress
            ? `子タスク進捗 — ${formatDescendantsActivityHintJa(progress)} / ${formatDescendantsProgressJa(progress)}`
            : '子タスク進捗 — 読み込み中'
        }
        /* iter2237: item-summary-panel 3 chip (progress / dependency / latest-activity) の
           aria-label は SR には full context を渡すが browser tooltip にならず、visible は emoji +
           短文 + 小文字 subtext のみで sighted は hover で「子タスク進捗 / 依存 / 動き」 prefix +
           full context disclose 不可。chip 3 element 同時 title sync、ItemEditDialog サマリタブ
           内の status chip family 完成。 */
        title={
          progress
            ? `子タスク進捗 — ${formatDescendantsActivityHintJa(progress)} / ${formatDescendantsProgressJa(progress)}`
            : '子タスク進捗 — 読み込み中'
        }
        data-testid="item-summary-progress"
        data-pct-done={progress?.pctDone ?? 0}
      >
        <div className="text-xs font-medium" aria-hidden="true">
          📋 {progress ? formatDescendantsActivityHintJa(progress) : '読み込み中…'}
        </div>
        <div className="text-muted-foreground mt-0.5 text-[11px]" aria-hidden="true">
          {progress ? formatDescendantsProgressJa(progress) : ''}
        </div>
      </div>

      <div
        className={`rounded-md border px-3 py-2 ring-1 ${
          readiness?.isBlocked
            ? 'border-amber-200 bg-amber-50 ring-amber-200 dark:border-amber-800 dark:bg-amber-950 dark:ring-amber-800'
            : 'border-slate-200 bg-slate-50 ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:ring-slate-700'
        }`}
        role="status"
        /* iter1713: 同 file sweep — `aria-atomic="true"` で SR partial announce 解消、
           依存 readiness の変化を chip 全体で full re-announce。 */
        aria-atomic="true"
        aria-label={
          readiness ? `依存 — ${formatDependencyReadiness(readiness)}` : '依存 — 読み込み中'
        }
        /* iter2237: 同 file sweep — chip 3 element 同時 title sync。 */
        title={readiness ? `依存 — ${formatDependencyReadiness(readiness)}` : '依存 — 読み込み中'}
        data-testid="item-summary-dependency"
        data-blocked={readiness?.isBlocked ?? false}
      >
        <div className="text-xs font-medium" aria-hidden="true">
          🔗 依存
        </div>
        <div className="text-muted-foreground mt-0.5 text-[11px]" aria-hidden="true">
          {readiness ? formatDependencyReadiness(readiness) : '読み込み中…'}
        </div>
      </div>

      <div
        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 ring-1 ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:ring-slate-700"
        role="status"
        /* iter1713: 同 file sweep — `aria-atomic="true"` で 最終更新時刻 relative
           値変化 (「5 分前」 → 「10 分前」) を chip 全体で full re-announce。 */
        aria-atomic="true"
        aria-label={formatLatestActivityJa(latestActivity, now, formatRelativeTime)}
        /* iter2237: 同 file sweep — chip 3 element 同時 title sync。 */
        title={formatLatestActivityJa(latestActivity, now, formatRelativeTime)}
        data-testid="item-summary-latest-activity"
        data-has-activity={latestActivity !== null}
      >
        <div className="text-xs font-medium" aria-hidden="true">
          🕒 動き
        </div>
        <div className="text-muted-foreground mt-0.5 text-[11px]" aria-hidden="true">
          {formatLatestActivityJa(latestActivity, now, formatRelativeTime)}
        </div>
      </div>

      <p className="text-muted-foreground text-[11px]">
        さらに詳しい状態は「子タスク」「依存」「アクティビティ」 タブを参照してください。
      </p>
    </div>
  )
}
