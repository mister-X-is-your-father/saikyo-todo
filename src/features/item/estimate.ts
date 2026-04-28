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
