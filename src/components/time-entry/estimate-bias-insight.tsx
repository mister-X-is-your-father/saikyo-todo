'use client'

/**
 * iter259 ai-automation: 過去 N 件の time_entry + item.description を結合して
 * 見積精度 (bias) を JA 1 行 summary + counts + calibration factor で表示する
 * 軽量 insight カード。TimeEntries panel に常駐させる。
 *
 * - データ取得は既存 `useTimeEntries` + `useItems` を流用 (新 server action 無し)。
 * - 集計は pure helper `selectBiasSamples` → `computeEstimateBias` の 2 段。
 * - sample 不足 (estimate 付き <3 件) は `unknown` 扱いで「見積データが少なく…」
 *   と表示 (ユーザに「見積行を書く」促し効果)。
 * - error 時は silent (時間記録 panel の主機能を妨げない)、loading 時は
 *   小さい placeholder を出してレイアウト跳ねを防ぐ。
 */
import { useMemo } from 'react'

import { formatLocalISO } from '@/lib/date/iso'

import { useItems } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'
import { biasTendencyLabelJa, computeEstimateBias } from '@/features/time-entry/bias'
import {
  computeBiasByCategory,
  formatTopSkewedCategoryJa,
} from '@/features/time-entry/bias-by-category'
import {
  formatCalibratedEstimateJa,
  suggestCalibratedEstimates,
} from '@/features/time-entry/bias-calibration'
import { buildItemDescriptionLookup, selectBiasSamples } from '@/features/time-entry/bias-selector'
import {
  computeBiasTrend,
  formatBiasTrendJa,
  splitSamplesByDate,
} from '@/features/time-entry/bias-trend'
import { useTimeEntries } from '@/features/time-entry/hooks'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// iter520 refactor: TENDENCY_LABEL は `biasTendencyLabelJa` (iter519 helper) に集約。
// TENDENCY_TONE は visual (mixed=violet 等) を保持するため component 内に残す
// (severity bridge 化は別 iter で UX shift を伴うため別 commit が望ましい)。
// iter1517: 4 tone chip は light 固定で dark mode で明色 box が浮く + text contrast 不適。
// iter1376/1493/1512/1513 副/1515/1516 で確立済の dark chip token pattern
// (dark:bg-{color}-950/30 + dark:text-{color}-300 + dark:border-{color}-900/50) を
// 4 tone に展開、unknown は theme-aware で touch なし。
const TENDENCY_TONE: Record<ReturnType<typeof computeEstimateBias>['tendency'], string> = {
  'on-track':
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
  underestimating:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50',
  overestimating:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/50',
  mixed:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/50',
  unknown: 'bg-muted text-foreground border-border',
}

export function EstimateBiasInsight({ workspaceId }: { workspaceId: string }) {
  const entriesQ = useTimeEntries(workspaceId)
  const itemsQ = useItems(workspaceId)

  const report = useMemo(() => {
    if (!entriesQ.data || !itemsQ.data) return null
    const lookup = buildItemDescriptionLookup(itemsQ.data as Item[])
    const samples = selectBiasSamples(entriesQ.data, lookup)
    return computeEstimateBias(samples)
  }, [entriesQ.data, itemsQ.data])

  // iter269: category 別の top-skew (例: dev 1.40× 過小) を 1 行で表示。
  // 全体 calibration では塗りつぶされる「dev だけ過小、meeting は問題なし」みたいな
  // 偏りを見せる。1 件も歪み category がなければ null で行ごと非表示。
  const topSkewLine = useMemo(() => {
    if (!entriesQ.data || !itemsQ.data) return null
    const lookup = buildItemDescriptionLookup(itemsQ.data as Item[])
    const byCategory = computeBiasByCategory(entriesQ.data, lookup)
    return formatTopSkewedCategoryJa(byCategory)
  }, [entriesQ.data, itemsQ.data])

  // iter272: 14 日 split で「先期間 (15-28 日前) → 直近 (14 日以内)」の見積精度
  // 変化を判定。各期間 3 件以上で improving / worsening / stable / inconclusive を判定し、
  // inconclusive (= 学習中で判定不能) は出さない (UI 静か)。
  const trendLine = useMemo(() => {
    if (!entriesQ.data || !itemsQ.data) return null
    const lookup = buildItemDescriptionLookup(itemsQ.data as Item[])
    const splitDate = new Date()
    splitDate.setDate(splitDate.getDate() - 14)
    const splitISO = formatLocalISO(splitDate)
    const { recent, prior } = splitSamplesByDate(entriesQ.data, lookup, splitISO)
    const trend = computeBiasTrend(computeEstimateBias(recent), computeEstimateBias(prior))
    if (trend.direction === 'inconclusive') return null
    return formatBiasTrendJa(trend)
  }, [entriesQ.data, itemsQ.data])

  // どちらかが loading 中 → 小さい placeholder (主 panel を妨げない)
  if (entriesQ.isLoading || itemsQ.isLoading) {
    return (
      <Card
        aria-busy="true"
        data-testid="estimate-bias-insight-loading"
        role="region"
        aria-labelledby="estimate-bias-insight-loading-heading"
      >
        <CardHeader>
          <CardTitle
            id="estimate-bias-insight-loading-heading"
            className="text-base"
            role="heading"
            aria-level={2}
          >
            見積精度 (直近)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* iter1318: ASCII "..." → Unicode "…" で codebase ellipsis convention 統一 */}
          <p className="text-muted-foreground text-xs">集計中…</p>
        </CardContent>
      </Card>
    )
  }

  // error 時は silent (sub-feature なので主機能を妨げない)
  if (!report || entriesQ.error || itemsQ.error) return null

  const label = biasTendencyLabelJa(report.tendency)
  const tone = TENDENCY_TONE[report.tendency]

  return (
    <Card
      data-testid="estimate-bias-insight"
      role="region"
      aria-labelledby="estimate-bias-insight-heading"
    >
      <CardHeader>
        <CardTitle
          id="estimate-bias-insight-heading"
          className="flex items-center gap-2 text-base"
          role="heading"
          aria-level={2}
        >
          <span>見積精度 (直近)</span>
          {/* iter1076: role 無 span + aria-label を `role="img"` で
              authoritative 化 (iter1023/1049-1075 同 pattern、role=img sweep
              24 弾目)。estimate-bias 傾向 chip。 */}
          <span
            className={`rounded border px-2 py-0.5 text-[11px] ${tone}`}
            data-testid="estimate-bias-tendency"
            role="img"
            /* iter1562: 旧 aria-label `"傾向: ${label}"` は visible "${label}" を末尾に持ち voice
               control prefix-matching「click 過大」 が strict prefix-match で不可 (substring 一致のみ)。
               iter1553-1561 status/role/health Badge family と同 pattern、visible 冒頭固定 + em-dash 区切。 */
            aria-label={`${label} — 傾向`}
          >
            <span aria-hidden="true">{label}</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm" data-testid="estimate-bias-summary">
          {report.summary}
        </p>
        {topSkewLine && (
          <p
            className="text-muted-foreground mt-1 text-[11px]"
            data-testid="estimate-bias-top-skew"
          >
            <span className="text-foreground/70 font-medium">カテゴリ別:</span> {topSkewLine}
          </p>
        )}
        {trendLine && (
          <p className="text-muted-foreground mt-1 text-[11px]" data-testid="estimate-bias-trend">
            {trendLine}
          </p>
        )}
        {/* iter1082 basics: role="img" 付与で SR aria-label authoritative 化
            (内 cell を aria-hidden で隠して集約 aria-label を持つ atomic chip pattern)。
            iter1417: 旧 `<dl role="img">` は aria-allowed-role 違反 (dl は role=img を
            許さない、axe minor)。要素を `<div>` に変更し dt/dd も div 化 (中身は
            aria-hidden で純視覚、dl semantic は AT に出ないため div で等価)。grid 表示は維持。 */}
        <div
          className="text-muted-foreground mt-2 grid grid-cols-3 gap-2 text-[11px]"
          role="img"
          /* iter1591: 旧 aria-label paren convention `"見積バイアス内訳 (見積内 X / ±10% 以内 Y / 超過 Z)"` は
             iter1093-1590 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
          aria-label={`見積バイアス内訳 — 見積内 ${report.underCount} 件 / ±10% 以内 ${report.onCount} 件 / 超過 ${report.overCount} 件`}
        >
          <div aria-hidden="true">
            <div>見積内 (under)</div>
            <div className="text-foreground tabular-nums" data-testid="estimate-bias-under">
              {report.underCount}
            </div>
          </div>
          <div aria-hidden="true">
            <div>±10%以内 (on)</div>
            <div className="text-foreground tabular-nums" data-testid="estimate-bias-on">
              {report.onCount}
            </div>
          </div>
          <div aria-hidden="true">
            <div>超過 (over)</div>
            <div className="text-foreground tabular-nums" data-testid="estimate-bias-over">
              {report.overCount}
            </div>
          </div>
        </div>
        {report.calibrationFactor !== null && (
          <div className="mt-3 space-y-1.5" data-testid="estimate-bias-calibration">
            <p className="text-muted-foreground text-[11px]">
              calibration: 実測/見積の中央値 ≈ {report.calibrationFactor.toFixed(2)}× (
              {report.withEstimateCount}/{report.totalCount} 件)
            </p>
            {(() => {
              const suggestions = suggestCalibratedEstimates(report.calibrationFactor)
              if (suggestions.length === 0) return null
              return (
                <ul
                  className="text-muted-foreground space-y-0.5 text-[11px]"
                  aria-label={`典型的な見積分の校正推奨 ${suggestions.length} 件 (calibration ${report.calibrationFactor.toFixed(2)}× 適用)`}
                  data-testid="estimate-bias-suggestions"
                >
                  {suggestions.map((s) => (
                    <li key={s.inputMinutes} className="tabular-nums">
                      {formatCalibratedEstimateJa(s)}
                    </li>
                  ))}
                </ul>
              )
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
