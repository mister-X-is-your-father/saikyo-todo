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
  if (it.status === 'done' || it.status === 'cancelled') return true
  return false
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

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
    const eta = new Date(now.getTime() + consumed * 60 * 1000)
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

// 内部 helper を test しやすく named export
export { formatHHMM, isDone }
