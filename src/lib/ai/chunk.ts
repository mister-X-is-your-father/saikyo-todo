/**
 * テキスト分割 (chunking)。MVP は固定長 + オーバーラップ方式。
 *
 * 設計判断: 文境界 / 段落境界を尊重するほど精度が上がるが実装コストが高い。
 * multilingual-e5-small は日本語を含むマルチリンガル tokenizer で、固定長分割でも
 * 実用十分な RAG 精度が出る (Week 0 Day 0.3 PoC で確認済)。Post-MVP で必要に応じて
 * 段落境界尊重版に差し替え可能。
 */

export interface ChunkOptions {
  /** 1 chunk の最大文字数 (デフォルト 500) */
  maxChars?: number
  /** chunk 間のオーバーラップ文字数 (デフォルト 50)。文脈を保つために連続 chunk で重複 */
  overlap?: number
}

const DEFAULT_MAX = 500
const DEFAULT_OVERLAP = 50

/**
 * テキストを maxChars 以下の chunk に分割する。
 * 空文字列 → 空配列。短文 → 1 要素配列。それ以上は overlap しながらスライス。
 *
 * 例: chunkText("0123456789", { maxChars: 4, overlap: 1 }) → ["0123", "3456", "6789", "9"]
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX
  const overlap = options.overlap ?? DEFAULT_OVERLAP
  if (maxChars <= 0) throw new Error('maxChars must be > 0')
  if (overlap < 0 || overlap >= maxChars) {
    throw new Error('overlap must be >= 0 and < maxChars')
  }

  const trimmed = text.trim()
  if (trimmed.length === 0) return []
  if (trimmed.length <= maxChars) return [trimmed]

  const chunks: string[] = []
  let start = 0
  const stride = maxChars - overlap
  while (start < trimmed.length) {
    const end = Math.min(start + maxChars, trimmed.length)
    chunks.push(trimmed.slice(start, end))
    if (end >= trimmed.length) break
    start += stride
  }
  return chunks
}
