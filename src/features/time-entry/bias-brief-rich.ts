/**
 * iter267 ai-automation: workspace 全体 bias brief (iter264) と category 別
 * top-skew 1 行 (iter264b) を 1 つの substrate に合成する pure ヘルパ。
 *
 * 朝 brief / pm-agent prompt / Slack DM / ItemEditDialog hint が
 * 「workspace 全体の傾向 + 最も歪みが強い category」を 4 行で受け取れるようにする。
 *
 * 例:
 *   見積精度: 過小評価傾向 (1.30×)
 *   直近 12 件のうち 9 件 (75%) が見積を超過
 *   次の見積は 1.30× を掛けて出すと実測に近づきます (例: 30分 → 39分)
 *   特に: 開発: 見積を 1.50× 過小評価しがち (8 件)
 *
 * 4 行目は「skew が workspace 全体と同方向で、かつ workspace より極端な
 * category」が見つかった時のみ付与 (= 「workspace 全体は穏やかだが dev だけ
 * 突出している」「workspace 全体と同方向にさらに強い」場合に有効)。逆方向
 * (workspace=under / category=over) や差が小さい場合は混乱の元なので省略する。
 */
import type { EstimateBiasReport } from './bias'
import { type BiasBrief, formatBiasBriefJa } from './bias-brief'
import { type BiasReportByCategory, formatTopSkewedCategoryJa } from './bias-by-category'

export interface BiasBriefRich extends BiasBrief {
  /** 4 行目 (任意): 最も歪みが強い category の note。条件未達なら省略 (undefined) */
  categoryNote?: string
}

const CATEGORY_NOTE_MIN_DELTA = 0.1

export function formatBiasBriefRichJa(
  workspaceReport: EstimateBiasReport,
  categoryReport: BiasReportByCategory,
): BiasBriefRich {
  const base = formatBiasBriefJa(workspaceReport)
  const note = pickCategoryNote(workspaceReport, categoryReport)
  if (note === null) return base
  return { ...base, categoryNote: `特に: ${note}` }
}

/**
 * 4 行版 brief を `\n` 連結した文字列を返す (Slack DM / aria-label / 1 column 表示用)。
 * categoryNote が無ければ 3 行のまま (formatBiasBriefText と同等)。
 */
export function formatBiasBriefRichText(
  workspaceReport: EstimateBiasReport,
  categoryReport: BiasReportByCategory,
): string {
  const b = formatBiasBriefRichJa(workspaceReport, categoryReport)
  const lines = [b.headline, b.detail, b.recommendation]
  if (b.categoryNote) lines.push(b.categoryNote)
  return lines.join('\n')
}

function pickCategoryNote(
  workspaceReport: EstimateBiasReport,
  categoryReport: BiasReportByCategory,
): string | null {
  const note = formatTopSkewedCategoryJa(categoryReport)
  if (!note) return null

  // workspace 全体が under / over でない場合は category 同方向条件が無いので
  // そのまま採用 (mixed / unknown / on-track + 強い category skew = 興味深い情報)
  if (
    workspaceReport.tendency !== 'underestimating' &&
    workspaceReport.tendency !== 'overestimating'
  ) {
    return note
  }

  // 全体と同方向 & 全体より極端な歪みでなければ省略 (混乱回避)
  const wsFactor = workspaceReport.calibrationFactor
  if (wsFactor === null) return note
  const isUnder = workspaceReport.tendency === 'underestimating'

  // top category 文面から factor を抜き出す (`開発: 見積を 1.50× 過小評価しがち` の `1.50`)
  const factorMatch = note.match(/(\d+\.\d{2})×/)
  if (!factorMatch) return note
  const catFactor = Number(factorMatch[1])

  // 同方向確認: under は factor>1, over は factor<1
  const sameDirection = isUnder ? catFactor > 1 : catFactor < 1
  if (!sameDirection) return null

  // 極端度差 (|catFactor-1| - |wsFactor-1|) が一定以上なければ workspace 行と
  // ほぼ同じ情報なので省略
  const wsDistance = Math.abs(wsFactor - 1)
  const catDistance = Math.abs(catFactor - 1)
  if (catDistance - wsDistance < CATEGORY_NOTE_MIN_DELTA) return null

  return note
}
