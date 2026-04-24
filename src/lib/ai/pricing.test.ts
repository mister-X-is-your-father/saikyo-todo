import { describe, expect, it } from 'vitest'

import { calculateCostUsd } from './pricing'

describe('calculateCostUsd', () => {
  it('haiku の input/output のみ', () => {
    const cost = calculateCostUsd('claude-haiku-4-5', { inputTokens: 1_000_000, outputTokens: 0 })
    expect(cost).toBe(1.0)
  })

  it('haiku の output も乗る', () => {
    const cost = calculateCostUsd('claude-haiku-4-5', {
      inputTokens: 100_000,
      outputTokens: 200_000,
    })
    // 0.1 + (0.2 * 5) = 0.1 + 1.0 = 1.1
    expect(cost).toBe(1.1)
  })

  it('cache read / write も加算される', () => {
    const cost = calculateCostUsd('claude-sonnet-4-6', {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheCreationTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
    })
    // 3 + 15 + 3.75 + 0.3 = 22.05
    expect(cost).toBeCloseTo(22.05, 6)
  })

  it('不明モデルは 0', () => {
    expect(calculateCostUsd('unknown-model', { inputTokens: 999_999, outputTokens: 999_999 })).toBe(
      0,
    )
  })

  it('小数 6 桁で丸める', () => {
    const cost = calculateCostUsd('claude-haiku-4-5', { inputTokens: 1, outputTokens: 1 })
    // (1/1M) * 1 + (1/1M) * 5 = 0.000001 + 0.000005 = 0.000006
    expect(cost).toBe(0.000006)
  })

  it('cacheCreation/Read が null でも落ちない', () => {
    const cost = calculateCostUsd('claude-haiku-4-5', {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationTokens: null,
      cacheReadTokens: null,
    })
    expect(cost).toBe(1.0)
  })
})
