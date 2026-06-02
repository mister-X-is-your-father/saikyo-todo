/**
 * iter523 (queue fluffy-3 retro→widget substrate): Sprint retrospective
 * 数値レポート の pure data substrate。
 *
 * fluffy 撲滅原則 (FEEDBACK_QUEUE.md META):
 *   - AI に KPT 感想文を書かせない (= retro-service.ts の現状はそれ、low-information)
 *   - 完了率 / planned vs delivered / root cause 自動分類 を deterministic に出す
 *   - widget は本 helper の output を直接 render するだけ (fluffy 文章不要)
 *
 * 集計内容:
 *   - status 分布 (todo / in_progress / blocked / done / cancelled)
 *   - completionRate = done / total (round, total=0 → 0)
 *   - plannedVsDelivered = planned (= total - cancelled), delivered (= done), delta
 *   - rootCauses = 落ちた item を 4 軸で自動分類 (overdueDelivery / incompleteOnTime /
 *     cancelledMid / blockedAtClose)。各 item は重複カウント可 (cancelled かつ overdue 等)
 *   - comparisonWithPrev = 前 sprint の同 helper output と完了率 delta / done delta を比較、
 *     prev 未指定 → null
 *
 * AI 不使用、副作用なし、依存は status-visual.normalizeStatus のみ (status 正規化用)。
 *
 * 既存資産との関係:
 *   - `computeSprintBurndown` (burndown.ts) は期間 / 経過率 / on-track 判定のみを担当
 *     (本 helper と orthogonal、retro widget は両方を使う)。
 *   - `groupItemsByStatus` も使えるが、本 helper は数値だけ返したいので独自集計。
 */
import { MS_PER_DAY, parseDateOrNull } from '@/lib/date/iso'
import { rateToPct } from '@/lib/format-rate'
import type { Severity } from '@/lib/widget/severity'
import { aggregateCountsBySeverity } from '@/lib/widget/severity-bridges'

import { normalizeStatus } from '@/features/item/status-visual'

export interface SprintRetroItemFields {
  status: string | null | undefined
  /** ISO YYYY-MM-DD or null。done 判定の delivery 期限比較に使う */
  dueDate?: string | null | undefined
  /** 完了時刻。string or Date、parse 失敗時は null として扱う */
  doneAt?: Date | string | null | undefined
}

export interface SprintRetroSummary {
  /** sprint に割当された item 件数 (cancelled 含む) */
  total: number
  /** status 分布 (重複なし、unknown は other に集約) */
  statusBreakdown: {
    todo: number
    inProgress: number
    blocked: number
    done: number
    cancelled: number
    other: number
  }
  /** 完了率 0-100 (round)、total=0 → 0 */
  completionRate: number
  /** 計画件数 (= total - cancelled、cancelled は計画から外れたとみなす) と納品件数 (= done) */
  plannedVsDelivered: {
    planned: number
    delivered: number
    /** delivered - planned (負なら未達) */
    delta: number
  }
  /** 落ちた item の自動分類 (1 item 複数該当可) */
  rootCauses: {
    /** done だが doneAt > dueDate (= 遅れて完了) */
    overdueDelivery: number
    /** 未完了 (todo/in_progress/blocked) で dueDate <= sprint 終了 (= 落ちた) */
    incompleteOnTime: number
    /** sprint 中に cancelled 化 (= 計画から外した) */
    cancelledMid: number
    /** sprint 終了時点で blocked 状態のまま (= 依存切れず) */
    blockedAtClose: number
  }
  /** 前 sprint との比較。prev 未指定 → null */
  comparisonWithPrev: {
    trend: 'up' | 'down' | 'flat'
    /** completionRate 差 (pct points、curr - prev、整数 round) */
    completionDelta: number
    /** done count 差 (curr - prev) */
    doneDelta: number
  } | null
}

export interface SprintRetroOptions {
  /** 前 sprint の items (= 同 helper を再帰呼出す形で trend 算出) */
  prevItems?: readonly SprintRetroItemFields[]
  /** sprint 終了日 (ISO YYYY-MM-DD)。incompleteOnTime / overdueDelivery 判定の基準。
   *  省略時は dueDate 単独 (= dueDate なら今日基準で「落ちた」と判定しない) */
  sprintEndISO?: string
}

// iter1032 refactor: 旧 local `parseDoneAt` / `parseISODate` を `@/lib/date/iso#parseDateOrNull`
// に集約 (= iter490 で確立した 38 弾 sweep の 39 弾目)。`new Date('YYYY-MM-DD')` と
// `new Date('YYYY-MM-DDT00:00:00Z')` は ES 仕様で同一 (= UTC midnight)、parseDateOrNull は
// 両者を透過的に扱う + 不正 string は NaN check で null。本 file の private 2 関数は parseDateOrNull
// の薄い alias で完全に置換可能 (= behavior preserving)。
const parseDoneAt = parseDateOrNull
const parseISODate = parseDateOrNull

export function buildSprintRetroSummary(
  items: readonly SprintRetroItemFields[],
  options: SprintRetroOptions = {},
): SprintRetroSummary {
  const total = items.length
  const breakdown = {
    todo: 0,
    inProgress: 0,
    blocked: 0,
    done: 0,
    cancelled: 0,
    other: 0,
  }
  let overdueDelivery = 0
  let incompleteOnTime = 0
  let cancelledMid = 0
  let blockedAtClose = 0

  const sprintEndDate = parseISODate(options.sprintEndISO)

  for (const it of items) {
    const s = normalizeStatus(it.status)
    if (s === 'todo') breakdown.todo += 1
    else if (s === 'in_progress') breakdown.inProgress += 1
    else if (s === 'blocked') breakdown.blocked += 1
    else if (s === 'done') breakdown.done += 1
    else if (s === 'cancelled') breakdown.cancelled += 1
    else breakdown.other += 1

    // root cause 分類
    if (s === 'cancelled') cancelledMid += 1
    if (s === 'blocked') blockedAtClose += 1

    if (s === 'done') {
      // overdueDelivery: doneAt > dueDate → 遅れて完了
      const due = parseISODate(it.dueDate)
      const done = parseDoneAt(it.doneAt)
      if (due !== null && done !== null && done.getTime() > due.getTime() + MS_PER_DAY - 1) {
        overdueDelivery += 1
      }
    } else if (s === 'todo' || s === 'in_progress' || s === 'blocked') {
      // incompleteOnTime: 未完了で sprint 終了 (or dueDate) を過ぎたか同日
      const due = parseISODate(it.dueDate)
      const closeBy = sprintEndDate ?? due
      if (due !== null && closeBy !== null && due.getTime() <= closeBy.getTime()) {
        incompleteOnTime += 1
      }
    }
  }

  const completionRate = total === 0 ? 0 : rateToPct(breakdown.done / total)
  const planned = total - breakdown.cancelled
  const delivered = breakdown.done
  const delta = delivered - planned

  let comparisonWithPrev: SprintRetroSummary['comparisonWithPrev'] = null
  if (options.prevItems !== undefined) {
    const prev = buildSprintRetroSummary(options.prevItems, { sprintEndISO: options.sprintEndISO })
    const completionDelta = completionRate - prev.completionRate
    const doneDelta = breakdown.done - prev.statusBreakdown.done
    let trend: 'up' | 'down' | 'flat' = 'flat'
    if (completionDelta > 0) trend = 'up'
    else if (completionDelta < 0) trend = 'down'
    comparisonWithPrev = { trend, completionDelta, doneDelta }
  }

  return {
    total,
    statusBreakdown: breakdown,
    completionRate,
    plannedVsDelivered: { planned, delivered, delta },
    rootCauses: { overdueDelivery, incompleteOnTime, cancelledMid, blockedAtClose },
    comparisonWithPrev,
  }
}

/**
 * iter528 ai-automation: SprintRetroWidget の inline helper を pure 化。
 *
 * 完了率 (= done / total) を 4 段 severity に分類。SeverityChip の tone bind と
 * progress bar aria-valuetext 用の共通分類軸として、widget 以外 (AI prompt /
 * dashboard chip / Slack 通知) からも参照できるよう抽出。
 *
 * 閾値:
 *  - 'ok'     >= 75 (= 順調、青信号)
 *  - 'info'   >= 50 (= 良好、半数超え)
 *  - 'warn'   >= 25 (= 注意、まだ追い込み余地)
 *  - 'danger' <  25 (= 要対策、低空飛行)
 */
export type RetroCompletionSeverity = 'ok' | 'info' | 'warn' | 'danger'

export function completionRateSeverity(rate: number): RetroCompletionSeverity {
  if (rate >= 75) return 'ok'
  if (rate >= 50) return 'info'
  if (rate >= 25) return 'warn'
  return 'danger'
}

const SEVERITY_LABEL_JA: Record<RetroCompletionSeverity, string> = {
  ok: '順調',
  info: '良好',
  warn: '注意',
  danger: '要対策',
}

export function completionRateSeverityLabelJa(sev: RetroCompletionSeverity): string {
  return SEVERITY_LABEL_JA[sev]
}

/**
 * iter545 ai-automation: `Record<RetroCompletionSeverity, number>` (Sprint retro 完了率
 * 4 段別件数) を 共通 5 段 Severity counts に集約する pure helper。
 *
 * iter533-544 と同 pattern (= 13 ドメイン目)。`RetroCompletionSeverity` 自体が共通 5 段
 * Severity の subset (muted 不在) なので bridge は identity copy + muted 0 padding。
 *
 * caller は workspace 内 sprint 群の完了率 distribution を 1 行 severity サマリで
 * AI prompt / Slack / dashboard に出せる。例: 「危険 1 / 注意 1 / 情報 2 / OK 3 (合計 7)」
 */
// iter1693 refactor: iter1430 で extract した汎用 `aggregateCountsBySeverity` に委譲。
// iter1687-1692 (due-proximity / goal-health / bias / recovery-plan / ai-assignee / forecast) に
// 続く外部 file 追従 8 件目。`RetroCompletionSeverity` が共通 Severity の subset (muted 不在)
// なので identity mapping `(k) => k`、muted bucket は 0 padding される。iter1692 forecast と
// 同 pattern (subset identity copy 2 件目)。inline tuple type を共通 `Severity` 型に統一。
export function retroCompletionSeverityCountsToSeverityCounts(
  counts: Record<RetroCompletionSeverity, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, (k) => k)
}

/**
 * AI prompt / Slack / chip aria-label 用 1 行 retro summary:
 *  '完了率 80% (順調) — 計画 10 件 / 納品 8 件 / 改善 +5pt'
 *  '完了率 0% (要対策) — 計画 0 件 / 納品 0 件'  (= empty 場合)
 */
export function formatSprintRetroSummaryJa(summary: SprintRetroSummary): string {
  const sev = completionRateSeverity(summary.completionRate)
  const sevLabel = completionRateSeverityLabelJa(sev)
  const { planned, delivered } = summary.plannedVsDelivered
  const cmp = summary.comparisonWithPrev
  const trendPart =
    cmp === null
      ? ''
      : ` — ${cmp.trend === 'up' ? '改善' : cmp.trend === 'down' ? '悪化' : '横ばい'} ${
          cmp.completionDelta >= 0 ? '+' : ''
        }${cmp.completionDelta}pt`
  return `完了率 ${summary.completionRate}% (${sevLabel}) — 計画 ${planned} 件 / 納品 ${delivered} 件${trendPart}`
}
