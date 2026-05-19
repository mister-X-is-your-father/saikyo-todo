/**
 * iter264 ai-automation: 見積精度 bias を「朝の brief」用 3 行 JA 文面に整形する pure helper。
 *
 * pm-agent / morning brief / ItemEditDialog hint / dashboard widget が同じ
 * 事実 (EstimateBiasReport) から共通の文面を生成できるよう、文字列整形を 1 箇所に集約する。
 *
 * - 1 行目: tendency 要約 (見積精度: 良好 / 過小評価 / 過大評価 / ばらつき / データ不足)
 * - 2 行目: 数量的根拠 (件数 + 比率 or median ratio)
 * - 3 行目: 推奨アクション (校正倍率 / sample 増やす / そのまま continue)
 *
 * 入力 = `EstimateBiasReport` 1 つ。出力は固定 3 要素の文字列配列。
 * 配列にすることで UI 側で `<ul>` / `\n` join / Slack mrkdwn など好みの形に組める。
 */
import { rateToPct } from '@/lib/format-rate'

import type { EstimateBiasReport } from './bias'

export interface BiasBrief {
  /** 1 行目: 見出し (tendency JA ラベル) */
  headline: string
  /** 2 行目: 数量的根拠 */
  detail: string
  /** 3 行目: 推奨アクション */
  recommendation: string
}

export function formatBiasBriefJa(report: EstimateBiasReport): BiasBrief {
  const cal = report.calibrationFactor !== null ? `${report.calibrationFactor.toFixed(2)}×` : '—'

  if (report.tendency === 'unknown') {
    return {
      headline: '見積精度: データ不足',
      detail: `直近 ${report.withEstimateCount}/${report.totalCount} 件のサンプル (校正には 3 件以上必要)`,
      recommendation:
        'QuickAdd で「見積: 30分」のように付けて記録すると、5 タスクほどで傾向が見え始めます',
    }
  }

  if (report.tendency === 'on-track') {
    return {
      headline: '見積精度: 良好',
      detail: `見積±10% 以内が ${pct(report.onCount, report.withEstimateCount)}% (${report.withEstimateCount} 件中 ${report.onCount} 件)`,
      recommendation: 'このまま続けて OK。新しいタスクの見積もそのまま信頼できます',
    }
  }

  if (report.tendency === 'underestimating') {
    return {
      headline: `見積精度: 過小評価傾向 (${cal})`,
      detail: `直近 ${report.withEstimateCount} 件のうち ${report.overCount} 件 (${pct(report.overCount, report.withEstimateCount)}%) が見積を超過`,
      recommendation: `次の見積は ${cal} を掛けて出すと実測に近づきます (例: 30分 → ${calibrated(30, report.calibrationFactor)}分)`,
    }
  }

  if (report.tendency === 'overestimating') {
    return {
      headline: `見積精度: 過大評価傾向 (${cal})`,
      detail: `直近 ${report.withEstimateCount} 件のうち ${report.underCount} 件 (${pct(report.underCount, report.withEstimateCount)}%) が見積より早く完了`,
      recommendation: `次の見積は ${cal} を掛けて出すと実測に近づきます (例: 60分 → ${calibrated(60, report.calibrationFactor)}分)`,
    }
  }

  // mixed
  return {
    headline: '見積精度: ばらつきあり',
    detail: `見積内 ${report.underCount} / ぴったり ${report.onCount} / 超過 ${report.overCount} 件 (中央値 ${cal})`,
    recommendation:
      'タスク種別ごと (調査 / 実装 / レビュー 等) に分けて見積をつけると精度が安定します',
  }
}

/**
 * BiasBrief を `\n` 連結した 1 文字列を返す (Slack DM / mrkdwn / aria-label 用)。
 */
export function formatBiasBriefText(report: EstimateBiasReport): string {
  const b = formatBiasBriefJa(report)
  return `${b.headline}\n${b.detail}\n${b.recommendation}`
}

function pct(num: number, denom: number): number {
  if (denom === 0) return 0
  return rateToPct(num / denom)
}

function calibrated(estimate: number, factor: number | null): number {
  if (factor === null || factor <= 0) return estimate
  return Math.max(1, Math.round(estimate * factor))
}
