/**
 * iter282 ai-automation: Item ごとに「校正済み見積」を提案する pure helper。
 *
 * iter267 で QuickAdd の preview chip に「→ 39分」を出す `applyBiasCalibration`
 * を入れたが、既存 Item に対しては calibration が効いていなかった。Item 詳細を
 * 開いた時 / AI agent が見積を読む時に「description の見積を直近 bias で
 * 校正するとどう変わるか」を 1 段の helper で出せるようにする substrate。
 *
 * 入力:
 *   - `item.description` (見積プレフィクス: `見積: 30分` / `見積: 1時間`)
 *   - `calibrationFactor` (workspace 全体の bias、null なら校正なし)
 *
 * 出力:
 *   - `original`: description から抽出した分数 (見積無しなら null)
 *   - `calibrated`: 校正後の分数 (factor 1.0 / null / original=null なら null)
 *   - `delta`: calibrated - original (sign 込み)
 *   - `summary`: AI prompt 用 1 行 (`見積: 30分 → 39分 (+9分)` / `見積なし` / `校正不要`)
 *
 * 既存 substrate を再利用 (extractEstimateMinutes / formatEstimate /
 * applyBiasCalibration) — 本 helper はそれらを Item 単位で 1 段の API にまとめるだけ。
 */
import { extractEstimateMinutes, formatEstimate } from '@/features/item/estimate'

import { applyBiasCalibration } from './bias-calibration'

export interface ItemEstimateSuggestion {
  /** description から抽出した元見積 (分)。見積無しは null */
  original: number | null
  /** 校正後の見積 (分)。calibrationFactor null / 1.0 / original null なら null */
  calibrated: number | null
  /** calibrated - original。null は両方 null か校正不要 */
  delta: number | null
  /** AI prompt / aria-label 用 1 行 JA */
  summary: string
}

const SUMMARY_NO_ESTIMATE = '見積なし'
const SUMMARY_NO_CHANGE = '校正不要 (元見積で十分)'

export function suggestItemEstimate(
  description: string | null | undefined,
  calibrationFactor: number | null | undefined,
): ItemEstimateSuggestion {
  const original = extractEstimateMinutes(description) ?? null

  if (original === null) {
    return { original: null, calibrated: null, delta: null, summary: SUMMARY_NO_ESTIMATE }
  }

  // factor が null / undefined / NaN / 1.0 付近 / 不正なら校正なし
  // (applyBiasCalibration は NaN を素通しするので本側で先に弾く)
  const validFactor =
    typeof calibrationFactor === 'number' && Number.isFinite(calibrationFactor)
      ? calibrationFactor
      : null
  const result = validFactor === null ? null : applyBiasCalibration(original, validFactor)

  if (!result || result.deltaMinutes === 0) {
    return {
      original,
      calibrated: null,
      delta: null,
      summary: SUMMARY_NO_CHANGE,
    }
  }

  const sign = result.deltaMinutes > 0 ? '+' : ''
  return {
    original,
    calibrated: result.calibratedMinutes,
    delta: result.deltaMinutes,
    summary: `見積: ${formatEstimate(original)} → ${formatEstimate(result.calibratedMinutes)} (${sign}${result.deltaMinutes}分)`,
  }
}
