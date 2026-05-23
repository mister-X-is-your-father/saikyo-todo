/**
 * iter530 (queue methodology TC-3 substrate): TaskChute mode の累積残時間 ticker
 * の pure data substrate。
 *
 * 設計目的 (docs/methodology-modes-plan.md §1 T-3 + §5 TC-3):
 *   - TaskChute view 上部に 「合計 4h12m / 残 2h45m / 終わる予測 18:30」 を出す
 *   - 各 row 横に「累積残 (この task が終わる頃 残 X 分)」 を出す
 *   - AI 不使用、副作用無し、依存無し
 *
 * 入力:
 *   - timeline 順 (= sortForTimeline 済) の items + 各 item の estimateMin (caller が
 *     extractEstimateMinutes 等で事前抽出)
 *   - now: 現在時刻 (Date)、test 時に注入
 *
 * 出力 shape:
 *   - totalEstimateMin: 全 active item の estimate 合計
 *   - doneEstimateMin: done 済 item の estimate 合計
 *   - remainingEstimateMin: total - done (= まだ消化してない時間)
 *   - estimateUnknownCount: estimate 無し item の件数 (UI で「N 件は見積なし」 警告用)
 *   - rows: 各 item に対し
 *     - estimateMin (元値、null = 未推定)
 *     - cumulativeRemainingMin (この行 開始時点 で残ってる estimate 合計、自身含む)
 *     - eta (この行 完了予測時刻、HH:MM、now + 累積で計算、estimate 無し row は null)
 *
 * eta 計算:
 *   - 開始時刻 = now (= 累積消化開始)
 *   - row[0].eta = now + estimateMin[0] minute
 *   - row[i].eta = row[i-1].eta + estimateMin[i] minute (estimate 無し row は前行 eta を引き継ぐ)
 *   - 24h 跨ぎは HH:MM 表示のみ (date は別、UI 側で「翌」表示が必要なら caller が判定)
 *
 * 副作用なし、依存なし。pure helper + Vitest 単体 test で網羅。
 */
import { MS_PER_MINUTE, pad2 } from '@/lib/date/iso'
import { rateToPct } from '@/lib/format-rate'

import { isTerminalStatus } from '@/features/item/status-visual'

export interface TickerItemFields {
  id: string
  /** done 判定: doneAt 非 null or status='done'/cancelled */
  doneAt?: Date | string | null | undefined
  status?: string | null | undefined
  /** 見積分。null/undefined = 未推定 (cumulative 加算しない、警告 count) */
  estimateMin?: number | null | undefined
}

export interface TickerRow<T extends TickerItemFields> {
  item: T
  estimateMin: number | null
  /** この行 完了直後 の残 estimate 合計 (= この行 estimate を消化した後の残) */
  cumulativeRemainingMin: number
  /** この行 完了予測時刻 (HH:MM 24h)、estimate 無し or done 済 → null */
  eta: string | null
}

export interface TaskChuteTicker<T extends TickerItemFields> {
  totalEstimateMin: number
  doneEstimateMin: number
  remainingEstimateMin: number
  estimateUnknownCount: number
  rows: TickerRow<T>[]
}

function isDone(it: TickerItemFields): boolean {
  if (it.doneAt) return true
  if (isTerminalStatus(it.status)) return true
  return false
}

// iter1155 refactor: 旧 local `pad2` (4 行 self-defined) を `@/lib/date/iso#pad2` に
// 集約 (sort-for-timeline.ts と同 source、iter360/1024/1145 sweep の延長線)。
function formatHHMM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function buildTaskChuteTicker<T extends TickerItemFields>(
  items: readonly T[],
  now: Date = new Date(),
): TaskChuteTicker<T> {
  let totalEstimateMin = 0
  let doneEstimateMin = 0
  let estimateUnknownCount = 0

  // 1 周目: 合計集計 + 残 estimate (active item) 合計
  let remainingActive = 0
  for (const it of items) {
    const est = typeof it.estimateMin === 'number' && it.estimateMin >= 0 ? it.estimateMin : null
    if (est === null) {
      estimateUnknownCount += 1
      continue
    }
    totalEstimateMin += est
    if (isDone(it)) doneEstimateMin += est
    else remainingActive += est
  }

  // 2 周目: 各 row の cumulativeRemaining + eta
  // eta 計算は active item のみで進む。done 行は eta=null、cumulativeRemaining=直前と同値。
  const rows: TickerRow<T>[] = []
  let consumed = 0 // 「この行 まで に進んだ active estimate」
  for (const it of items) {
    const est = typeof it.estimateMin === 'number' && it.estimateMin >= 0 ? it.estimateMin : null
    if (isDone(it)) {
      rows.push({
        item: it,
        estimateMin: est,
        cumulativeRemainingMin: remainingActive - consumed,
        eta: null,
      })
      continue
    }
    if (est === null) {
      // estimate 無し active row は累積に加算しない (= eta も null、UI は「-」表示)
      rows.push({
        item: it,
        estimateMin: null,
        cumulativeRemainingMin: remainingActive - consumed,
        eta: null,
      })
      continue
    }
    consumed += est
    // iter1150 refactor: 旧 inline `consumed * 60 * 1000` を `MS_PER_MINUTE` に集約
    const eta = new Date(now.getTime() + consumed * MS_PER_MINUTE)
    rows.push({
      item: it,
      estimateMin: est,
      cumulativeRemainingMin: remainingActive - consumed,
      eta: formatHHMM(eta),
    })
  }

  return {
    totalEstimateMin,
    doneEstimateMin,
    remainingEstimateMin: totalEstimateMin - doneEstimateMin,
    estimateUnknownCount,
    rows,
  }
}

/**
 * iter530 ai-automation polish: 分単位 duration を「4h12m」形式の Japanese 短縮表記に
 * 整形する pure helper。TaskChute ticker header / row 累積残の chip / aria-label /
 * AI prompt で再利用。
 *
 *   formatDurationJa(0) === '0m'
 *   formatDurationJa(45) === '45m'
 *   formatDurationJa(60) === '1h'
 *   formatDurationJa(252) === '4h12m'
 *   formatDurationJa(-1) === '0m'    (negative は 0 へ clamp)
 *   formatDurationJa(NaN) === '0m'
 */
export function formatDurationJa(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m'
  const m = Math.round(minutes)
  const hours = Math.floor(m / 60)
  const mins = m % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins}m`
}

/**
 * TaskChute view header / chip aria-label / AI prompt 用 1 行 ticker サマリ:
 *   '合計 4h12m / 残 2h45m / 終わる予測 18:30'
 *   '合計 4h12m / 残 2h45m / 終わる予測 18:30 (3 件 見積なし)'   (= unknown 含む)
 *   '合計 0m'                                                     (= 全件 見積なし or 0 件)
 *
 * 終わる予測 = active rows 中で最後に eta を持つ row の eta (= 全 active が done すれば
 * その時刻に終わる)。eta 取れない (全件 estimate 無し / 全 done) 場合は省略。
 */
export function formatTickerHeaderJa<T extends TickerItemFields>(
  ticker: TaskChuteTicker<T>,
): string {
  if (ticker.totalEstimateMin <= 0 && ticker.estimateUnknownCount === 0) {
    return '合計 0m'
  }
  const total = formatDurationJa(ticker.totalEstimateMin)
  const remaining = formatDurationJa(ticker.remainingEstimateMin)
  const lastEta = [...ticker.rows].reverse().find((r) => r.eta !== null)?.eta ?? null
  const etaPart = lastEta ? ` / 終わる予測 ${lastEta}` : ''
  const unknownPart =
    ticker.estimateUnknownCount > 0 ? ` (${ticker.estimateUnknownCount} 件 見積なし)` : ''
  return `合計 ${total} / 残 ${remaining}${etaPart}${unknownPart}`
}

/**
 * iter1012 ai-automation: TaskChute ticker の進捗率 (= done / total estimate) を返す。
 *
 * iter1002 `computeReviewPassRatio` / iter944 `computePlanSpeedupRatio` / iter1007
 * `computeActorConcentration` と並ぶ「単一 ratio metric」 pattern の taskchute 軸版。
 *
 * 仕様:
 *   - totalEstimateMin === 0 → null (= 全件 見積なし or 0 件、`formatTickerHeaderJa` と
 *     同じ '0m' sentinel に整合する null sentinel)
 *   - 通常 → 0-100 整数 (done / total を rateToPct で 0 桁丸め)
 *   - done > total は起こらない (= 同 ticker 内で計算済) が防御で min(100) は不要
 *
 * 用途:
 *   - TaskChute header chip 「進捗 65%」 (= formatDurationJa と並ぶ chip 軸)
 *   - dashboard progress bar
 *   - AI prompt 「today work how much done?」 数値根拠
 *   - Slack daily digest 「今日の TaskChute 進捗 65%」
 */
export function computeTickerProgressPct<T extends TickerItemFields>(
  ticker: Pick<TaskChuteTicker<T>, 'totalEstimateMin' | 'doneEstimateMin'>,
): number | null {
  if (ticker.totalEstimateMin === 0) return null
  return rateToPct(ticker.doneEstimateMin / ticker.totalEstimateMin)
}

/**
 * iter1012 ai-automation: TaskChute ticker progress を chip 文言に整形。
 *   '進捗 65% (2h45m / 4h12m 完了)'
 *   '進捗 100% (全件完了)'
 *   '進捗 0% (未着手)'
 *   '進捗なし (見積なし)'   (= ratio null)
 */
export function formatTickerProgressJa<T extends TickerItemFields>(
  ticker: Pick<TaskChuteTicker<T>, 'totalEstimateMin' | 'doneEstimateMin'>,
): string {
  const ratio = computeTickerProgressPct(ticker)
  if (ratio === null) return '進捗なし (見積なし)'
  if (ratio >= 100) return '進捗 100% (全件完了)'
  if (ratio <= 0) return '進捗 0% (未着手)'
  const done = formatDurationJa(ticker.doneEstimateMin)
  const total = formatDurationJa(ticker.totalEstimateMin)
  return `進捗 ${ratio}% (${done} / ${total} 完了)`
}

// 内部 helper を test しやすく named export
export { formatHHMM, isDone }
