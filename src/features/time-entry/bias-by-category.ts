/**
 * iter264 ai-automation: TimeEntry を category (dev / meeting / research / ops /
 * other) で slice し、category 別に `EstimateBiasReport` を出す pure ヘルパ。
 *
 * 既存 `bias-selector.ts` (workspace 全体集計) の延長で、AI brief / pm-agent /
 * dashboard が「dev は 1.4× 過小評価しがちだが meeting は ±10% 内」のような
 * 「どのカテゴリで見積を外しているか」を 1 文で返せるようにする。
 *
 * 設計指針:
 * - selectBiasSamplesByCategory はサンプル抽出のみ (category 別 grouping +
 *   既存 `extractEstimateMinutes` で見積抽出)、bias 計算は computeEstimateBias
 *   をそのまま使う (重複排除)。
 * - `computeBiasByCategory(entries, lookup)` は両者を 1 段で繋ぐ便利関数。
 * - `formatTopSkewedCategoryJa(report)` は最も「歪み」が強い category 1 件を
 *   選んで AI prompt 用に 1 行で返す (skew 無し / sample 不足は null)。
 */
import { extractEstimateMinutes } from '@/features/item/estimate'

import { type BiasSample, computeEstimateBias, type EstimateBiasReport } from './bias'
import { type ItemDescriptionLookup } from './bias-selector'
import { categoryLabel, TIME_ENTRY_CATEGORIES, type TimeEntryCategoryKey } from './categories'
import type { TimeEntry } from './schema'

export type BiasSamplesByCategory = Record<TimeEntryCategoryKey, BiasSample[]>
export type BiasReportByCategory = Record<TimeEntryCategoryKey, EstimateBiasReport>

function emptySamplesByCategory(): BiasSamplesByCategory {
  // TIME_ENTRY_CATEGORIES から空配列で初期化 (key の typo を防ぐため as const 経由)
  const out = {} as BiasSamplesByCategory
  for (const c of TIME_ENTRY_CATEGORIES) out[c.key] = []
  return out
}

export function selectBiasSamplesByCategory(
  entries: readonly TimeEntry[],
  lookup: ItemDescriptionLookup,
): BiasSamplesByCategory {
  const out = emptySamplesByCategory()
  for (const e of entries) {
    if (!e.itemId) continue
    const desc = lookup.get(e.itemId)
    const estimate = extractEstimateMinutes(desc)
    const sample: BiasSample = {
      actualMinutes: e.durationMinutes,
      estimateMinutes: estimate ?? null,
    }
    // schema 側で category は TimeEntryCategorySchema に絞られているはずだが、
    // 念のため未知 key は 'other' に倒す (DB 直編集等の防御)
    const key: TimeEntryCategoryKey = (
      TIME_ENTRY_CATEGORIES.some((c) => c.key === e.category) ? e.category : 'other'
    ) as TimeEntryCategoryKey
    out[key].push(sample)
  }
  return out
}

export function computeBiasByCategory(
  entries: readonly TimeEntry[],
  lookup: ItemDescriptionLookup,
): BiasReportByCategory {
  const samples = selectBiasSamplesByCategory(entries, lookup)
  const out = {} as BiasReportByCategory
  for (const c of TIME_ENTRY_CATEGORIES) {
    out[c.key] = computeEstimateBias(samples[c.key])
  }
  return out
}

/**
 * 最も「歪み」が強い category 1 件を AI brief 用 1 行で返す。
 *
 * 選定ルール:
 *  1. tendency が under / over の category だけが候補 (on-track / mixed / unknown は除外)
 *  2. calibrationFactor が `1.0` から最も離れているもの
 *  3. 同点なら withEstimateCount が多い方 (信頼度)
 *  4. 該当なしは null
 *
 * 出力例: `dev: 見積を 1.40× 過小評価しがち (12 件)`
 */
export function formatTopSkewedCategoryJa(report: BiasReportByCategory): string | null {
  type Pick = {
    key: TimeEntryCategoryKey
    factor: number
    distance: number
    samples: number
    isUnder: boolean
  }
  const picks: Pick[] = []
  for (const c of TIME_ENTRY_CATEGORIES) {
    const r = report[c.key]
    if (r.tendency !== 'underestimating' && r.tendency !== 'overestimating') continue
    if (r.calibrationFactor === null) continue
    picks.push({
      key: c.key,
      factor: r.calibrationFactor,
      distance: Math.abs(r.calibrationFactor - 1),
      samples: r.withEstimateCount,
      isUnder: r.tendency === 'underestimating',
    })
  }
  if (picks.length === 0) return null
  picks.sort((a, b) => {
    if (b.distance !== a.distance) return b.distance - a.distance
    return b.samples - a.samples
  })
  const top = picks[0]!
  const verb = top.isUnder ? '過小評価' : '過大評価'
  return `${categoryLabel(top.key)}: 見積を ${top.factor.toFixed(2)}× ${verb}しがち (${top.samples} 件)`
}
