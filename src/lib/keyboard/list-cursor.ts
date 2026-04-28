/**
 * リスト行のキーボードカーソル移動を計算する純粋関数。
 *
 * Today / Inbox / Backlog 等で `j`/`k` (or 矢印) で選択行を上下に動かす
 * Vim / TickTick 風 UX のためのコア。React に依存しない pure 関数なので
 * vitest 単体で挙動を担保できる。
 *
 * 仕様:
 *   - 空配列  → null
 *   - currentId === null
 *       direction='down' → 先頭の id
 *       direction='up'   → 末尾の id
 *   - currentId が見つからない (stale) → 先頭にリセット
 *   - currentId が末尾で 'down' → 末尾のまま (clamp、wrap しない)
 *   - currentId が先頭で 'up'   → 先頭のまま (clamp、wrap しない)
 *
 * 例:
 *   moveCursor([{id:'a'},{id:'b'},{id:'c'}], null, 'down') === 'a'
 *   moveCursor([{id:'a'},{id:'b'},{id:'c'}], 'b',  'down') === 'c'
 *   moveCursor([{id:'a'},{id:'b'},{id:'c'}], 'c',  'down') === 'c'
 */
export function moveCursor<T extends { id: string }>(
  items: readonly T[],
  currentId: string | null,
  direction: 'up' | 'down',
): string | null {
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return null
  if (currentId == null) {
    return direction === 'down' ? first.id : last.id
  }
  const idx = items.findIndex((i) => i.id === currentId)
  if (idx === -1) return first.id
  const next =
    direction === 'down' ? items[Math.min(idx + 1, items.length - 1)] : items[Math.max(idx - 1, 0)]
  return next ? next.id : first.id
}
