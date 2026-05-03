/**
 * iter655 refactor: date-range input の動的 aria-label を集約する pure helper。
 *
 * 開始日 / 終了日 の組で「片方が空 / 範囲不正 / 範囲有効」 の 3-state aria-label を
 * 出している callsite が 8+ 重複していたため (sprints create / sprints edit (曜日付き) /
 * goals dates / item-edit-dialog editStart + editDue) helper 化。
 *
 * shape:
 *   1. value 空: emptyLabel をそのまま返す
 *   2. isInvalid: `<fieldName> (現在: <valueDisplay>、<otherFieldName> <otherValue> より<後/前>で不正)`
 *      position='start' で 「より後で不正」、'end' で 「より前で不正」
 *   3. valid: `<fieldName> (現在: <valueDisplay>)`
 *
 * valueDisplay は default = value、sprint-edit 系のように曜日を併記する場合 caller が
 * "2024-01-01 (月)" 等 pre-format して渡す。
 */

export interface DateRangeAriaInput {
  /** value が空 ('') の時に返すラベル全体 */
  emptyLabel: string
  /** filled state の prefix (= 「Sprint 開始日」 / 「期限」 等) */
  fieldName: string
  /** ISO YYYY-MM-DD or '' (空) */
  value: string
  /** valueDisplay は default = value。曜日併記等は caller が pre-format。 */
  valueDisplay?: string
  /** 不正 message での相方の名前 (= 「終了日」 / 「開始日」 / 「期限」) */
  otherFieldName: string
  /** 相方の現在値 (ISO 文字列、不正 message に embed) */
  otherValue: string
  /**
   * 'start' = 「<other> より後で不正」、'end' = 「<other> より前で不正」 を出す。
   * 開始日 input は 'start' (= 自分が後にズレた)、終了日 input は 'end' (= 自分が前にズレた)。
   */
  position: 'start' | 'end'
  /** caller が isInvalidDateRange 等で計算した結果。helper は判定しない。 */
  isInvalid: boolean
}

export function buildDateRangeAria(input: DateRangeAriaInput): string {
  if (input.value === '') return input.emptyLabel

  const display = input.valueDisplay ?? input.value
  if (input.isInvalid) {
    const direction = input.position === 'start' ? '後' : '前'
    return `${input.fieldName} (現在: ${display}、${input.otherFieldName} ${input.otherValue} より${direction}で不正)`
  }
  return `${input.fieldName} (現在: ${display})`
}
