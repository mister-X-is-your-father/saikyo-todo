/**
 * SubtasksPanel から切り離した pure helper。
 *
 * `subtasks-panel.tsx` 自体は React + TanStack hooks (server-chained env を含む)
 * を import するため vitest 直接 import で env 検証が落ちる。helper を本 file
 * に分離することで pure 関数だけを単体テスト可能にする (workflows-panel と同パターン)。
 */

/**
 * 改行区切り bulk 入力 (`textarea`) からタスク title 配列を作る。
 *
 * - 各行を trim
 * - 空行 (trim 結果が空文字) を除外
 * - 先頭・末尾の空行も自然に消える
 *
 * UI 側で Button の disabled / aria-label の現在件数表示にも同じ関数を使う
 * ので、件数の見え方と実際の追加件数を必ず一致させる重要な不変条件を担う。
 */
export function parseBulkSubtaskTitles(text: string): string[] {
  return text
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}
