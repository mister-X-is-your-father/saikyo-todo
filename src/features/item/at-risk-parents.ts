/**
 * iter427 ai-automation: 「子孫の最終更新が古い parent」を抽出する pure helper。
 *
 * iter359 (selectStuckWipItems = 進行中個別 item の updatedAt 停滞) と iter419
 * (pickIncompleteParentItems = 進捗 list) を組み合わせた **at-risk parent 軸** —
 * parent 自身は動いていなくても、子孫の更新が古ければ「案件全体が停滞している」
 * とみなす。
 *
 * 使い分け:
 *   - selectStuckWipItems: in_progress の **個別 item** で updatedAt が古い (実装中
 *     stalled)
 *   - pickIncompleteParentItems: 子を持つ未完了 parent の **進捗 list** (進捗 list)
 *   - 本 helper: parent 単位で **子孫全体** の updatedAt 経過を集約 (= 「この案件は
 *     最近触られていない」を 1 行で出す)
 *
 * AI 朝 brief / pm-agent prompt / dashboard widget が「触れていない案件: A 14日 /
 * B 8日 / 他 2 件」を 1 関数で出せる。
 *
 * 仕様:
 *  - 入力: items (parentPath / status / updatedAt / doneAt 等) + thresholdDays (default 7)
 *  - parent 候補 = `summarizeDescendantsProgress.total > 0` (= 子孫を 1 件以上持つ)
 *  - 各 parent について子孫 (= ltree prefix match) の中で **最古 updatedAt** を取得
 *    (doneAt 済 / cancelled は除外して active 子孫のみ対象、deletedAt も除外)
 *  - 最古 updatedAt から today までの経過日数 (Math.floor で整数日) が thresholdDays
 *    以上ならこの parent は「at-risk」 → 結果に含める
 *  - parent 自身が `deletedAt != null` または `doneAt != null` (達成済) は除外
 *  - 並びは maxStaleDays 降順 → parent.title ja 昇順
 */
import { MS_PER_DAY, parseDateOrNull } from '@/lib/date/iso'
import { fullPathOf, isPathDescendantOf } from '@/lib/db/ltree-path'
import { formatTopWithOverflow, titleOrUntitled } from '@/lib/format-list'
import { classifyByCountAndMax, type FourStateHint } from '@/lib/hint'

import {
  formatPriorityBucketsLabeled,
  initPriorityRecord,
  normalizePriority,
  type PriorityKey,
} from './priority'

export interface AtRiskParentEntry<I> {
  parent: I
  /** active 子孫のうち最古 updatedAt の経過日数 (Math.floor で整数) */
  maxStaleDays: number
  /** active 子孫の件数 (集計対象、cancelled / done / deleted を除外) */
  activeDescendantCount: number
  /** parent.priority を 1-4 に正規化 (null/未設定は 4 へ) */
  priority: PriorityKey
}

interface ParentItemFields {
  id: string
  title: string
  parentPath: string
  status: string | null | undefined
  updatedAt: Date | string | null | undefined
  doneAt?: Date | string | null
  deletedAt?: Date | null
  priority?: number | null
}

export interface SelectAtRiskParentsOptions {
  /** at-risk と見なす最古 updatedAt 経過日数の閾値。default 7 (= 1 週間放置) */
  thresholdDays?: number
}

/**
 * `allItems` から「子孫の最古 updatedAt が thresholdDays 以上経過している parent」を抽出。
 *
 * stuck-wip と異なり parent 自身の status は問わない (parent は abstract 集約 task で
 * status='todo' のままでも子孫が動いていれば OK、本 helper は「子孫が触れられて
 * いない」が判定軸)。
 */
export function pickAtRiskParents<I extends ParentItemFields>(
  allItems: readonly I[],
  options: SelectAtRiskParentsOptions = {},
  today: Date | string = new Date(),
): AtRiskParentEntry<I>[] {
  const thresholdDays = options.thresholdDays ?? 7
  const todayDate = parseDateOrNull(today)
  if (!todayDate) return []
  const todayMs = todayDate.getTime()

  const result: AtRiskParentEntry<I>[] = []
  for (const candidate of allItems) {
    if (candidate.deletedAt != null) continue
    if (candidate.doneAt != null) continue

    const parentFull = fullPathOf({ id: candidate.id, parentPath: candidate.parentPath })

    let oldestUpdatedAtMs: number | null = null
    let activeDescendantCount = 0
    for (const it of allItems) {
      if (it.deletedAt != null) continue
      if (!isPathDescendantOf(it.parentPath, parentFull)) continue
      // active 子孫のみ: cancelled / done は除外 (= 達成 / 諦めは「停滞」じゃない)
      if (it.status === 'cancelled') continue
      if (it.doneAt != null) continue
      const updatedAt = parseDateOrNull(it.updatedAt)
      if (!updatedAt) continue
      activeDescendantCount += 1
      const ms = updatedAt.getTime()
      if (oldestUpdatedAtMs === null || ms < oldestUpdatedAtMs) {
        oldestUpdatedAtMs = ms
      }
    }

    if (oldestUpdatedAtMs === null || activeDescendantCount === 0) continue
    const diffMs = todayMs - oldestUpdatedAtMs
    if (diffMs < 0) continue
    const maxStaleDays = Math.floor(diffMs / MS_PER_DAY)
    if (maxStaleDays < thresholdDays) continue
    result.push({
      parent: candidate,
      maxStaleDays,
      activeDescendantCount,
      priority: normalizePriority(candidate.priority),
    })
  }
  result.sort((a, b) => {
    if (a.maxStaleDays !== b.maxStaleDays) return b.maxStaleDays - a.maxStaleDays
    return a.parent.title.localeCompare(b.parent.title, 'ja')
  })
  return result
}

/**
 * AI brief / dashboard chip 用の 1 行 summary。
 *
 *   - 0 件 → '触れていない案件 0 件'
 *   - 1+ 件 → '触れていない案件 N 件: A 14日 / B 8日 / 他 K 件'
 *
 * formatTopWithOverflow 委譲、title 空は '(無題)' に正規化、limit default 3。
 */
export function formatAtRiskParentsBriefJa<I extends ParentItemFields>(
  entries: readonly AtRiskParentEntry<I>[],
  limit: number = 3,
): string {
  if (entries.length === 0) return '触れていない案件 0 件'
  const body = formatTopWithOverflow(
    entries,
    (e) => `${titleOrUntitled(e.parent.title)} ${e.maxStaleDays}日`,
    limit,
  )
  return `触れていない案件 ${entries.length} 件: ${body}`
}

/**
 * iter429 ai-automation: at-risk parents を priority 別 stat にバケット化する pure helper。
 *
 * iter386 (must-overdue) / iter391 (must-stuck-wip) / iter406 (must-stale) /
 * iter408 (slip-days) / iter414 (blocked-items) と並ぶ「× priority」軸 — at-risk
 * parents 軸版 (6 弾目)。dashboard chip の aria-label / title (= SR / hover 経路) で
 * 「priority breakdown」を出すための substrate。
 *
 * 仕様:
 *  - at-risk parent を priority (1-4) で bucket 化 (PRIORITY_ORDER 不変)
 *  - 各 bucket の `count` (= 該当 at-risk parent 数) と `maxStaleDays`
 *    (= bucket 内最大、count=0 なら null)
 *  - 全 priority 0 件 / count=0 でも全 4 bucket は必ず初期化
 */
export interface AtRiskParentsPriorityStats {
  count: number
  /** 該当 priority bucket 内最大 maxStaleDays (count=0 なら null) */
  maxStaleDays: number | null
}

export type AtRiskParentsByPriority = Record<PriorityKey, AtRiskParentsPriorityStats>

export function computeAtRiskParentsByPriority<I>(
  entries: readonly AtRiskParentEntry<I>[],
): AtRiskParentsByPriority {
  const result: AtRiskParentsByPriority = initPriorityRecord(() => ({
    count: 0,
    maxStaleDays: null,
  }))
  for (const e of entries) {
    const bucket = result[e.priority]
    bucket.count += 1
    if (bucket.maxStaleDays === null || e.maxStaleDays > bucket.maxStaleDays) {
      bucket.maxStaleDays = e.maxStaleDays
    }
  }
  return result
}

/**
 * AI prompt / dashboard chip aria-label 用 priority 別 1 行サマリ:
 *   '触れていない案件: P1 1 件 (最大 14日) / P3 2 件 (最大 8日)'
 *
 * count=0 bucket は省略、全 0 → '触れていない案件 0 件'。iter386/408/414 と同じ
 * '{label}: P1 ... / P3 ...' 形式。
 */
export function formatAtRiskParentsByPriorityJa(byPriority: AtRiskParentsByPriority): string {
  return formatPriorityBucketsLabeled(
    byPriority,
    (k, s) =>
      s.count === 0 || s.maxStaleDays === null
        ? null
        : `P${k} ${s.count} 件 (最大 ${s.maxStaleDays}日)`,
    '触れていない案件',
    '触れていない案件 0 件',
  )
}

/**
 * iter442 ai-automation: at-risk parents の severity を「1 word」で表現する hint helper。
 *
 * iter424 (descendants-activity-hint, 個別 parent 単位) / iter439 (blocked-items-hint,
 * 依存 axis) と並ぶ「item axis 1-word state」シリーズの at-risk-parents 軸版 (3 弾目)。
 * AI 朝 brief / pm-agent / dashboard chip / Slack 通知が「workspace 全体の案件停滞
 * 度合い」を 1 word で出せる substrate。
 *
 * 4 状態 (entries.length, maxStaleDays max の組み合わせ):
 *  - 'idle'      → '全案件 active' / '案件停滞なし'  (entries 空)
 *  - 'mild'      → '一部案件停滞'                     (count ≤ 2 かつ max < 14)
 *  - 'moderate'  → '案件停滞多め'                     (count 3-4 または max 14-29)
 *  - 'severe'    → '案件深刻放置 (要 review)'         (count ≥ 5 または max ≥ 30)
 *
 * iter445 refactor: 判定ロジックは `classifyByCountAndMax` (lib/hint.ts) に
 * 集約済 (blocked-items-hint と共通)。本 callsite は閾値 + getter のみ提供。
 *
 * caller benefits:
 *  - dashboard chip の glyph / tone を hint base で決める (severe = red 候補)
 *  - Slack 朝 brief の 1 行 status (severe で workspace-wide 警告)
 *  - AI prompt の 1 word 状況把握 (= 'severe' なら brief 先頭警告 / 'idle' なら省略)
 *  - formatAtRiskParentsBriefJa (詳細 list) と相補で「数値 vs 意味付け」を出し分け
 */
export type AtRiskParentsHint = FourStateHint

export function classifyAtRiskParentsHint<I>(
  entries: readonly AtRiskParentEntry<I>[],
): AtRiskParentsHint {
  return classifyByCountAndMax(entries, (e) => e.maxStaleDays, {
    moderateCount: 3,
    moderateMax: 14,
    severeCount: 5,
    severeMax: 30,
  })
}

const HINT_LABEL_JA: Record<AtRiskParentsHint, string> = {
  idle: '案件停滞なし',
  mild: '一部案件停滞',
  moderate: '案件停滞多め',
  severe: '案件深刻放置 (要 review)',
}

export function formatAtRiskParentsHintJa<I>(entries: readonly AtRiskParentEntry<I>[]): string {
  return HINT_LABEL_JA[classifyAtRiskParentsHint(entries)]
}
