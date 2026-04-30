/**
 * iter485 refactor: AI 出力 string から「1 個目の JSON object」 を切り出す helper を集約。
 *
 * iter533 (structured-plan) / iter538 (structured-review) で同 implementation が
 * file 内に重複していた (29 行 × 2 = 58 行)。今後 structured-* helper は AC-3
 * (inline AI 提案) や PDCA AI-1 等で増える予定なので、ここに集約。
 *
 * 仕様:
 *   - 1 個目の `{` から対応する `}` までを切り出す (depth 追跡)
 *   - 文字列内の `"{}` は無視 (escape \ 対応)
 *   - 対応 `}` が無ければ null
 *   - `{` 自体が無ければ null
 *
 * 既存呼出 (structured-plan / structured-review) は本 helper を import するように
 * 切替済。test も統合 (既存 test を path 変更のみで再利用)。
 *
 * 副作用なし、依存なし。
 */
export function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < s.length; i++) {
    const c = s.charAt(i)
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') depth += 1
    else if (c === '}') {
      depth -= 1
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}
