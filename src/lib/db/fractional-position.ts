/**
 * Items などの並び順を扱う fractional-indexing の薄いラッパ。
 * `items.position` は text 型で、`fractional-indexing` の base62 文字列を保持する。
 *
 * API:
 *   - `positionBetween(prev, next)` — 2 つの隣接 position の間の新 position を返す
 *   - `positionsBetween(prev, next, n)` — n 個一気に生成 (bulk reorder 用)
 *
 * 契約:
 *   - prev == null: 先頭挿入 (next の前)
 *   - next == null: 末尾追加 (prev の後)
 *   - 両方 null: 初 item (= 'a0')
 *   - prev >= next: 呼び出し側のバグ (throw)
 */
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

/** items.position 初期値 (新規作成時のデフォルト、column default と一致)。 */
export const INITIAL_POSITION = 'a0'

export function positionBetween(prev: string | null, next: string | null): string {
  return generateKeyBetween(prev, next)
}

export function positionsBetween(prev: string | null, next: string | null, n: number): string[] {
  return generateNKeysBetween(prev, next, n)
}
