/**
 * iter661 refactor: JSON Textarea (graph / trigger 等) の動的 aria-label を集約する pure helper。
 *
 * char-count helper (iter652) / date-range helper (iter655) と並ぶ a11y/ helper の第 3 弾。
 * JSON parse error をユーザに即時知らせる目的で 3-state aria-label を出している
 * callsite が workflows-panel に 2 件あり (graph JSON / trigger JSON)、shape が
 * 完全に同一だったため pure helper に集約。char-count とは違い「文字数のみ
 * (max 表示なし)」 / 「parse error flag は caller 側で計算済」 という構造。
 *
 * shape:
 *   1. value 空: emptyLabel をそのまま返す (placeholder/hint)
 *   2. isParseError: `<fieldName> (現在 N 文字、JSON parse error あり)`
 *   3. valid: `<fieldName> (現在 N 文字、<filledSuffix>)`
 */

export interface JsonTextareaAriaInput {
  /** value が空の時に返すラベル全体 (例: 「graph JSON (workflow の node 定義を JSON で記述、...)」) */
  emptyLabel: string
  /** filled state の prefix (= 「graph JSON」 / 「trigger JSON」) */
  fieldName: string
  value: string
  /** caller が JSON.parse 試行 (or zod parse 結果) で計算した結果。helper は判定責任なし。 */
  isParseError: boolean
  /** 通常 filled 時、文字数の後ろに append する suffix (例: 「node 定義 JSON」 / 「起動条件 JSON」) */
  filledSuffix: string
}

export function buildJsonTextareaAria(input: JsonTextareaAriaInput): string {
  if (input.value.length === 0) return input.emptyLabel
  if (input.isParseError) {
    return `${input.fieldName} (現在 ${input.value.length} 文字、JSON parse error あり)`
  }
  return `${input.fieldName} (現在 ${input.value.length} 文字、${input.filledSuffix})`
}
