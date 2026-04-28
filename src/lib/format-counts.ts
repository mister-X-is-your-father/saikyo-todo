/**
 * iter300 refactor: 0 件 bucket を省略して 1 行 summary にする共通フォーマッタ。
 *
 * 同一 shape の format 関数が 4 callsite (status-visual / due-proximity /
 * priority / urgency) で重複していたので集約。caller は order 配列 + labels
 * Record だけ渡せば「`label1 N1 / label2 N2 / ...`」形式 (件数 0 省略) を得られる。
 *
 * 全部 pure。Record / array の参照のみで動く。
 */

export function formatNonZeroCounts<K extends string | number>(
  counts: Record<K, number>,
  order: readonly K[],
  labels: Record<K, string>,
  emptySentinel: string = '0 件',
): string {
  const parts: string[] = []
  for (const k of order) {
    const n = counts[k]
    if (n > 0) parts.push(`${labels[k]} ${n}`)
  }
  return parts.length === 0 ? emptySentinel : parts.join(' / ')
}
