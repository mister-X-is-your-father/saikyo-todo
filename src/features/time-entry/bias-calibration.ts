/**
 * iter262 ai-automation: 直近 bias の calibrationFactor を適用して
 * 「いつもの 30 分タスクは実測 39 分」のような訂正提案を出す pure helper。
 *
 * iter257 (`computeEstimateBias`) が出した median 比率から「次の見積は何分に
 * 言い換えるべきか」を機械的に計算する。AI 朝 brief / QuickAdd preview /
 * ItemEditDialog の reminder に流用できる純粋関数として保つ。
 */

export interface CalibratedEstimate {
  inputMinutes: number
  /** factor を適用して整数丸めした分数 (>=1 で clamp) */
  calibratedMinutes: number
  /** calibrated - input。+ なら user の見積より長く見るべき */
  deltaMinutes: number
}

/**
 * 単一の見積分を calibrationFactor で換算する。
 * factor が null (= sample 不足 / unknown) や非正、または estimate が <=0 の場合は
 * `null` を返し、UI 側は「校正データなし」扱いに倒す。
 */
export function applyBiasCalibration(
  estimateMinutes: number,
  calibrationFactor: number | null,
): CalibratedEstimate | null {
  if (calibrationFactor === null || calibrationFactor <= 0) return null
  if (!Number.isFinite(estimateMinutes) || estimateMinutes <= 0) return null
  const calibrated = Math.max(1, Math.round(estimateMinutes * calibrationFactor))
  return {
    inputMinutes: estimateMinutes,
    calibratedMinutes: calibrated,
    deltaMinutes: calibrated - estimateMinutes,
  }
}

const COMMON_ESTIMATE_MINUTES: readonly number[] = [15, 30, 60, 120, 240]

/**
 * dashboard / brief 用に「典型的な見積分 (15/30/60/120/240) を calibrated すると
 * 何分?」のテーブルを生成する。factor が null なら空配列。
 *
 * 入力 = 校正後と等しい (delta=0) な行はスキップ — 「同じ」と提示しても情報量がないため。
 */
export function suggestCalibratedEstimates(calibrationFactor: number | null): CalibratedEstimate[] {
  if (calibrationFactor === null || calibrationFactor <= 0) return []
  const out: CalibratedEstimate[] = []
  for (const m of COMMON_ESTIMATE_MINUTES) {
    const c = applyBiasCalibration(m, calibrationFactor)
    if (c && c.deltaMinutes !== 0) out.push(c)
  }
  return out
}

/**
 * `30分 → 39分 (+9分)` の人間可読 1 行表記に整形 (toast / chip / aria-label 共用)。
 * 0 delta は呼び出し側で除外する想定 (suggestCalibratedEstimates が既に除外する)。
 */
export function formatCalibratedEstimateJa(c: CalibratedEstimate): string {
  const sign = c.deltaMinutes > 0 ? '+' : c.deltaMinutes < 0 ? '' : '±'
  return `${c.inputMinutes}分 → ${c.calibratedMinutes}分 (${sign}${c.deltaMinutes}分)`
}
