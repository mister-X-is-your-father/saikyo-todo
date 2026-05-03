/**
 * iter652 refactor: 動的 aria-label の 3-state / 4-state pattern を集約する pure helper。
 *
 * iter614-iter651 で 53 input を「char-count + state-aware aria-label」 で
 * 統一する過程で、ほぼ同じ shape の三項分岐 (length === 0 / trim().===''
 * / length > nearMax / else) が 15+ 箇所に重複していた。今後新 input で
 * 同 pattern を再現する際の wording 揺れを防ぎ、helper test 1 本で全 callsite の
 * format invariant を保護できるよう、純関数化する。
 *
 * shape:
 *   1. value 空: emptyLabel をそのまま返す (placeholder 兼用の長文 hint)
 *   2. value が whitespace のみ (whitespaceOnlySuffix が指定されたとき): 「現在 N / max 文字、空白のみは不正」
 *   3. value.length > nearMax: 「現在 N / max 文字、上限近接<suffix>」
 *   4. else: 「現在 N / max 文字<suffix>」
 *
 * 既存 callsite の wording (= 「Cmd/Ctrl+Enter で投稿」 / 「上限近接」 / 「空白のみは不正」)
 * を厳密に再現するため、各 suffix を caller が独立して与えられる構造にした。
 */

export interface CharCountAriaInput {
  /** value が空の時に返すラベル全体。placeholder/hint を兼ねる長文を期待する。 */
  emptyLabel: string
  /** filled state の prefix (= field 名)。「現在 N / max」 の前に付く。 */
  fieldName: string
  value: string
  maxLength: number
  /**
   * 「上限近接」 を出す境界 (length > nearMaxAt で発火)。default は ceil(maxLength * 0.96)。
   * 既存 callsite が 480 / 90 / 9500 / 1900 / 280 / 3800 等 ad-hoc に決めているので
   * 明示指定を推奨。
   */
  nearMaxAt?: number
  /** 通常 filled 時、count の後ろに append する suffix。先頭に「、」 を含めるかは caller 任せ。 */
  filledSuffix?: string
  /** 上限近接時の suffix。省略時は filledSuffix を流用。 */
  nearMaxSuffix?: string
  /**
   * 指定すると value.trim() === '' で whitespace-only state に入る。
   * suffix は「空白のみは不正」 等。指定が undefined の場合 trim check を行わない。
   */
  whitespaceOnlySuffix?: string
}

export function buildCharCountAria(input: CharCountAriaInput): string {
  const len = input.value.length
  if (len === 0) return input.emptyLabel

  if (input.whitespaceOnlySuffix !== undefined && input.value.trim() === '') {
    return `${input.fieldName} (現在 ${len} / ${input.maxLength} 文字、${input.whitespaceOnlySuffix})`
  }

  const nearMax = input.nearMaxAt ?? Math.ceil(input.maxLength * 0.96)
  if (len > nearMax) {
    const suffix = input.nearMaxSuffix ?? input.filledSuffix ?? ''
    return `${input.fieldName} (現在 ${len} / ${input.maxLength} 文字、上限近接${suffix})`
  }
  return `${input.fieldName} (現在 ${len} / ${input.maxLength} 文字${input.filledSuffix ?? ''})`
}
