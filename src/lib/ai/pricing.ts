/**
 * Anthropic モデルのコスト計算 (USD per 1M tokens)。
 *
 * pricing は外部依存 (公式価格表) なので、モデル増設や価格改定時はここだけ直す。
 * 不明モデルは 0 を返す (落とさず、agent_invocations.cost_usd=0 で記録)。
 */

export interface ModelPrice {
  /** input (uncached) tokens, USD per 1M */
  input: number
  /** output tokens, USD per 1M */
  output: number
  /** cache write (ephemeral creation) tokens, USD per 1M */
  cacheWrite: number
  /** cache read (ephemeral hit) tokens, USD per 1M */
  cacheRead: number
}

/** 2026-04 現在の参考価格。ずれたら都度更新。 */
export const MODEL_PRICING: Record<string, ModelPrice> = {
  'claude-haiku-4-5': { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-opus-4-7': { input: 15.0, output: 75.0, cacheWrite: 18.75, cacheRead: 1.5 },
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens?: number | null
  cacheReadTokens?: number | null
}

/** USD, 小数 6 桁で丸める。numeric(10,6) カラムに合わせた精度。 */
export function calculateCostUsd(model: string, usage: TokenUsage): number {
  const p = MODEL_PRICING[model]
  if (!p) return 0
  const cost =
    (usage.inputTokens / 1_000_000) * p.input +
    (usage.outputTokens / 1_000_000) * p.output +
    ((usage.cacheCreationTokens ?? 0) / 1_000_000) * p.cacheWrite +
    ((usage.cacheReadTokens ?? 0) / 1_000_000) * p.cacheRead
  return Math.round(cost * 1_000_000) / 1_000_000
}
