/**
 * iter309 ai-automation: comments_on_items を集計する pure helper。
 *
 * AI 朝 brief / 週次 retro Doc / pm-agent prompt が「最近 comment が活発な
 * item」を 1 関数で取り出せる substrate。今までは comment は item 単独画面
 * (ItemEditDialog の Comments tab) でしか見えず、workspace 全体の comment 活動
 * を AI に伝える経路が無かった。
 *
 * 仕様:
 *  - `groupCommentsByItem(comments)`: itemId → count の Map
 *  - `selectTopCommentedItems(comments, n, options?)`:
 *      itemId × 件数を降順で n 件取り出す。`since` (Date | string ISO) で日付
 *      フィルタ (createdAt >= since の comment のみ集計)。stable sort (元順)
 *  - `formatTopCommentedItemsSummary(entries, items?)`:
 *      `'活発 3 件: A (5 件) / B (3 件) / C (2 件)'` 形式。items map から title
 *      逆引き、欠落は `(無題: <itemId 先頭 8 文字>)`、0 件は `'活発 0 件 (該当なし)'`
 *
 * 不正 createdAt (null/undefined/不正) は集計から除外、since 不正も無視 (= 全件)。
 */

import { parseDateOrNull } from '@/lib/date/iso'

/** 集計に必要な最小 structural subset (CommentOnItem のサブセット)。 */
export interface CommentActivityEntry {
  itemId: string
  createdAt: Date | string | null | undefined
}

export interface CommentDensityEntry {
  itemId: string
  count: number
}

export interface SelectTopCommentedItemsOptions {
  /** ISO 文字列 or Date。これより古い comment は集計から除外 */
  since?: Date | string
}

/** itemId → count の Map (件数 0 の item は含まない)。 */
export function groupCommentsByItem(
  comments: readonly CommentActivityEntry[],
  options: SelectTopCommentedItemsOptions = {},
): Map<string, number> {
  const sinceDate =
    options.since instanceof Date
      ? options.since
      : typeof options.since === 'string'
        ? parseDateOrNull(options.since)
        : null
  const counts = new Map<string, number>()
  for (const c of comments) {
    if (!c?.itemId) continue
    if (sinceDate) {
      const created = parseDateOrNull(c.createdAt)
      if (!created || created < sinceDate) continue
    }
    counts.set(c.itemId, (counts.get(c.itemId) ?? 0) + 1)
  }
  return counts
}

/**
 * itemId × 件数を降順 (件数大 / 同件数は元順 stable) で n 件返す。
 * since 指定で日付フィルタ。n<=0 で空配列。
 */
export function selectTopCommentedItems(
  comments: readonly CommentActivityEntry[],
  n: number,
  options: SelectTopCommentedItemsOptions = {},
): CommentDensityEntry[] {
  if (n <= 0) return []
  const counts = groupCommentsByItem(comments, options)
  // Map の挿入順を保つために配列化、件数 desc + 同件数は挿入順 (= stable)
  const entries: CommentDensityEntry[] = []
  let index = 0
  const indexed: { entry: CommentDensityEntry; index: number }[] = []
  for (const [itemId, count] of counts) {
    indexed.push({ entry: { itemId, count }, index: index++ })
  }
  indexed.sort((a, b) => {
    if (b.entry.count !== a.entry.count) return b.entry.count - a.entry.count
    return a.index - b.index
  })
  for (const x of indexed.slice(0, n)) entries.push(x.entry)
  return entries
}

/**
 * AI prompt 用 1 行 summary。`itemTitles` から title 逆引き、欠落 (削除済 item
 * 等) は `(無題: <itemId 先頭 8 文字>)`。0 件は `'活発 0 件 (該当なし)'`。
 */
export function formatTopCommentedItemsSummary(
  entries: readonly CommentDensityEntry[],
  itemTitles: ReadonlyMap<string, string> = new Map(),
): string {
  if (entries.length === 0) return '活発 0 件 (該当なし)'
  const parts = entries.map((e) => {
    const title = itemTitles.get(e.itemId) ?? `(無題: ${e.itemId.slice(0, 8)})`
    return `${title} (${e.count} 件)`
  })
  return `活発 ${entries.length} 件: ${parts.join(' / ')}`
}
