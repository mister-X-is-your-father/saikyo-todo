/**
 * iter1405 (queue PDCA P-6 substrate): Act → 次 cycle chain の prefill pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 「PDCA mode 抜本再設計」 P-6):
 *   - closed する cycle の Act (改善決定) / Check (学び) を起点に、次 cycle の
 *     title / hypothesis / target_metric を deterministic に prefill する。
 *   - 「前 cycle の learning を踏まえて...」 を毎回手書きさせない = 思考の連続性を強制
 *     (設計哲学「思考力・段取り力を鍛える」)。
 *   - AI 不使用・副作用無し。pdca-cycle schema の nextCycleId chain を service が貼る際、
 *     新 cycle の初期 field を本 helper で算出する。
 *
 * title 採番:
 *   - 末尾が `(N)` なら N+1 ('Q2 改善 (2)' → 'Q2 改善 (3)')
 *   - それ以外は ` (2)' を付ける ('Q2 改善' → 'Q2 改善 (2)')
 *
 * hypothesis prefill:
 *   - actDecisions があればそれを、無ければ checkFindings を「踏まえて」 文で導く
 *   - 両方空なら最小の続き宣言 (空文字は返さない = 必ず編集の足場を出す)
 *
 * targetMetric: 計測の連続性のため前 cycle の値をそのまま引き継ぐ (空なら空)。
 */

export interface NextCyclePrefillInput {
  /** 前 cycle の title (notNull) */
  title: string
  /** Check: 学び (markdown) */
  checkFindings?: string | null
  /** Act: 改善決定 (markdown) */
  actDecisions?: string | null
  /** Plan: 何で測るか */
  targetMetric?: string | null
}

export interface NextCyclePrefill {
  title: string
  hypothesis: string
  targetMetric: string
}

function nextTitle(rawTitle: string): string {
  const title = (rawTitle ?? '').trim()
  const m = title.match(/^(.*?)\s*\((\d+)\)$/)
  if (m) {
    const base = (m[1] ?? '').trim()
    const n = Number.parseInt(m[2] ?? '1', 10)
    return base === '' ? `(${n + 1})` : `${base} (${n + 1})`
  }
  return title === '' ? 'サイクル (2)' : `${title} (2)`
}

export function buildNextCyclePrefill(prev: NextCyclePrefillInput): NextCyclePrefill {
  const prevTitle = (prev.title ?? '').trim()
  const lead = prevTitle === '' ? '前サイクル' : `前サイクル「${prevTitle}」`

  const act = (prev.actDecisions ?? '').trim()
  const findings = (prev.checkFindings ?? '').trim()

  let hypothesis: string
  if (act !== '') {
    hypothesis = `${lead}の改善決定を踏まえて：\n${act}`
  } else if (findings !== '') {
    hypothesis = `${lead}の学びを踏まえて：\n${findings}`
  } else {
    hypothesis = `${lead}の続きとして、次の仮説を立てる。`
  }

  return {
    title: nextTitle(prevTitle),
    hypothesis,
    targetMetric: (prev.targetMetric ?? '').trim(),
  }
}

// test しやすく named export
export { nextTitle }
