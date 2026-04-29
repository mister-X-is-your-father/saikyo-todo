/**
 * iter419 ai-automation: workspace 内「子を持つ未完了 parent」の進捗 list を返す pure helper。
 *
 * iter417 で追加した `summarizeDescendantsProgress` (1 parent 単位) を全 workspace に
 * scale up した workspace-axis 版。AI 朝 brief / pm-agent prompt / dashboard widget が
 * 「いま動いている案件 (= parent task with children) の進捗 list」を 1 関数で出せる。
 *
 *   '進行中: A 30% (3/10) / B 60% (6/10) / 他 2 件'
 *
 * iter379 (must-overdue) / iter382 (overdue-active) / iter407 (slip-days) / iter409
 * (stale-items) / iter412 (blocked-items) と並ぶ「title list with overflow」 substrate
 * シリーズの **parent-items-progress 軸** (= 6 軸目)。formatTopWithOverflow を委譲。
 *
 * 仕様:
 *  - 「parent」 = 子 (descendants) を 1 件以上持つ item (= total >= 1)
 *  - 「未完了」 = isComplete === false (= まだ全 done に達していない)
 *  - parent 自身が `deletedAt != null` または `doneAt != null` でも、子孫の進捗は
 *    集計対象 (parent done でも残子孫があれば「親は done だが子孫は未完了」を見せたい)
 *  - 並び: pctDone 昇順 (= 進捗が遅い案件を先に見せる、最も注意が必要な順)、
 *    tie で title 昇順 (ja)
 */
import { formatTopWithOverflow, titleOrUntitled } from '@/lib/format-list'

import { type DescendantsProgress, summarizeDescendantsProgress } from './descendants-progress'
import {
  formatPriorityBucketsLabeled,
  normalizePriority,
  PRIORITY_ORDER,
  type PriorityKey,
} from './priority'

export interface ParentItemProgress<I> {
  parent: I
  progress: DescendantsProgress
  /** parent.priority を 1-4 に正規化 (null/未設定は 4 へ) — iter432 で追加 */
  priority: PriorityKey
}

interface ParentItemFields {
  id: string
  title: string
  parentPath: string
  status: string | null | undefined
  deletedAt?: Date | null
  priority?: number | null
}

/**
 * `allItems` から「子を持つ未完了 parent」を抽出。
 *
 * - 各 candidate parent について `summarizeDescendantsProgress` で集計
 * - `progress.total === 0` (= 子孫ゼロ = 末端 task) は除外
 * - `progress.isComplete === true` (= 全 done = 達成済) は除外
 * - 並びは `pctDone` 昇順 → `parent.title` 昇順 (ja)
 * - parent 自身が `deletedAt != null` の場合は除外 (= 削除された parent は表示しない)
 */
export function pickIncompleteParentItems<I extends ParentItemFields>(
  allItems: readonly I[],
): ParentItemProgress<I>[] {
  const result: ParentItemProgress<I>[] = []
  for (const candidate of allItems) {
    if (candidate.deletedAt != null) continue
    const progress = summarizeDescendantsProgress(
      { id: candidate.id, parentPath: candidate.parentPath },
      allItems,
    )
    if (progress.total === 0) continue
    if (progress.isComplete) continue
    result.push({
      parent: candidate,
      progress,
      priority: normalizePriority(candidate.priority),
    })
  }
  result.sort((a, b) => {
    if (a.progress.pctDone !== b.progress.pctDone) {
      return a.progress.pctDone - b.progress.pctDone
    }
    return a.parent.title.localeCompare(b.parent.title, 'ja')
  })
  return result
}

/**
 * AI brief / dashboard chip 用の 1 行 summary。
 *
 *   - 0 件 → `'進行中の案件 0 件'`
 *   - 1+ 件 → `'進行中: A 30% (3/10) / B 60% (6/10) / 他 K 件'`
 *   - title 欠落 (空文字) は `'(無題)'` に正規化
 *   - limit 超過は formatTopWithOverflow で `' / 他 K 件'` を append (default limit=3)
 */
export function formatParentItemsProgressBriefJa<I extends ParentItemFields>(
  entries: readonly ParentItemProgress<I>[],
  limit: number = 3,
): string {
  if (entries.length === 0) return '進行中の案件 0 件'
  const body = formatTopWithOverflow(
    entries,
    (e) =>
      `${titleOrUntitled(e.parent.title)} ${e.progress.pctDone}% (${e.progress.done}/${e.progress.total})`,
    limit,
  )
  return `進行中: ${body}`
}

/**
 * iter422 ai-automation: incomplete parents の集合を 1 数値 / カテゴリ別件数で要約。
 *
 * iter419 (pickIncompleteParentItems) で取り出した list を AI brief / pm-agent /
 * dashboard が「案件 5 件: 平均 35%, 停滞 2 / 健全 2 / 仕上げ 1」のように 1 行で
 * 出すための substrate。1 列の chip では list (= 個別 title) より aggregate 数値の
 * 方が密度が高く、ユーザは「どこに注意」より「全体感」を瞬時把握できる。
 *
 * 進捗 tier (= bucket):
 *  - `stuck`        pctDone < 25  (停滞: 1/4 未満、優先で注意)
 *  - `slow`         25 ≤ pct < 50 (前半の遅延)
 *  - `healthy`      50 ≤ pct < 75 (順調進行中)
 *  - `almostDone`   75 ≤ pct < 100 (仕上げ間近、push で完了候補)
 *  - 100 (= isComplete) は entries に含まれない (pickIncompleteParentItems で除外済)
 *
 * 仕様:
 *  - entries 空 → all-zero / avgPctDone=0 / 全 tier 0
 *  - avgPctDone は単純平均 (= sum / count)、Math.round で整数化
 *  - tier の累積は border 値で「下側」に入る (= 25 は slow / 50 は healthy)
 */
export type ParentItemsProgressTier = 'stuck' | 'slow' | 'healthy' | 'almostDone'

export interface ParentItemsAggregate {
  count: number
  avgPctDone: number
  byTier: Record<ParentItemsProgressTier, number>
}

const ZERO_AGGREGATE: ParentItemsAggregate = {
  count: 0,
  avgPctDone: 0,
  byTier: { stuck: 0, slow: 0, healthy: 0, almostDone: 0 },
}

function progressTier(pctDone: number): ParentItemsProgressTier {
  if (pctDone < 25) return 'stuck'
  if (pctDone < 50) return 'slow'
  if (pctDone < 75) return 'healthy'
  return 'almostDone'
}

export function summarizeParentItemsAggregate<I>(
  entries: readonly ParentItemProgress<I>[],
): ParentItemsAggregate {
  if (entries.length === 0) return ZERO_AGGREGATE
  const byTier: Record<ParentItemsProgressTier, number> = {
    stuck: 0,
    slow: 0,
    healthy: 0,
    almostDone: 0,
  }
  let sum = 0
  for (const e of entries) {
    sum += e.progress.pctDone
    byTier[progressTier(e.progress.pctDone)] += 1
  }
  return {
    count: entries.length,
    avgPctDone: Math.round(sum / entries.length),
    byTier,
  }
}

/**
 * AI prompt 行 / dashboard chip 用の集約 1 行サマリ:
 *   '進行中 5 件: 平均 35%, 停滞 2 / 順調 2 / 仕上げ 1'
 *   '進行中 0 件' (= entries 空)
 *
 * count=0 の tier は省略 (= 「健全 0 件」を出さない)、bucket 順序は: 停滞 → 前半遅延
 * → 順調 → 仕上げ間近。
 */
export function formatAggregateParentItemsJa(agg: ParentItemsAggregate): string {
  if (agg.count === 0) return '進行中 0 件'
  const parts: string[] = []
  if (agg.byTier.stuck > 0) parts.push(`停滞 ${agg.byTier.stuck}`)
  if (agg.byTier.slow > 0) parts.push(`前半遅延 ${agg.byTier.slow}`)
  if (agg.byTier.healthy > 0) parts.push(`順調 ${agg.byTier.healthy}`)
  if (agg.byTier.almostDone > 0) parts.push(`仕上げ ${agg.byTier.almostDone}`)
  const tierBody = parts.length > 0 ? `, ${parts.join(' / ')}` : ''
  return `進行中 ${agg.count} 件: 平均 ${agg.avgPctDone}%${tierBody}`
}

/**
 * iter432 ai-automation: incomplete parents を priority 別 stat にバケット化する
 * pure helper。
 *
 * iter386 (must-overdue) / iter391 (must-stuck-wip) / iter406 (must-stale) /
 * iter408 (slip-days) / iter414 (blocked-items) / iter429 (at-risk-parents) と
 * 並ぶ「× priority」軸 — parent-items-progress 軸版 (7 弾目)。dashboard chip の
 * aria-label / title (= SR / hover 経路) で「priority breakdown」を出すための
 * substrate (= 次 iter で basics として bind 予定)。
 *
 * 仕様:
 *  - incomplete parent を priority (1-4) で bucket 化 (PRIORITY_ORDER 不変)
 *  - 各 bucket の `count` (= 該当 parent 数) と `avgPctDone` (= bucket 内 pctDone
 *    平均、Math.round 整数化、count=0 なら null) を返す
 *  - 全 priority 0 件 / count=0 でも全 4 bucket は必ず初期化 (undefined チェック不要)
 */
export interface ParentItemsProgressPriorityStats {
  count: number
  /** 該当 priority bucket 内の pctDone 平均 (Math.round 整数、count=0 なら null) */
  avgPctDone: number | null
}

export type ParentItemsProgressByPriority = Record<PriorityKey, ParentItemsProgressPriorityStats>

export function computeParentItemsProgressByPriority<I>(
  entries: readonly ParentItemProgress<I>[],
): ParentItemsProgressByPriority {
  const result: ParentItemsProgressByPriority = {
    1: { count: 0, avgPctDone: null },
    2: { count: 0, avgPctDone: null },
    3: { count: 0, avgPctDone: null },
    4: { count: 0, avgPctDone: null },
  }
  const sums: Record<PriorityKey, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const e of entries) {
    result[e.priority].count += 1
    sums[e.priority] += e.progress.pctDone
  }
  for (const k of PRIORITY_ORDER) {
    const bucket = result[k]
    if (bucket.count > 0) bucket.avgPctDone = Math.round(sums[k] / bucket.count)
  }
  return result
}

/**
 * AI prompt / dashboard chip aria-label 用 priority 別 1 行サマリ:
 *   '進行中: P1 1 件 (平均 30%) / P3 2 件 (平均 60%)'
 *
 * count=0 bucket は省略、全 0 → '進行中の案件 0 件'。iter386/408/414/429 と同じ
 * '{label}: P1 ... / P3 ...' 形式。
 */
export function formatParentItemsProgressByPriorityJa(
  byPriority: ParentItemsProgressByPriority,
): string {
  return formatPriorityBucketsLabeled(
    byPriority,
    (k, s) =>
      s.count === 0 || s.avgPctDone === null ? null : `P${k} ${s.count} 件 (平均 ${s.avgPctDone}%)`,
    '進行中',
    '進行中の案件 0 件',
  )
}
