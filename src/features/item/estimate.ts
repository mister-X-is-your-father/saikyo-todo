/**
 * 工数推定 (estimate) の純粋ヘルパ。iter255 で nl-parse.ts から分離。
 *
 * - `parseEstimateFromText(text)`: 自然言語に含まれる `30分` / `1時間30分` /
 *   `30m` / `1.5h` 等から工数を抽出。consume 範囲 (replace 用) を返す。
 * - `formatEstimate(minutes)`: 数値を `1時間30分` などの人間表記に整形。
 * - `extractEstimateMinutes(description)`: Item.description の
 *   `見積: ...` プレフィクス (1 行目) から復元。
 *
 * 受理レンジは 1 分以上、上限 60 時間 (3600 分)。範囲外は `null` / `undefined`。
 */
import { formatNonZeroCounts } from '@/lib/format-counts'

const ESTIMATE_MAX_MINUTES = 3600

export interface ParsedEstimate {
  minutes: number
  /** マッチ全体 (前後の word boundary を含む)。呼び出し側で text.replace(matched, ' ') する想定 */
  matched: string
}

/**
 * 入力テキストから最初に見つかった工数 token を抽出する。
 * 時刻 (`15時`) との衝突を避けるため、JA `<n>時間` を最優先で検査する。
 * iter254 で nl-parse の inline ロジックだったものを移植。
 */
export function parseEstimateFromText(text: string): ParsedEstimate | null {
  // JA: `1時間30分` / `1時間` (連結のみ;「秒」「日」は無視)
  const estJa = text.match(/(^|\s)(\d{1,3})時間(?:(\d{1,2})分)?(\s|$)/)
  if (estJa) {
    const minutes = Number(estJa[2]) * 60 + Number(estJa[3] ?? '0')
    if (isInRange(minutes)) return { minutes, matched: estJa[0] }
  }
  // JA: 単独の `<n>分`
  const estJaMin = text.match(/(^|\s)(\d{1,3})分(\s|$)/)
  if (estJaMin) {
    const minutes = Number(estJaMin[2])
    if (isInRange(minutes)) return { minutes, matched: estJaMin[0] }
  }
  // EN: `1.5h` / `2h30m` / `2H30MIN` (case-insensitive、小数 h 許可)
  const estEn = text.match(/(^|\s)(\d+(?:\.\d+)?)h(?:(\d{1,2})m(?:in)?s?)?(\s|$)/i)
  if (estEn) {
    const minutes = Math.round(Number(estEn[2]) * 60) + Number(estEn[3] ?? '0')
    if (isInRange(minutes)) return { minutes, matched: estEn[0] }
  }
  // EN: `30m` / `30min` / `30mins`
  const estEnMin = text.match(/(^|\s)(\d{1,3})m(?:in)?s?(\s|$)/i)
  if (estEnMin) {
    const minutes = Number(estEnMin[2])
    if (isInRange(minutes)) return { minutes, matched: estEnMin[0] }
  }
  return null
}

/**
 * 推定分数を日本語の人間表記に整形する (chip / description / aria-label 共有)。
 * 0 や負値は空文字。`90` → `1時間30分` / `60` → `1時間` / `45` → `45分`。
 */
export function formatEstimate(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return ''
  if (minutes < 60) return `${minutes}分`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}時間` : `${h}時間${m}分`
}

/**
 * Item.description の `見積: X` プレフィクス (1 行目) から分数を復元。
 * QuickAdd で書き込んだフォーマットを timer Stop 時の variance 計算で使う。
 *
 * 受理:
 *   - `見積: 30分` / `見積: 1時間` / `見積: 1時間30分`
 *   - `見積: 30m` / `見積: 1h` / `見積: 1.5h` / `見積: 2h30m` (英)
 *
 * description は複数行 / 末尾任意。1 行目だけを見る (将来 description が長文化しても
 * 安全)。マッチしない / 範囲外 (>3600 分) は undefined。
 */
export function extractEstimateMinutes(description: string | null | undefined): number | undefined {
  if (!description) return undefined
  const firstLine = description.split('\n', 1)[0]!
  const ja = firstLine.match(/見積:\s*(?:(\d{1,3})時間)?(?:(\d{1,2})分)?/)
  if (ja && (ja[1] || ja[2])) {
    const minutes = Number(ja[1] ?? '0') * 60 + Number(ja[2] ?? '0')
    if (isInRange(minutes)) return minutes
  }
  const en = firstLine.match(
    /見積:\s*(?:(\d+(?:\.\d+)?)h(?:(\d{1,2})m(?:in)?s?)?|(\d{1,3})m(?:in)?s?)/i,
  )
  if (en) {
    if (en[1]) {
      const minutes = Math.round(Number(en[1]) * 60) + Number(en[2] ?? '0')
      if (isInRange(minutes)) return minutes
    } else if (en[3]) {
      const minutes = Number(en[3])
      if (isInRange(minutes)) return minutes
    }
  }
  return undefined
}

function isInRange(minutes: number): boolean {
  return minutes > 0 && minutes <= ESTIMATE_MAX_MINUTES
}

/**
 * iter297 ai-automation: items 配列から見積の合計 / 件数 / 未設定 件数 を集計する pure helper。
 *
 * AI 朝 brief / dashboard widget が「今日の予定: 合計 4.5時間 / 7件 (うち 2 件は
 * 見積なし)」のような 1 行 chip を出すための substrate。caller は事前に
 * 「今日対象の Item」「Sprint 内 Item」等で filter してから渡す前提。
 *
 * 戻り値:
 *   - `totalMinutes`: 見積ありの items の minutes 合計 (見積なしは 0 として加算しない)
 *   - `withEstimateCount`: 見積を取れた items の件数
 *   - `withoutEstimateCount`: description から見積を取れなかった items の件数
 *   - `count`: items.length (受信件数)
 *
 * `description` フィールドが必須 (`extractEstimateMinutes` を呼ぶため)。
 * 未指定 / 空 / 見積なしの description は `withoutEstimateCount` に集計される。
 */
export interface ItemEstimateSummary {
  totalMinutes: number
  withEstimateCount: number
  withoutEstimateCount: number
  count: number
}

export function summarizeItemEstimates(
  items: readonly { description: string | null | undefined }[],
): ItemEstimateSummary {
  let totalMinutes = 0
  let withEstimateCount = 0
  for (const it of items) {
    const m = extractEstimateMinutes(it.description)
    if (m !== undefined) {
      totalMinutes += m
      withEstimateCount += 1
    }
  }
  return {
    totalMinutes,
    withEstimateCount,
    withoutEstimateCount: items.length - withEstimateCount,
    count: items.length,
  }
}

/**
 * AI 行 / dashboard chip 用の 1 行 summary。
 * - 全 0 件 → "見積 0 件"
 * - 見積なしのみ → "見積 0 / 全 N 件"
 * - 見積あり → "合計 4.5時間 / N 件 (うち M 件は見積なし)"
 *   (見積なしが 0 件なら "(うち …)" は省略)
 */
export function formatItemEstimateSummary(s: ItemEstimateSummary): string {
  if (s.count === 0) return '見積 0 件'
  if (s.withEstimateCount === 0) return `見積 0 / 全 ${s.count} 件`
  const total = formatEstimate(s.totalMinutes) || '0分'
  if (s.withoutEstimateCount === 0) return `合計 ${total} / ${s.count} 件`
  return `合計 ${total} / ${s.count} 件 (うち ${s.withoutEstimateCount} 件は見積なし)`
}

/**
 * iter309 ai-automation: items を見積サイズ別の bucket に振り分ける。
 *
 * iter287 (due-proximity) / iter292 (priority) / iter294 (status) / iter294 並走
 * (urgency-tier) と対称な「効率の意味付け」substrate。AI brief / pm-agent /
 * dashboard widget が `quick 5 / medium 10 / large 3 / xlarge 1 / unknown 8`
 * のような effort 分布を 1 関数で出せる。
 *
 * bucket (PR sizing と同 vocabulary):
 *  - `quick`   見積 < 30m       (skim 系、5 分集中で片付く tier)
 *  - `medium`  30m..< 2h        (1 集中で完結)
 *  - `large`   2h..< 8h (= 1d)  (半日仕事、deep work tier)
 *  - `xlarge`  >= 8h            (1 日以上、分解候補)
 *  - `unknown` description から minutes を取れない (見積なし)
 *
 * 順序: 元配列順 stable。各 bucket は必ず空配列で初期化。
 */
export type EffortBucket = 'quick' | 'medium' | 'large' | 'xlarge' | 'unknown'

export type EffortBucketGroups<T> = Record<EffortBucket, T[]>

const EFFORT_ORDER: readonly EffortBucket[] = [
  'quick',
  'medium',
  'large',
  'xlarge',
  'unknown',
] as const

const EFFORT_LABEL: Record<EffortBucket, string> = {
  quick: '<30m',
  medium: '30m-2h',
  large: '2h-1d',
  xlarge: '1d+',
  unknown: '見積なし',
}

function classifyEffort(minutes: number | undefined): EffortBucket {
  if (minutes === undefined || minutes <= 0) return 'unknown'
  if (minutes < 30) return 'quick'
  if (minutes < 120) return 'medium'
  if (minutes < 480) return 'large'
  return 'xlarge'
}

export function groupItemsByEffortBucket<T extends { description: string | null | undefined }>(
  items: readonly T[],
): EffortBucketGroups<T> {
  const groups: EffortBucketGroups<T> = {
    quick: [],
    medium: [],
    large: [],
    xlarge: [],
    unknown: [],
  }
  for (const it of items) {
    const m = extractEstimateMinutes(it.description)
    groups[classifyEffort(m)].push(it)
  }
  return groups
}

export function countItemsByEffortBucket(
  items: readonly { description: string | null | undefined }[],
): Record<EffortBucket, number> {
  const counts: Record<EffortBucket, number> = {
    quick: 0,
    medium: 0,
    large: 0,
    xlarge: 0,
    unknown: 0,
  }
  for (const it of items) {
    const m = extractEstimateMinutes(it.description)
    counts[classifyEffort(m)] += 1
  }
  return counts
}

export function formatEffortBucketCounts(counts: Record<EffortBucket, number>): string {
  return formatNonZeroCounts(counts, EFFORT_ORDER, EFFORT_LABEL)
}

/**
 * iter1386 ai-automation: 見積ありの effort bucket のうち最多を返す (= backlog の主な粒度)。
 *
 * pickDominantNotificationType (notification) / pickTopActor (audit) と並ぶ「単一 最重 抽出」
 * pattern の effort 軸版。dashboard chip 「主な粒度: 30m-2h (12 件)」 で「今の backlog は
 * どのサイズのタスクが多いか」 を 0.5 秒で示す。
 *
 * 仕様:
 *   - `unknown` (見積なし) は effort レベルではないので **除外** (count があっても主軸にしない)
 *   - 見積あり全 0 (= unknown のみ or 空) → null
 *   - tie は EFFORT_ORDER 宣言順 (quick > medium > large > xlarge)
 */
export function pickDominantEffortBucket(
  counts: Record<EffortBucket, number>,
): { bucket: Exclude<EffortBucket, 'unknown'>; count: number } | null {
  let best: { bucket: Exclude<EffortBucket, 'unknown'>; count: number } | null = null
  for (const b of EFFORT_ORDER) {
    if (b === 'unknown') continue
    const c = counts[b]
    if (c > 0 && (best === null || c > best.count)) {
      best = { bucket: b, count: c }
    }
  }
  return best
}

/**
 * pickDominantEffortBucket の出力を chip 文言に整形。
 *   '主な粒度: 30m-2h (12 件)' / '主な粒度: 見積あり task なし' (null)
 */
export function formatDominantEffortBucketJa(
  picked: { bucket: Exclude<EffortBucket, 'unknown'>; count: number } | null,
): string {
  if (picked === null) return '主な粒度: 見積あり task なし'
  return `主な粒度: ${EFFORT_LABEL[picked.bucket]} (${picked.count} 件)`
}
