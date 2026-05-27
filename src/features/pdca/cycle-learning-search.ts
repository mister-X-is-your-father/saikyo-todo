/**
 * iter1412 (queue PDCA P-7 substrate): closed cycle の「learning 検索」 pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 「PDCA mode 抜本再設計」 P-7):
 *   - history view で workspace 全 closed cycle の learnings (仮説 / 実測 / 学び / 改善決定)
 *     を横断検索して「組織知」 として再利用する。
 *   - 過去に同じ課題をどう解決したか / どんな仮説が当たった/外れたか を即引ける。
 *
 * 検索仕様 (deterministic、AI 不使用):
 *   - query を空白で token 分割 (lowercase)。全 token を含む record のみ hit (AND 検索)。
 *   - score = token 出現回数の合計。title マッチは weight 3 で優先 (= 主題一致を上位に)。
 *   - score 降順、同点は入力順 (安定)。空 query は全件 (score 0、入力順)。
 *
 * 副作用無し。pure helper + Vitest 単体で網羅。
 */

export interface CycleLearningRecord {
  id: string
  title: string
  hypothesis?: string | null
  targetMetric?: string | null
  actualValue?: string | null
  checkFindings?: string | null
  actDecisions?: string | null
}

export interface CycleLearningHit {
  record: CycleLearningRecord
  score: number
  /** token が出現したフィールド名 (title / hypothesis / ...) */
  matchedFields: string[]
}

const SEARCHABLE_FIELDS: ReadonlyArray<{
  key: keyof CycleLearningRecord
  weight: number
}> = [
  { key: 'title', weight: 3 },
  { key: 'hypothesis', weight: 1 },
  { key: 'targetMetric', weight: 1 },
  { key: 'actualValue', weight: 1 },
  { key: 'checkFindings', weight: 1 },
  { key: 'actDecisions', weight: 1 },
]

function tokenize(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t !== '')
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle === '') return 0
  let count = 0
  let from = 0
  for (;;) {
    const idx = haystack.indexOf(needle, from)
    if (idx < 0) break
    count += 1
    from = idx + needle.length
  }
  return count
}

export function searchCycleLearnings(
  records: readonly CycleLearningRecord[],
  query: string,
): CycleLearningHit[] {
  const tokens = tokenize(query)

  if (tokens.length === 0) {
    return records.map((record) => ({ record, score: 0, matchedFields: [] }))
  }

  const scored: Array<{ hit: CycleLearningHit; order: number }> = []

  records.forEach((record, order) => {
    // 各 field の lowercase 本文を 1 度だけ用意
    const fieldTexts = SEARCHABLE_FIELDS.map((f) => ({
      key: f.key,
      weight: f.weight,
      text: String(record[f.key] ?? '').toLowerCase(),
    }))

    let score = 0
    const matchedFields = new Set<string>()
    let allTokensPresent = true

    for (const token of tokens) {
      let tokenFound = false
      for (const f of fieldTexts) {
        const occ = countOccurrences(f.text, token)
        if (occ > 0) {
          score += occ * f.weight
          matchedFields.add(String(f.key))
          tokenFound = true
        }
      }
      if (!tokenFound) {
        allTokensPresent = false
        break
      }
    }

    if (allTokensPresent && score > 0) {
      scored.push({
        hit: {
          record,
          score,
          matchedFields: SEARCHABLE_FIELDS.filter((f) => matchedFields.has(String(f.key))).map(
            (f) => String(f.key),
          ),
        },
        order,
      })
    }
  })

  scored.sort((a, b) => b.hit.score - a.hit.score || a.order - b.order)
  return scored.map((s) => s.hit)
}
