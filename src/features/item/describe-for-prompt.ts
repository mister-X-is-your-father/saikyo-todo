/**
 * iter294 ai-automation: Item を AI prompt 用 1 行に圧縮する pure helper。
 *
 * AI agent (PM Agent / Researcher / cloud-engineer) prompt が「現在の Item
 * 一覧」を context として渡す時、each item を統一フォーマットで描けるように
 * substrate を集約する。今までは call site ごとに format を inline で書いて
 * いたので、表記が揺れて diff が読みにくく / cache hit にも影響していた。
 *
 * フォーマット (固定順序):
 *   `[<priority>] [<MUST?>] [due:<label>] [status:<status>] [<estimate>] <title>`
 *
 *   priority: `p1` / `p2` / `p3` / `p4` (priority weight ラベル)
 *   MUST?:    `MUST` (isMust=true のみ)、付かない場合は省略
 *   due:      `due:今日(0d)` / `due:期限切れ(-3d)` / `due:今後(+10d)` / `due:なし`
 *   status:   `status:todo` / `status:in_progress` / `status:done` / 任意 enum
 *   estimate: `est:30m` / `est:1.5h` / `est:なし` (description から extract)
 *   title:    タイトル (改行は半角スペースに置換、>120 文字は `...` で切る)
 *
 * 注意:
 *  - これは AI prompt 用なので **stable な書式を維持** すること (cache hit に
 *    影響)。format を変える時は call site / cache invalidation を意識する
 *  - description / DoD は本関数では出さない (token 節約)。詳細は別 prompt で
 */

import { type DueProximityKind, getDueProximity } from './due-proximity'
import { extractEstimateMinutes } from './estimate'
import type { Item } from './schema'
import { computeUrgency } from './urgency'

export interface DescribeOptions {
  /** title を切り詰める上限。default 120。 */
  maxTitleLen?: number
  /** dueDate proximity / today (Date) 計算用の base。未指定で `new Date()`。 */
  today?: Date
  /** include estimate (default true)。token 節約で false にも */
  withEstimate?: boolean
}

export function describeItemForPrompt(
  item: Pick<
    Item,
    'title' | 'priority' | 'dueDate' | 'isMust' | 'status' | 'doneAt' | 'archivedAt' | 'description'
  >,
  options: DescribeOptions = {},
): string {
  const today = options.today ?? new Date()
  const maxTitleLen = options.maxTitleLen ?? 120
  const withEstimate = options.withEstimate ?? true

  const parts: string[] = []
  parts.push(`[p${clampPriority(item.priority)}]`)
  if (item.isMust) parts.push('[MUST]')
  parts.push(`[due:${formatDueLabel(item.dueDate, today)}]`)
  parts.push(`[status:${item.status}]`)

  if (withEstimate) {
    const minutes = extractEstimateMinutes(item.description)
    parts.push(`[est:${formatEstimate(minutes)}]`)
  }

  parts.push(formatTitle(item.title, maxTitleLen))
  return parts.join(' ')
}

function clampPriority(p: number): 1 | 2 | 3 | 4 {
  if (p === 1 || p === 2 || p === 3 || p === 4) return p
  return 4
}

/**
 * iter310 refactor: dueDate parsing / diffDays / kind 分類は due-proximity.ts (iter287)
 * に集約済 → 重複した parseIso + threshold 比較を削除し、kind で switch する形に置換。
 * 動作変更ゼロ (期限切れ / 今日 / 明日 / 今週内 / 今後 / なし の 6 mode label は同一)。
 */
const DUE_PROMPT_LABEL: Record<DueProximityKind, string> = {
  overdue: '期限切れ',
  today: '今日',
  tomorrow: '明日',
  thisWeek: '今週内',
  later: '今後',
  noDate: 'なし',
}

function formatDueLabel(dueDate: string | null | undefined, today: Date): string {
  const { kind, diffDays } = getDueProximity(dueDate, today)
  if (kind === 'noDate') return DUE_PROMPT_LABEL.noDate
  const sign = diffDays !== undefined && diffDays > 0 ? '+' : ''
  return `${DUE_PROMPT_LABEL[kind]}(${sign}${diffDays}d)`
}

function formatEstimate(minutes: number | undefined): string {
  if (minutes === undefined || minutes <= 0) return 'なし'
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  // 整数 hour は "1h" / "2h"、それ以外は "1.5h" 形式 (小数 1 桁)
  if (Number.isInteger(hours)) return `${hours}h`
  return `${hours.toFixed(1)}h`
}

function formatTitle(title: string, max: number): string {
  // 改行 / tab を半角スペースに置換 (1 行に収める)
  const flat = title.replace(/[\r\n\t]+/g, ' ').trim()
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 3)}...`
}

/**
 * 複数 Item を urgency 順にソートして 1 行ずつ描いた markdown bullet list を返す。
 * AI prompt の「現在の Item 一覧」セクション substrate。
 */
export function describeItemsForPrompt(
  items: readonly Parameters<typeof describeItemForPrompt>[0][],
  options: DescribeOptions & {
    /** 空配列のときに返すフォールバック文字列 (default: "(現在 active な Item はありません)") */
    emptyFallback?: string
    /** 上限件数 (default 全件)。urgency 降順に sort してから切る */
    limit?: number
  } = {},
): string {
  const today = options.today ?? new Date()
  const enriched = items
    .map((it, i) => ({ it, i, u: computeUrgency(it, today) }))
    .filter((e) => e.u > 0)
    .sort((a, b) => (b.u !== a.u ? b.u - a.u : a.i - b.i))
  const sliced = options.limit ? enriched.slice(0, options.limit) : enriched
  if (sliced.length === 0) {
    return options.emptyFallback ?? '(現在 active な Item はありません)'
  }
  return sliced.map((e) => `- ${describeItemForPrompt(e.it, options)}`).join('\n')
}
