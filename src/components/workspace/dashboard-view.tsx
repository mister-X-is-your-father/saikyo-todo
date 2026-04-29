'use client'

/**
 * Dashboard View (4th ViewPlugin)。
 * - MUST Item 一覧 (due_date asc)、期限警告色分け (overdue=red / soon=amber)
 * - WIP 警告バナー (wipInProgress > wipLimit)
 * - Burndown chart (recharts LineChart: open 線 + closed 線)
 *
 * 他 View と違い、props で渡される items は使わず、自前の hooks で MUST summary + burndown を fetch。
 * (items board の filter が dashboard には不要、完結して表示したい)
 */
import { useMemo } from 'react'

import { AlertTriangle, Flame } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { shiftIsoDate, todayUtcISO } from '@/lib/date/iso'
import { isAppError } from '@/lib/errors'
import { rateToPct } from '@/lib/format-rate'
import { trendGlyph, trendToneClass } from '@/lib/ui/trend-tone'

import { useBurndown, useMustSummary } from '@/features/dashboard/hooks'
import { computeAgedHygieneDebt, formatAgedHygieneDebtJa } from '@/features/item/aged-hygiene-debt'
import {
  countAgingItemsOlderThanWeek,
  countItemsByAge,
  countItemsByAgeByPriority,
  formatAgingByPriorityJa,
  formatAgingCounts,
} from '@/features/item/backlog-aging'
import {
  combinedHygieneTone,
  combineHygieneScore,
  formatCombinedHygieneJa,
} from '@/features/item/combined-hygiene'
import {
  computeCombinedHygieneByPriority,
  formatCombinedHygieneByPriorityJa,
} from '@/features/item/combined-hygiene-by-priority'
import {
  computeCompletionDaysByPriority,
  computePriorityLatencyGap,
  formatCompletionDaysByPriorityJa,
} from '@/features/item/completion-days-by-priority'
import {
  computeDescriptionCoverage,
  computeDescriptionCoverageByPriority,
  descriptionCoverageTone,
  formatDescriptionCoverageByPriorityJa,
  formatDescriptionCoverageJa,
} from '@/features/item/description-coverage'
import {
  computeDodCoverage,
  computeDodCoverageByPriority,
  dodCoverageTone,
  formatDodCoverageByPriorityJa,
  formatDodCoverageJa,
} from '@/features/item/dod-coverage'
import {
  computeDueDateCoverage,
  computeDueDateCoverageByPriority,
  dueDateCoverageTone,
  formatDueDateCoverageByPriorityJa,
  formatDueDateCoverageJa,
} from '@/features/item/due-date-coverage'
import {
  computeDueHitRate,
  computeDueHitRateByPriority,
  dueHitRateTone,
  formatDueHitRateByPriorityJa,
  formatDueHitRateJa,
} from '@/features/item/due-hit-rate'
import { useItems } from '@/features/item/hooks'
import {
  formatHygieneAxisFocusJa,
  pickWeakestHygieneAxis,
} from '@/features/item/hygiene-axis-focus'
import {
  computeHygieneDebt,
  computeHygieneDebtByPriority,
  formatHygieneDebtByPriorityJa,
  formatHygieneDebtJa,
  hygieneDebtTone,
} from '@/features/item/hygiene-debt'
import { formatHygieneFocusJa, pickWeakestHygienePriority } from '@/features/item/hygiene-focus'
import {
  computeWorkspaceMomentum,
  formatWorkspaceMomentumJa,
  momentumDirectionToTrend,
} from '@/features/item/momentum'
import {
  computeMustHygiene,
  formatMustHygieneJa,
  mustHygieneSeverity,
} from '@/features/item/must-hygiene'
import {
  computeMustOverdue,
  computeMustOverdueByPriority,
  formatMustOverdueByPriorityJa,
  formatMustOverdueJa,
  formatMustOverdueTitlesJa,
  mustOverdueSeverity,
  pickMustOverdueItems,
} from '@/features/item/must-overdue'
import {
  formatMustStaleJa,
  mustStaleSeverity,
  pickMustStaleItems,
} from '@/features/item/must-stale'
import {
  computeMustStuckWipByPriority,
  formatMustStuckWipByPriorityJa,
  formatMustStuckWipJa,
  mustStuckWipSeverity,
  pickMustStuckWipItems,
} from '@/features/item/must-stuck-wip'
import {
  computeOverdueActive,
  computeOverdueActiveByPriority,
  formatOverdueActiveByPriorityJa,
  formatOverdueActiveJa,
  formatOverdueActiveTitlesJa,
  overdueActiveSeverity,
  pickOverdueActiveItems,
} from '@/features/item/overdue-active'
import {
  countNonEmptyPriorityBuckets,
  countNonEmptyPriorityBucketsBy,
} from '@/features/item/priority'
import {
  formatRecentCompletedSummaryJa,
  selectRecentCompleted,
} from '@/features/item/recent-completed'
import {
  computeSlipDays,
  computeSlipDaysByPriority,
  formatSlipDaysByPriorityJa,
  formatSlipDaysJa,
  slipSeverity,
} from '@/features/item/slip-days'
import {
  computeStaleUrgentByPriority,
  formatStaleUrgentByPriorityJa,
  formatStaleUrgentJa,
  pickStaleUrgentItems,
} from '@/features/item/stale-urgent'
import {
  countItemsByUrgencyTier,
  formatTopUrgentTitlesJa,
  formatUrgencyTierCounts,
  urgencyTierCountsSeverity,
} from '@/features/item/urgency'
import { computeVelocity, formatVelocitySummary } from '@/features/item/velocity'
import {
  computeWipByPriority,
  formatWipByPriorityJa,
  wipBiasKind,
} from '@/features/item/wip-by-priority'
import {
  computeStuckWipByPriority,
  formatStuckWipByPriorityJa,
  formatStuckWipSummaryJa,
  selectStuckWipItems,
  stuckWipSeverity,
} from '@/features/item/wip-stuck'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { chipTone3Class, DashboardChip } from '@/components/workspace/dashboard-chip'
import { StatusBadge } from '@/components/workspace/status-badge'

interface Props {
  workspaceId: string
}

function formatDayShort(iso: string): string {
  // 'YYYY-MM-DD' → 'MM/DD'
  return iso.slice(5).replace('-', '/')
}

// iter335 refactor: VELOCITY_TONE / VELOCITY_GLYPH は lib/ui/trend-tone.ts に集約。
// 時間軸と同 polarity='positive' (up=blue 増加 / flat=muted 横ばい / down=red 失速)。
// iter345 refactor: todayISO / addDaysISO (UTC 系) は lib/date/iso.ts に集約。

export function DashboardView({ workspaceId }: Props) {
  const summary = useMustSummary(workspaceId)
  const burndown = useBurndown(workspaceId, 14)
  // Phase 6.15 iter 71: MUST item title click で ItemEditDialog を open
  const [, setOpenItemId] = useQueryState('item', parseAsString)
  // iter331 basics: velocity (iter302) を bind — 直近 7 日 done 件数 + 傾向。
  const itemsQ = useItems(workspaceId)

  const todayStr = todayUtcISO()
  const soonStr = shiftIsoDate(todayStr, 7)

  const burndownData = useMemo(() => {
    return (burndown.data ?? []).map((p) => ({ ...p, label: formatDayShort(p.date) }))
  }, [burndown.data])

  const velocity = useMemo(() => {
    if (!itemsQ.data) return null
    const result = computeVelocity(itemsQ.data, { windowDays: 7 })
    if (result.total === 0) return null
    return { result, line: formatVelocitySummary(result, 7) }
  }, [itemsQ.data])

  // iter336 basics: completion-days-by-priority (iter334) を bind。
  // 全期間完了済 item の所要日数 priority 別 + 高優先 vs 低優先 gap chip。
  // since filter は割愛 (Date.now() useMemo 内呼出を避ける、全 history で平均が取れる方が
  // 統計的にも安定)。Item 完了履歴は archive されないので過去全件が対象。
  const completionGap = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeCompletionDaysByPriority(itemsQ.data)
    const summary = formatCompletionDaysByPriorityJa(stats)
    if (summary === '完了 0 件 (該当なし)') return null
    const gap = computePriorityLatencyGap(stats)
    return { stats, summary, gap }
  }, [itemsQ.data])

  // iter341 basics: workspace momentum (iter339) を bind。直近 7 日 intake vs done
  // を 4 値分類で chip 表示。direction='idle' (= 7 日完全に活動なし) は chip 非表示。
  const momentum = useMemo(() => {
    if (!itemsQ.data) return null
    const m = computeWorkspaceMomentum(itemsQ.data, { windowDays: 7 })
    if (m.direction === 'idle') return null
    const line = formatWorkspaceMomentumJa(m)
    return { result: m, line, trend: momentumDirectionToTrend(m.direction) }
  }, [itemsQ.data])

  // iter343 basics: due-hit-rate (iter342) を bind。完了 + dueDate 有効 item の
  // 期限達成率を chip 表示。total=0 (= 期限付き完了 item 無し) は chip 非表示で UI 静か。
  // hitRate >= 0.8 は emerald (達成)、0.5..0.8 は muted (中立)、<0.5 は amber (警戒)
  // で 3 段階 tone (達成率は higher better なので「up=achievement」polarity='positive')。
  // iter346 basics: priority 別 breakdown (iter344) を aria-label / title に同梱
  // → SR / hover で「P1 100% (3/3) / P3 50% (1/2)」が読める (visible chip 自体は
  // 全体集計だけ、UI は静かなまま、richer info は a11y / hover 経路でのみ提供)。
  const dueHitRate = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeDueHitRate(itemsQ.data)
    if (stats.total === 0 || stats.hitRate === null) return null
    const summary = formatDueHitRateJa(stats)
    const pct = rateToPct(stats.hitRate)
    const tone = dueHitRateTone(stats)
    const byPriority = computeDueHitRateByPriority(itemsQ.data)
    // priority breakdown は「複数 priority に hit/miss が分散」時のみ tooltip に
    // 出す。単一 priority に偏ると全体 summary と同情報なので冗長。
    const detail =
      countNonEmptyPriorityBuckets(byPriority) > 1
        ? `${summary} — ${formatDueHitRateByPriorityJa(byPriority)}`
        : summary
    return { stats, summary, pct, tone, detail }
  }, [itemsQ.data])

  // iter348 basics: slip-days (iter347) を bind。期限超過 item の遅延日数 stat を
  // chip 表示。count=0 (= 全完了 hit) で chip 非表示で UI 静か。amber tone で
  // 警戒色 (= 「遅延 = bad」)、最大値が 7 日以上は red 強調 (= 「重度遅延」)。
  const slipDays = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeSlipDays(itemsQ.data)
    if (stats.count === 0) return null
    const summary = formatSlipDaysJa(stats)
    const severe = slipSeverity(stats) === 'severe'
    // iter388 basics: priority 別 breakdown (iter387) を aria-label / title に同梱
    // → SR / hover で「P1 2 件 (最大 14日) / P3 1 件 (最大 2日)」が読める。
    // 複数 priority に miss が分散している時のみ priority breakdown を tooltip に
    // (iter363/366/373/378/383 と同手法)。
    const byPriority = computeSlipDaysByPriority(itemsQ.data)
    const priorityBuckets = countNonEmptyPriorityBucketsBy(byPriority, (s) => s.count > 0)
    const detail =
      priorityBuckets > 1 ? `${summary} — ${formatSlipDaysByPriorityJa(byPriority)}` : summary
    return { stats, summary, detail, severe }
  }, [itemsQ.data])

  // iter351 basics: due-date-coverage (iter349) を bind。未完了 item の期限
  // 設定率を chip 表示。total=0 (= 未完了 0 件) で chip 非表示。tone は 3 段階
  // (>= 0.7 emerald 健全 / 0.3..0.7 muted 中立 / < 0.3 amber planning 漏れ)。
  // iter366 basics: priority 別 breakdown (iter364) を aria-label / title に同梱
  // → SR / hover で「P1 100% / P3 50%」が読める (iter346 hit-rate-tooltip / iter363
  // dod-coverage-tooltip と同手法、3 chip で 2 層情報設計が完全に揃った)。
  const dueCoverage = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeDueDateCoverage(itemsQ.data)
    if (stats.total === 0 || stats.coverageRate === null) return null
    const summary = formatDueDateCoverageJa(stats)
    const tone = dueDateCoverageTone(stats)
    const pct = rateToPct(stats.coverageRate)
    const byPriority = computeDueDateCoverageByPriority(itemsQ.data)
    const detail =
      countNonEmptyPriorityBuckets(byPriority) > 1
        ? `${summary} — ${formatDueDateCoverageByPriorityJa(byPriority)}`
        : summary
    return { stats, summary, tone, pct, detail }
  }, [itemsQ.data])

  // iter353 basics: dod-coverage (iter352) を bind。未完了 item の DoD 設定率を
  // chip 表示。total=0 で chip 非表示。due-date-coverage chip と並列の「planning
  // hygiene 二軸」(期限 + DoD = 計画化 + 受入条件)。
  // iter363 basics: priority 別 breakdown (iter362) を aria-label / title に同梱
  // → SR / hover で「P1 100% / P3 50%」が読める (visible chip は全体集計のまま、
  // richer info は a11y / hover 経路でのみ提供、iter346 hit-rate-tooltip と同手法)。
  const dodCoverage = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeDodCoverage(itemsQ.data)
    if (stats.total === 0 || stats.coverageRate === null) return null
    const summary = formatDodCoverageJa(stats)
    const tone = dodCoverageTone(stats)
    const pct = rateToPct(stats.coverageRate)
    const byPriority = computeDodCoverageByPriority(itemsQ.data)
    // 複数 priority に未完了が分散している時のみ priority breakdown を tooltip に。
    const detail =
      countNonEmptyPriorityBuckets(byPriority) > 1
        ? `${summary} — ${formatDodCoverageByPriorityJa(byPriority)}`
        : summary
    return { stats, summary, tone, pct, detail }
  }, [itemsQ.data])

  // iter356 basics: wip-by-priority (iter354) を bind。in_progress item の priority
  // 分布で「高優先が止まっているか」を chip 表示。total=0 で chip 非表示。bias kind
  // 別 tone (low-priority-only=amber 警戒 / has-high-priority=emerald 健全)。
  const wipBias = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeWipByPriority(itemsQ.data)
    if (stats.total === 0) return null
    const bias = wipBiasKind(stats)
    if (bias === 'idle') return null
    const summary = formatWipByPriorityJa(stats)
    return { stats, summary, bias }
  }, [itemsQ.data])

  // iter358 basics: must-hygiene (iter357) を bind。MUST item の dueDate 設定状況
  // を chip 表示。total=0 / severity='idle' で chip 非表示。severity 4 値で配色:
  // severe (= 半数以上 期限なし) = red、mild = amber、clean = emerald (= 全て期限付)、
  // idle = hidden (MUST 自体無し)。must-risk (期限近接) と相補。
  const mustHygiene = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeMustHygiene(itemsQ.data)
    const sev = mustHygieneSeverity(stats)
    if (sev === 'idle') return null
    const summary = formatMustHygieneJa(stats)
    return { stats, summary, severity: sev }
  }, [itemsQ.data])

  // iter361 basics: wip-stuck (iter359) を bind。in_progress 中で updatedAt が
  // 3 日以上動いていない「停滞 WIP」を chip 表示。entries=0 / severity='idle' で
  // chip 非表示で UI 静か。severity 3 値で配色 (severe = 7 日以上 stuck 含む = red、
  // mild = 3-6 日 stuck = amber)。stale-items より短い閾値で WIP に絞った早期警告。
  const wipStuck = useMemo(() => {
    if (!itemsQ.data) return null
    const entries = selectStuckWipItems(itemsQ.data)
    const sev = stuckWipSeverity(entries)
    if (sev === 'idle') return null
    const summary = formatStuckWipSummaryJa(entries, 3)
    // iter363 basics: priority 別 breakdown を tooltip に同梱 (iter363/366/373/378/383
    // /388/391/401 と同手法)。複数 P 分散時のみ append、単一 P 偏在は冗長省略。
    const byPriority = computeStuckWipByPriority(itemsQ.data)
    const priorityBuckets = countNonEmptyPriorityBucketsBy(byPriority, (s) => s.count > 0)
    const detail =
      priorityBuckets > 1 ? `${summary} — ${formatStuckWipByPriorityJa(byPriority)}` : summary
    return { entries, summary, severity: sev, detail }
  }, [itemsQ.data])

  // iter368 basics: overdue-active (iter367) を bind。期限超過で未完了の item を
  // status 別 chip 表示。total=0 / severity='idle' で chip 非表示で UI 静か。
  // severity 3 値: severe (= 7 日以上 overdue or 5+ 件) = red、mild = amber、
  // idle = hidden。slip-days (完了済) と相補で「これから完了させる必要がある」観点。
  const overdueActive = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeOverdueActive(itemsQ.data)
    const sev = overdueActiveSeverity(stats)
    if (sev === 'idle') return null
    const summary = formatOverdueActiveJa(stats)
    // iter371 basics: priority breakdown を tooltip / aria-label に同梱
    // (iter363/366/373/378/383/388/391/401/363 と同手法、priority bias を SR/hover で読める)
    const byPriority = computeOverdueActiveByPriority(itemsQ.data)
    const priorityBuckets = countNonEmptyPriorityBucketsBy(byPriority, (s) => s.count > 0)
    const priorityDetail =
      priorityBuckets > 1 ? ` — ${formatOverdueActiveByPriorityJa(byPriority)}` : ''
    // iter383 basics: iter382 の pickOverdueActiveItems / formatOverdueActiveTitlesJa を
    // SR / hover 経路に bind (iter381 must-overdue chip と同手法)。視覚 chip text は
    // stats summary のまま、aria-label / title だけ richer (具体名付き) に。
    const entries = pickOverdueActiveItems(itemsQ.data)
    const titlesDetail = entries.length > 0 ? ` — ${formatOverdueActiveTitlesJa(entries, 3)}` : ''
    const detail = `${summary}${priorityDetail}${titlesDetail}`
    return { stats, summary, severity: sev, detail, priorityBuckets }
  }, [itemsQ.data])

  // iter373 basics: must-overdue (iter372) を bind。MUST かつ期限超過の最深刻 item を
  // chip 表示。1 件以上で 'critical' (red 単色)、0 件で chip 非表示で UI 静か。
  // MUST 絶対落とさない原則 (CLAUDE.md) を「期限を超えて未完了の MUST」として最も
  // 強く警告する dashboard 専用 chip (must-stuck-wip = 進行中停滞 と相補)。
  const mustOverdue = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeMustOverdue(itemsQ.data)
    const sev = mustOverdueSeverity(stats)
    if (sev === 'idle') return null
    const summary = formatMustOverdueJa(stats)
    // iter381 / iter386 basics: 3 層情報設計 (iter383 overdue-active chip と同手法)。
    // visible chip text は stats summary のまま、aria-label / title だけ richer
    // (priority breakdown + titles) に。priorityBuckets > 1 の時のみ P-breakdown を append、
    // entries.length > 0 の時のみ titles を append (= 0 件 fallback で過剰冗長を回避)。
    const byPriority = computeMustOverdueByPriority(itemsQ.data)
    const priorityBuckets = countNonEmptyPriorityBucketsBy(byPriority, (s) => s.count > 0)
    const priorityDetail =
      priorityBuckets > 1 ? ` — ${formatMustOverdueByPriorityJa(byPriority)}` : ''
    const entries = pickMustOverdueItems(itemsQ.data)
    const titlesDetail = entries.length > 0 ? ` — ${formatMustOverdueTitlesJa(entries, 3)}` : ''
    const detail = `${summary}${priorityDetail}${titlesDetail}`
    return { stats, summary, detail, severity: sev, priorityBuckets }
  }, [itemsQ.data])

  // iter366 basics: must-stuck-wip (iter364) を bind。MUST かつ stuck WIP な
  // 最深刻 item を chip 表示。1 件以上で 'critical' (red 単色) 表示、0 件で chip
  // 非表示で UI 静か。MUST 絶対落とさない原則 (CLAUDE.md) を「進行中で停滞して
  // いる MUST」として最も強く警告する dashboard 専用 chip。
  // iter403 basics: must-stale (iter402) を bind。MUST かつ 7+ 日触られていない sleeper
  // 違反を chip 表示。1 件以上で 'critical' (red 単色) 表示、0 件で chip 非表示。
  // must-overdue (期限超過) / must-stuck-wip (進行中停滞) と相補で「忘れられた MUST」軸。
  const mustStale = useMemo(() => {
    if (!itemsQ.data) return null
    const entries = pickMustStaleItems(itemsQ.data)
    const sev = mustStaleSeverity(entries)
    if (sev === 'idle') return null
    const summary = formatMustStaleJa(entries, 3)
    return { entries, summary, severity: sev }
  }, [itemsQ.data])

  const mustStuckWip = useMemo(() => {
    if (!itemsQ.data) return null
    const entries = pickMustStuckWipItems(itemsQ.data)
    const sev = mustStuckWipSeverity(entries)
    if (sev === 'idle') return null
    const summary = formatMustStuckWipJa(entries, 3)
    // iter391 basics: iter389 で追加した computeMustStuckWipByPriority を SR / hover に bind
    // (iter386 must-overdue chip と同手法、3 層情報設計の must-stuck-wip 版)。
    // priorityBuckets > 1 の時のみ append、単一 P 偏在は冗長省略。
    const byPriority = computeMustStuckWipByPriority(itemsQ.data)
    const priorityBuckets = countNonEmptyPriorityBucketsBy(byPriority, (s) => s.count > 0)
    const detail =
      priorityBuckets > 1 ? `${summary} — ${formatMustStuckWipByPriorityJa(byPriority)}` : summary
    return { entries, summary, detail, severity: sev, priorityBuckets }
  }, [itemsQ.data])

  // iter361 basics: recent-completed (iter359) を bind。直近 24h 完了 item の
  // title list を chip 表示。slip-days / must-hygiene の警告 chip と対比して
  // positive UX (= 「今日の達成: 3 件」を見える化、頑張ったことを褒める)。
  // count=0 で chip 非表示で UI 静か。tone は emerald (= 達成 = good)、glyph 🎉。
  const recentDone = useMemo(() => {
    if (!itemsQ.data) return null
    const entries = selectRecentCompleted(itemsQ.data, { windowHours: 24, limit: 3 })
    if (entries.length === 0) return null
    // 全件カウントは limit 無しで再計算 (= "他 N 件" を出すため)
    const total = selectRecentCompleted(itemsQ.data, { windowHours: 24 }).length
    const summary = formatRecentCompletedSummaryJa(entries, total, 3)
    return { entries, total, summary }
  }, [itemsQ.data])

  // iter368 basics: description-coverage (iter367) を bind。未完了 item の説明文
  // 設定率を chip 表示。total=0 で chip 非表示。期限 / DoD 同等の planning hygiene
  // 3 兄弟の 3 つ目。priority breakdown を tooltip に同梱 (iter346/363/366 と同手法)。
  const descCoverage = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeDescriptionCoverage(itemsQ.data)
    if (stats.total === 0 || stats.coverageRate === null) return null
    const summary = formatDescriptionCoverageJa(stats)
    const tone = descriptionCoverageTone(stats)
    const pct = rateToPct(stats.coverageRate)
    const byPriority = computeDescriptionCoverageByPriority(itemsQ.data)
    const detail =
      countNonEmptyPriorityBuckets(byPriority) > 1
        ? `${summary} — ${formatDescriptionCoverageByPriorityJa(byPriority)}`
        : summary
    return { stats, summary, tone, pct, detail }
  }, [itemsQ.data])

  // iter371 basics: combined-hygiene (iter369) を bind。3 hygiene 軸 (期限 / DoD /
  // 説明文) を 1 つの 0..100 score に統合した「Planning Hygiene 70」chip を表示。
  // 個別 chip 3 種と並列で「全体としての健全度」を一望可能に。score=null (= 集計対象
  // 軸 0 = 全 hygiene chip 非表示状態) で chip 非表示。
  const hygieneScore = useMemo(() => {
    if (!itemsQ.data) return null
    if (!dueCoverage && !dodCoverage && !descCoverage) return null
    // 3 chip useMemo の `stats` を再利用 (= 二重計算しない、依存も既に dueCoverage /
    // dodCoverage / descCoverage の useMemo に集約済)。null chip は EMPTY stats を渡す。
    const score = combineHygieneScore({
      dueDate: dueCoverage?.stats ?? {
        total: 0,
        withDueDate: 0,
        withoutDueDate: 0,
        coverageRate: null,
      },
      dod: dodCoverage?.stats ?? {
        total: 0,
        withDod: 0,
        withoutDod: 0,
        coverageRate: null,
      },
      description: descCoverage?.stats ?? {
        total: 0,
        withDescription: 0,
        withoutDescription: 0,
        coverageRate: null,
      },
    })
    if (score.score === null) return null
    const summary = formatCombinedHygieneJa(score)
    // iter373 basics: priority 別 breakdown (iter372) を aria-label / title に同梱
    // → SR / hover で「P1 100 / P3 30」が読める (visible chip は全体 score のまま、
    // richer info は a11y / hover 経路でのみ提供、iter346/363/366 と同手法)。
    // 複数 priority に未完了が分散している時のみ priority breakdown を tooltip に。
    const byPriority = computeCombinedHygieneByPriority(itemsQ.data)
    const eligibleBuckets = countNonEmptyPriorityBucketsBy(byPriority, (s) => s.score !== null)
    const detail =
      eligibleBuckets > 1
        ? `${summary} — ${formatCombinedHygieneByPriorityJa(byPriority)}`
        : summary
    return {
      score,
      summary,
      detail,
      tone: combinedHygieneTone(score),
    }
  }, [itemsQ.data, dueCoverage, dodCoverage, descCoverage])

  // iter376 basics: hygiene-focus (iter374) を bind。priority 別 hygiene score の
  // 最弱バケットが warn tier (< 30) のときのみ「重点」 CTA chip を表示し、
  // attention を集中させる。良好 / 中立は既存の hygiene-score chip と冗長なので
  // 非表示 (= 「行動が必要なときだけ chip が出る」 progressive disclosure UX)。
  const hygieneFocus = useMemo(() => {
    if (!itemsQ.data) return null
    const byPriority = computeCombinedHygieneByPriority(itemsQ.data)
    const focus = pickWeakestHygienePriority(byPriority)
    if (focus === null || focus.tone !== 'warn') return null
    const summary = formatHygieneFocusJa(focus)
    // iter378 basics: 焦点 priority 内の最弱軸 (期限/DoD/説明文 = iter377) を tooltip
    // に同梱して 2D drill-down。「P3 が一番弱い → さらにその中で 説明文 が弱い」
    // を 1 経路で読める (iter363/366/373 と同手法、visible chip text は不変)。
    const weakestAxis = pickWeakestHygieneAxis(byPriority[focus.priority])
    const detail = weakestAxis ? `${summary} / ${formatHygieneAxisFocusJa(weakestAxis)}` : summary
    return { focus, summary, detail, weakestAxis }
  }, [itemsQ.data])

  // iter381 basics: hygiene-debt (iter379) を bind。期限/DoD/説明文 を 1 つも持たない
  // 「title だけの brain-dump」 item を triage 候補として chip 表示。debtCount=0 で
  // chip 非表示 (= triage 不要状態は UI 静か)。tone 別 3 段階配色:
  //   warn (>= 30%) — 多数 triage 待ち、目立たせる
  //   neutral (10..30%) — 少数あり、黄色軽警告
  //   good (< 10%) — ほぼ無し、緑健全
  const hygieneDebt = useMemo(() => {
    if (!itemsQ.data) return null
    const stats = computeHygieneDebt(itemsQ.data)
    if (stats.debtCount === 0) return null
    const summary = formatHygieneDebtJa(stats)
    // iter383 basics: priority 別 breakdown (iter382) を aria-label / title に同梱
    // → SR / hover で「P1 67% / P3 50%」が読める (visible chip text 不変、richer
    // info は a11y/hover 経路でのみ提供、iter363/366/373/378 と同手法)。複数
    // priority に debt が分散している時のみ priority breakdown を tooltip に。
    const byPriority = computeHygieneDebtByPriority(itemsQ.data)
    const debtBuckets = countNonEmptyPriorityBucketsBy(byPriority, (s) => s.debtCount > 0)
    const priorityDetail = debtBuckets > 1 ? formatHygieneDebtByPriorityJa(byPriority) : null
    // iter386 basics: aged-hygiene-debt (iter384) を bind。priority 別と並列で
    // 「年齢別の停滞 debt」を tooltip に同梱、stagnantDebtCount > 0 (= ancient/stale
    // 軸に debt あり) 時のみ「停滞 Debt: 3 件 (古参 2 / 停滞 1) — 最古 45 日」を
    // 同梱 (priority 軸 / 年齢軸 で 2D drill-down、iter378 と同手法)。
    const aged = computeAgedHygieneDebt(itemsQ.data)
    const ageDetail = aged.stagnantDebtCount > 0 ? formatAgedHygieneDebtJa(aged) : null
    const extras = [priorityDetail, ageDetail].filter((x): x is string => x !== null)
    const detail = extras.length > 0 ? `${summary} — ${extras.join(' — ')}` : summary
    return { stats, summary, detail, tone: hygieneDebtTone(stats), aged }
  }, [itemsQ.data])

  // iter338 basics: backlog-aging (iter337) を bind。Active (= 未完了 + 未 archive)
  // item を createdAt 年齢バケット別に件数集計、停滞気味 (7 日以上) を tone で警戒。
  const aging = useMemo(() => {
    if (!itemsQ.data) return null
    const active = itemsQ.data.filter((it) => !it.doneAt && !it.archivedAt)
    if (active.length === 0) return null
    const counts = countItemsByAge(active)
    const summary = formatAgingCounts(counts)
    if (summary === '0 件') return null
    const olderThanWeek = countAgingItemsOlderThanWeek(counts)
    // iter391 basics: priority 別 breakdown (iter389) を aria-label に同梱
    // → SR / hover で「停滞: P1 2 件 / P3 1 件」が読める。olderThanWeek > 0 で
    // priority breakdown が複数 P 分散している時のみ tooltip に (iter363/366/373/
    // 378/383/388 と同手法、visible chip text 不変)。
    const byPriority = countItemsByAgeByPriority(active)
    const stagnantBreakdown = olderThanWeek > 0 ? formatAgingByPriorityJa(byPriority) : null
    return { counts, summary, olderThanWeek, stagnantBreakdown }
  }, [itemsQ.data])

  // iter393 basics: urgency-tier counts (iter294 / iter392) を bind。priority +
  // dueDate + MUST 由来の合成 score で 5 tier 分類した active item の actionable
  // subset (critical + high) を chip 表示。idle (= critical=0 かつ high=0) で chip
  // 非表示で UI 静か (= 「actionable item 0 = 静か」progressive disclosure)。
  // visible chip text は「要対応: 緊急 X / 高 Y」、aria-label / title に full counts
  // (medium / low / none 含む) を同梱して 2 層情報設計 (iter363/366/373/378/383/388/391
  // 系の richer-info-via-a11y/hover 同手法)。
  // iter396 basics: aria-label / title に iter394 整備済 `formatTopUrgentTitlesJa`
  // で top 3 urgent items の title + tier ラベル付き 1 行 summary も同梱、SR / hover
  // で「上位 urgent: 提出 (緊急) / 急ぎ (高)」が読めるようにして 3 層情報設計に拡張
  // (visible は count、a11y/hover は count + 全体内訳 + top items の 3 段)。
  const urgencyTiers = useMemo(() => {
    if (!itemsQ.data) return null
    const counts = countItemsByUrgencyTier(itemsQ.data)
    const severity = urgencyTierCountsSeverity(counts)
    if (severity === 'idle') return null
    const actionable: string[] = []
    if (counts.critical > 0) actionable.push(`緊急 ${counts.critical}`)
    if (counts.high > 0) actionable.push(`高 ${counts.high}`)
    const visible = `要対応: ${actionable.join(' / ')}`
    const topTitles = formatTopUrgentTitlesJa(itemsQ.data, 3)
    const detail = `${visible} — 全体: ${formatUrgencyTierCounts(counts)} — ${topTitles}`
    return { counts, severity, visible, detail }
  }, [itemsQ.data])

  // iter398 basics: stale-urgent (iter397 = urgency × aging combinator) を bind。
  // critical / high かつ 7 日以上経過の item を「対応 + 古参」 triage 候補として
  // chip 表示。urgent はあって当然 + stale も backlog 全体には散見、両方該当する
  // 「対応すべき + 既に放置」が深刻アラーム signal なので警戒色 (red) で目立たせる。
  // 0 件で chip 非表示で UI 静か (= triage 不要状態は無音)。aria-label / title に
  // top 3 stale-urgent item の title を `formatTopUrgentTitlesJa` で同梱、
  // urgency-tiers chip と同じ vocabulary を再利用 (iter394/iter396 と整合)。
  // iter401 basics: priority 別 breakdown (iter399 = computeStaleUrgentByPriority)
  // を aria-label / title に同梱 → SR / hover で「P1 2 件 (最古 14日) / P2 1 件
  // (最古 8日)」が読める。stale-urgent が複数 priority に分散している時のみ
  // append (単一 P 偏在は全体 summary と同情報なので冗長)。iter363/366/373/378/
  // 383/388/391 系の richer-info-via-a11y/hover 同手法。
  const staleUrgent = useMemo(() => {
    if (!itemsQ.data) return null
    const stale = pickStaleUrgentItems(itemsQ.data)
    if (stale.length === 0) return null
    const summary = formatStaleUrgentJa(itemsQ.data)
    const topTitles = formatTopUrgentTitlesJa(stale, 3)
    const byPriority = computeStaleUrgentByPriority(itemsQ.data)
    const priorityBuckets = countNonEmptyPriorityBucketsBy(byPriority, (s) => s.count > 0)
    const priorityDetail = priorityBuckets > 1 ? formatStaleUrgentByPriorityJa(byPriority) : null
    const extras = [topTitles, priorityDetail].filter((x): x is string => x !== null)
    const detail = extras.length > 0 ? `${summary} — ${extras.join(' — ')}` : summary
    return { stale, summary, detail }
  }, [itemsQ.data])

  if (summary.isLoading) return <Loading message="ダッシュボード読込中..." />
  if (summary.error) {
    return (
      <ErrorState
        message={isAppError(summary.error) ? summary.error.message : '取得に失敗しました'}
        onRetry={() => void summary.refetch()}
      />
    )
  }
  if (!summary.data) return null

  const s = summary.data

  return (
    <div className="space-y-6" data-testid="dashboard-view">
      {/* サマリ stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="MUST 件数" value={s.items.length} tone="default" />
        <StatCard
          label="進行中 / WIP 上限"
          value={`${s.wipInProgress}/${s.wipLimit}`}
          tone={s.wipExceeded ? 'danger' : 'default'}
        />
        <StatCard
          label="期限超過"
          value={s.overdueCount}
          tone={s.overdueCount > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="7日以内"
          value={s.dueSoonCount}
          tone={s.dueSoonCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* iter331 / iter336 basics: trend / hygiene chips (flex-wrap で同列)
       * iter355 refactor: 8 chip の JSX 重複を <DashboardChip> に集約 */}
      <div className="flex flex-wrap items-center gap-2">
        {urgencyTiers ? (
          <DashboardChip
            testId="dashboard-urgency-tiers-chip"
            toneClass={
              urgencyTiers.severity === 'severe'
                ? 'border-red-200 bg-red-50 text-red-700'
                : chipTone3Class('warn')
            }
            glyph="🚨"
            ariaLabel={urgencyTiers.detail}
            title={urgencyTiers.detail}
            text={urgencyTiers.visible}
            dataAttrs={{
              'data-critical-count': urgencyTiers.counts.critical,
              'data-high-count': urgencyTiers.counts.high,
              'data-severity': urgencyTiers.severity,
            }}
          />
        ) : null}
        {staleUrgent ? (
          <DashboardChip
            testId="dashboard-stale-urgent-chip"
            toneClass="border-red-200 bg-red-50 text-red-700"
            glyph="⏳"
            ariaLabel={staleUrgent.detail}
            title={staleUrgent.detail}
            text={staleUrgent.summary}
            truncateText
            dataAttrs={{ 'data-stale-urgent-count': staleUrgent.stale.length }}
          />
        ) : null}
        {recentDone ? (
          <DashboardChip
            testId="dashboard-recent-done-chip"
            toneClass={chipTone3Class('good')}
            glyph="🎉"
            ariaLabel={recentDone.summary}
            title={recentDone.summary}
            text={recentDone.summary}
            truncateText
            dataAttrs={{ 'data-recent-done-count': recentDone.total }}
          />
        ) : null}
        {velocity ? (
          <DashboardChip
            testId="dashboard-velocity-chip"
            toneClass={trendToneClass(velocity.result.trend, 'positive')}
            glyph={trendGlyph(velocity.result.trend)}
            ariaLabel={velocity.line}
            title={velocity.line}
            text={velocity.line}
            dataAttrs={{ 'data-trend': velocity.result.trend }}
          />
        ) : null}
        {momentum ? (
          <DashboardChip
            testId="dashboard-momentum-chip"
            toneClass={trendToneClass(momentum.trend, 'negative')}
            glyph={trendGlyph(momentum.trend)}
            ariaLabel={momentum.line}
            title={momentum.line}
            text={momentum.line}
            dataAttrs={{ 'data-direction': momentum.result.direction }}
          />
        ) : null}
        {hygieneScore ? (
          <DashboardChip
            testId="dashboard-hygiene-score-chip"
            toneClass={chipTone3Class(hygieneScore.tone)}
            glyph="🧭"
            ariaLabel={hygieneScore.detail}
            title={hygieneScore.detail}
            text={`Hygiene ${hygieneScore.score.score}`}
            dataAttrs={{
              'data-hygiene-score': hygieneScore.score.score ?? 0,
              'data-eligible-axes': hygieneScore.score.eligibleAxes,
            }}
          />
        ) : null}
        {hygieneFocus ? (
          <DashboardChip
            testId="dashboard-hygiene-focus-chip"
            toneClass={chipTone3Class('warn')}
            glyph="⚠"
            ariaLabel={hygieneFocus.detail}
            title={hygieneFocus.detail}
            text={`重点: P${hygieneFocus.focus.priority} Hygiene ${hygieneFocus.focus.score}`}
            dataAttrs={{
              'data-focus-priority': hygieneFocus.focus.priority,
              'data-focus-score': hygieneFocus.focus.score,
              'data-focus-axis': hygieneFocus.weakestAxis?.axis ?? '',
            }}
          />
        ) : null}
        {hygieneDebt ? (
          <DashboardChip
            testId="dashboard-hygiene-debt-chip"
            toneClass={chipTone3Class(hygieneDebt.tone)}
            glyph="📋"
            ariaLabel={hygieneDebt.detail}
            title={hygieneDebt.detail}
            text={`Triage 候補: ${hygieneDebt.stats.debtCount}`}
            dataAttrs={{
              'data-debt-count': hygieneDebt.stats.debtCount,
              'data-debt-total': hygieneDebt.stats.total,
              'data-stagnant-debt-count': hygieneDebt.aged.stagnantDebtCount,
              'data-oldest-age-days': hygieneDebt.aged.oldestAgeDays ?? '',
            }}
          />
        ) : null}
        {dueCoverage ? (
          <DashboardChip
            testId="dashboard-due-coverage-chip"
            toneClass={chipTone3Class(dueCoverage.tone)}
            glyph="📅"
            ariaLabel={dueCoverage.detail}
            title={dueCoverage.detail}
            text={dueCoverage.summary}
            dataAttrs={{ 'data-coverage-pct': dueCoverage.pct }}
          />
        ) : null}
        {dodCoverage ? (
          <DashboardChip
            testId="dashboard-dod-coverage-chip"
            toneClass={chipTone3Class(dodCoverage.tone)}
            glyph="✓"
            ariaLabel={dodCoverage.detail}
            title={dodCoverage.detail}
            text={dodCoverage.summary}
            dataAttrs={{ 'data-coverage-pct': dodCoverage.pct }}
          />
        ) : null}
        {descCoverage ? (
          <DashboardChip
            testId="dashboard-desc-coverage-chip"
            toneClass={chipTone3Class(descCoverage.tone)}
            glyph="📝"
            ariaLabel={descCoverage.detail}
            title={descCoverage.detail}
            text={descCoverage.summary}
            dataAttrs={{ 'data-coverage-pct': descCoverage.pct }}
          />
        ) : null}
        {mustHygiene ? (
          <DashboardChip
            testId="dashboard-must-hygiene-chip"
            toneClass={
              mustHygiene.severity === 'severe'
                ? 'border-red-200 bg-red-50 text-red-700'
                : mustHygiene.severity === 'mild'
                  ? chipTone3Class('warn')
                  : chipTone3Class('good')
            }
            glyph="🔥"
            ariaLabel={mustHygiene.summary}
            title={mustHygiene.summary}
            text={mustHygiene.summary}
            dataAttrs={{
              'data-severity': mustHygiene.severity,
              'data-without-due': mustHygiene.stats.withoutDueDate,
            }}
          />
        ) : null}
        {wipBias ? (
          <DashboardChip
            testId="dashboard-wip-bias-chip"
            toneClass={
              wipBias.bias === 'low-priority-only' ? chipTone3Class('warn') : chipTone3Class('good')
            }
            glyph="▶"
            ariaLabel={
              wipBias.bias === 'low-priority-only'
                ? `${wipBias.summary} — 高優先 0、低優先タスクのみ進行中 (bias 検出)`
                : wipBias.summary
            }
            title={wipBias.summary}
            text={wipBias.summary}
            dataAttrs={{ 'data-bias': wipBias.bias, 'data-wip-total': wipBias.stats.total }}
          />
        ) : null}
        {wipStuck ? (
          <DashboardChip
            testId="dashboard-wip-stuck-chip"
            toneClass={
              wipStuck.severity === 'severe'
                ? 'border-red-200 bg-red-50 text-red-700'
                : chipTone3Class('warn')
            }
            glyph="⏸"
            ariaLabel={wipStuck.detail}
            title={wipStuck.detail}
            text={wipStuck.summary}
            dataAttrs={{
              'data-severity': wipStuck.severity,
              'data-stuck-count': wipStuck.entries.length,
            }}
          />
        ) : null}
        {mustStuckWip ? (
          <DashboardChip
            testId="dashboard-must-stuck-wip-chip"
            toneClass="border-red-300 bg-red-100 text-red-800"
            glyph="🚨"
            ariaLabel={mustStuckWip.detail}
            title={mustStuckWip.detail}
            text={mustStuckWip.summary}
            attention
            dataAttrs={{
              'data-severity': mustStuckWip.severity,
              'data-must-stuck-count': mustStuckWip.entries.length,
              'data-priority-buckets': mustStuckWip.priorityBuckets,
            }}
          />
        ) : null}
        {mustOverdue ? (
          <DashboardChip
            testId="dashboard-must-overdue-chip"
            toneClass="border-red-400 bg-red-100 text-red-900"
            glyph="🆘"
            ariaLabel={mustOverdue.detail}
            title={mustOverdue.detail}
            text={mustOverdue.summary}
            attention
            dataAttrs={{
              'data-severity': mustOverdue.severity,
              'data-must-overdue-count': mustOverdue.stats.total,
              'data-oldest-days': mustOverdue.stats.oldestOverdueDays ?? 0,
              'data-priority-buckets': mustOverdue.priorityBuckets,
            }}
          />
        ) : null}
        {mustStale ? (
          <DashboardChip
            testId="dashboard-must-stale-chip"
            toneClass="border-red-300 bg-red-50 text-red-800"
            glyph="⏳"
            ariaLabel={mustStale.summary}
            title={mustStale.summary}
            text={mustStale.summary}
            attention
            dataAttrs={{
              'data-severity': mustStale.severity,
              'data-must-stale-count': mustStale.entries.length,
            }}
          />
        ) : null}
        {aging ? (
          <DashboardChip
            testId="dashboard-backlog-aging-chip"
            toneClass={
              aging.olderThanWeek > 0 ? trendToneClass('up', 'negative') : chipTone3Class('neutral')
            }
            glyph="⌛"
            ariaLabel={`Backlog 年齢: ${aging.summary}${aging.olderThanWeek > 0 ? ` — 7 日以上 ${aging.olderThanWeek} 件 (棚卸し対象)` : ''}${aging.stagnantBreakdown && aging.stagnantBreakdown !== '停滞 0 件' ? ` — ${aging.stagnantBreakdown}` : ''}`}
            title={aging.summary}
            text={
              <>
                Backlog: {aging.summary}
                {aging.olderThanWeek > 0 ? ` — 7日+ ${aging.olderThanWeek}件` : ''}
              </>
            }
            truncateText
            dataAttrs={{ 'data-older-than-week': aging.olderThanWeek }}
          />
        ) : null}
        {dueHitRate ? (
          <DashboardChip
            testId="dashboard-due-hit-rate-chip"
            toneClass={chipTone3Class(dueHitRate.tone)}
            glyph="◎"
            ariaLabel={dueHitRate.detail}
            title={dueHitRate.detail}
            text={dueHitRate.summary}
            dataAttrs={{ 'data-hit-rate': dueHitRate.pct }}
          />
        ) : null}
        {slipDays ? (
          <DashboardChip
            testId="dashboard-slip-days-chip"
            toneClass={
              slipDays.severe
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }
            glyph="⏰"
            ariaLabel={slipDays.detail}
            title={slipDays.detail}
            text={slipDays.summary}
            dataAttrs={{
              'data-severe': slipDays.severe ? 'true' : 'false',
              'data-max-days': slipDays.stats.maxDays ?? 0,
            }}
          />
        ) : null}
        {overdueActive ? (
          <DashboardChip
            testId="dashboard-overdue-active-chip"
            toneClass={
              overdueActive.severity === 'severe'
                ? 'border-red-200 bg-red-50 text-red-700'
                : chipTone3Class('warn')
            }
            glyph="📅"
            ariaLabel={overdueActive.detail}
            title={overdueActive.detail}
            text={overdueActive.summary}
            dataAttrs={{
              'data-severity': overdueActive.severity,
              'data-overdue-total': overdueActive.stats.total,
              'data-oldest-days': overdueActive.stats.oldestOverdueDays ?? 0,
              'data-priority-buckets': overdueActive.priorityBuckets,
            }}
          />
        ) : null}
        {completionGap ? (
          <DashboardChip
            testId="dashboard-completion-gap-chip"
            toneClass={chipTone3Class('neutral')}
            glyph="⏱"
            ariaLabel={
              completionGap.gap
                ? `${completionGap.summary} — gap ${completionGap.gap.gapDays}日 (P${completionGap.gap.lowKey} が P${completionGap.gap.highKey} より遅い)`
                : completionGap.summary
            }
            title={completionGap.summary}
            text={
              completionGap.gap
                ? `完了所要 P${completionGap.gap.highKey} ${completionGap.gap.highDays}日 / P${completionGap.gap.lowKey} ${completionGap.gap.lowDays}日 (gap ${completionGap.gap.gapDays}日)`
                : completionGap.summary
            }
            truncateText
            dataAttrs={{ 'data-gap-days': completionGap.gap?.gapDays ?? '' }}
          />
        ) : null}
      </div>

      {/* WIP 警告 */}
      {s.wipExceeded ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
          data-testid="wip-warning"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-semibold">WIP 上限超過</div>
            <div className="text-xs">
              進行中の MUST が {s.wipInProgress} 件 (上限 {s.wipLimit}{' '}
              件)。新規着手前に完了を優先してください。
            </div>
          </div>
        </div>
      ) : null}

      {/* Burndown */}
      <Card role="region" aria-label="MUST Item の バーンダウン グラフ (直近 14 日)">
        <CardHeader>
          <CardTitle className="text-base" role="heading" aria-level={2}>
            バーンダウン (14 日)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {burndown.isLoading ? (
            <Loading message="グラフ読込中..." />
          ) : burndown.error ? (
            <ErrorState
              message={isAppError(burndown.error) ? burndown.error.message : '取得失敗'}
              onRetry={() => void burndown.refetch()}
            />
          ) : (
            // ResponsiveContainer は親が幅 0 / display:none だと
            //   "The width(-1) and height(-1) of chart should be greater than 0"
            // を出す。Phase 6.15 iter 72: height は固定数値 (256px) で渡し、
            // ResponsiveContainer 自身の minHeight=0 / minWidth=0 はやめて
            // width だけ親の 100% に追従させる ("100%"+0 minHeight が逆に
            // 0-px の race を許してしまっていたため)。
            <div className="w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={burndownData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="open"
                    name="未完了"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="closed"
                    name="完了"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/*
       * Phase 6.15 iter104: 「AI 月次コスト上限 + 当月利用状況」と
       * 「AI コスト (直近 3 ヶ月)」テーブルを削除。
       * Claude Max OAuth (claude CLI) 前提なので API 課金は発生せず、コスト集計の意味がない。
       * 残された Researcher / PM 実行履歴の表示は POST_MVP の "監査ログ UI" にまとめる。
       */}

      {/* MUST 一覧 */}
      <Card role="region" aria-label={`MUST Item 一覧 ${s.items.length} 件`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base" role="heading" aria-level={2}>
            <Flame className="h-4 w-4 text-red-500" aria-hidden="true" />
            MUST Item 一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {s.items.length === 0 ? (
            <EmptyState
              title="MUST Item がありません"
              description="絶対に落とせないタスクに MUST を立ててください"
            />
          ) : (
            <ul className="divide-y text-sm">
              {s.items.map((item) => {
                const overdue = item.dueDate && item.dueDate < todayStr && !item.doneAt
                const soon =
                  !overdue &&
                  item.dueDate &&
                  item.dueDate >= todayStr &&
                  item.dueDate <= soonStr &&
                  !item.doneAt
                return (
                  <li
                    key={item.id}
                    onClick={() => void setOpenItemId(item.id)}
                    className="hover:bg-muted/50 grid cursor-pointer grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded py-2"
                    data-testid="must-item-row"
                  >
                    <div className="flex min-w-0 flex-col">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void setOpenItemId(item.id)
                        }}
                        className="hover:text-primary truncate text-left font-medium hover:underline"
                        data-testid={`dashboard-must-title-${item.id}`}
                      >
                        {item.title}
                      </button>
                      {item.dod ? (
                        <span className="text-muted-foreground truncate text-xs">
                          DoD: {item.dod}
                        </span>
                      ) : null}
                    </div>
                    <StatusBadge status={item.status} />
                    <span
                      className={
                        overdue
                          ? 'text-xs font-semibold text-red-600'
                          : soon
                            ? 'text-xs font-semibold text-amber-600'
                            : 'text-muted-foreground text-xs'
                      }
                    >
                      {item.dueDate ?? '期限なし'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {item.doneAt ? '完了' : overdue ? '期限超過' : soon ? '期日近' : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: 'default' | 'warning' | 'danger'
}) {
  const toneCls =
    tone === 'danger'
      ? 'border-red-500/50 bg-red-500/5'
      : tone === 'warning'
        ? 'border-amber-500/50 bg-amber-500/5'
        : ''
  // tone は視覚 (border 色) だけで示しており SR に伝わらないため、
  // aria-label に状態語を含める (Phase 6.15 iter 80)
  const toneText = tone === 'danger' ? '要対応' : tone === 'warning' ? '注意' : ''
  const ariaLabel = toneText ? `${label}: ${value} (${toneText})` : `${label}: ${value}`
  return (
    <div
      className={`rounded-lg border p-4 ${toneCls}`}
      role="group"
      aria-label={ariaLabel}
      data-testid={`stat-card-${tone}`}
    >
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
