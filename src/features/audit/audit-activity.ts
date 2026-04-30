/**
 * iter324 ai-automation: audit_log を action カテゴリ別 + actor 別に集計する
 * pure helper。
 *
 * iter309 並走 `comment-activity.ts` (item 別) / iter322 `notification-activity.ts`
 * (type 別) と同 shape の「分布集計」第 4 軸 — **audit_log の操作種別 / 担当者**。
 *
 * AI 朝 brief / dashboard widget が「今日のチーム活動: 作成 12 / 完了 5 / 削除 1
 * (合計 24 件、3 名)」を 1 関数で取れる substrate。
 *
 * 仕様:
 *   - 7 カテゴリ (create / update / transition / complete / reopen / delete / other) を
 *     `getAuditActionCategory` 経由で分類 (action-visual.ts と同 vocabulary)
 *   - `since` で createdAt (= ts) 古い entry を除外。不正 ts は since 指定時のみ除外
 *   - `actorTypes` で 'user' / 'agent' をフィルタ (default 'user' のみ。
 *     AI Agent 起因の自動 mutation は人のチーム活動と分けて見たいケース多い)
 */

import { parseDateOrNull } from '@/lib/date/iso'
import { formatNonZeroCounts } from '@/lib/format-counts'

import { type AuditActionCategory, getAuditActionCategory } from './action-visual'

const CATEGORY_KEYS: readonly AuditActionCategory[] = [
  'create',
  'update',
  'transition',
  'complete',
  'reopen',
  'delete',
  'other',
] as const

const CATEGORY_LABEL: Record<AuditActionCategory, string> = {
  create: '作成',
  update: '更新',
  transition: '遷移',
  complete: '完了',
  reopen: '完了取消',
  delete: '削除',
  other: 'その他',
}

export type AuditCategoryCounts = Record<AuditActionCategory, number>

export interface AuditActivityEntry {
  action: string
  actorType: string // 'user' | 'agent' | etc
  actorId: string
  ts: Date | string | null
}

export interface AuditActivityOptions {
  /** Date or ISO string。ts >= since のみ集計 */
  since?: Date | string
  /** 集計対象 actorType (default ['user'])。空配列で全 actorType */
  actorTypes?: readonly string[]
}

function emptyCounts(): AuditCategoryCounts {
  return {
    create: 0,
    update: 0,
    transition: 0,
    complete: 0,
    reopen: 0,
    delete: 0,
    other: 0,
  }
}

function passesFilter(
  entry: AuditActivityEntry,
  since: Date | null,
  actorTypeSet: ReadonlySet<string> | null,
): boolean {
  if (actorTypeSet && !actorTypeSet.has(entry.actorType)) return false
  if (since) {
    const ts = parseDateOrNull(entry.ts)
    if (!ts) return false
    if (ts.getTime() < since.getTime()) return false
  }
  return true
}

export function auditActionCategoryLabel(category: AuditActionCategory): string {
  return CATEGORY_LABEL[category]
}

export function groupAuditByCategory(
  entries: readonly AuditActivityEntry[],
  options: AuditActivityOptions = {},
): AuditCategoryCounts {
  const result = emptyCounts()
  const since = options.since ? parseDateOrNull(options.since) : null
  const actorTypeSet =
    options.actorTypes === undefined
      ? new Set<string>(['user'])
      : options.actorTypes.length === 0
        ? null
        : new Set(options.actorTypes)
  for (const e of entries) {
    if (!passesFilter(e, since, actorTypeSet)) continue
    const cat = getAuditActionCategory(e.action)
    result[cat] += 1
  }
  return result
}

/**
 * actor 別集計 (誰が何件操作したか)。`Map<actorId, count>`、stable insertion order
 * (Map の挿入順 = 最初に出現した順)。0 件は含まない。
 */
export function groupAuditByActor(
  entries: readonly AuditActivityEntry[],
  options: AuditActivityOptions = {},
): Map<string, number> {
  const result = new Map<string, number>()
  const since = options.since ? parseDateOrNull(options.since) : null
  const actorTypeSet =
    options.actorTypes === undefined
      ? new Set<string>(['user'])
      : options.actorTypes.length === 0
        ? null
        : new Set(options.actorTypes)
  for (const e of entries) {
    if (!passesFilter(e, since, actorTypeSet)) continue
    result.set(e.actorId, (result.get(e.actorId) ?? 0) + 1)
  }
  return result
}

/**
 * 7 カテゴリ集計を 1 行に整形 (`'作成 12 / 完了 5 / 更新 3'`)。0 件 bucket は省略、
 * 全 0 → '0 件'。`emptySentinel` で sentinel 文字列を override 可能。
 */
export function formatAuditActivitySummary(
  counts: Readonly<AuditCategoryCounts>,
  emptySentinel?: string,
): string {
  return formatNonZeroCounts(counts, CATEGORY_KEYS, CATEGORY_LABEL, emptySentinel)
}

/**
 * AI brief 1 行: `'活動 24 件 (3 名): 作成 12 / 更新 8 / 完了 4'` 形式。
 *
 * actor 数 + 件数合計 + カテゴリ分布の 3 軸を一行に圧縮。0 件は
 * `'活動 0 件 (該当なし)'` sentinel。
 */
export function formatAuditActivityBrief(
  entries: readonly AuditActivityEntry[],
  options: AuditActivityOptions = {},
): string {
  const cat = groupAuditByCategory(entries, options)
  const total = CATEGORY_KEYS.reduce((s, k) => s + cat[k], 0)
  if (total === 0) return '活動 0 件 (該当なし)'
  const actors = groupAuditByActor(entries, options).size
  const breakdown = formatAuditActivitySummary(cat)
  return `活動 ${total} 件 (${actors} 名): ${breakdown}`
}

/**
 * iter493 basics: workspace 活動量 4 状態 hint シリーズ 12 弾目 (= velocity / weekly-insight /
 * inbox-process / notification-activity と同 FourStateHint 系列)。
 *
 * - 'idle'     : 全 0 件 (= 活動なし)
 * - 'severe'   : 合計 >= 200 (= 1 日 200 操作 = 異常な activity 多発)
 * - 'moderate' : 合計 >= 50 (= 活発、要 monitoring)
 * - 'mild'     : それ以外 (= 通常範囲)
 *
 * 用途: dashboard chip 「活動 健全」 / AI 朝 brief 見出し / Slack daily digest 強調。
 */
import { type FourStateHint, makeHintLabelFormatter } from '@/lib/hint'

export type AuditActivityHint = FourStateHint

export function classifyAuditActivityHint(
  counts: Readonly<AuditCategoryCounts>,
): AuditActivityHint {
  const total = CATEGORY_KEYS.reduce((s, k) => s + counts[k], 0)
  if (total === 0) return 'idle'
  if (total >= 200) return 'severe'
  if (total >= 50) return 'moderate'
  return 'mild'
}

const AUDIT_ACTIVITY_HINT_LABEL_JA: Record<AuditActivityHint, string> = {
  idle: '活動なし',
  mild: '通常',
  moderate: '活発',
  severe: '異常',
}

export const formatAuditActivityHintJa = makeHintLabelFormatter(
  classifyAuditActivityHint,
  AUDIT_ACTIVITY_HINT_LABEL_JA,
)
