/**
 * iter1112 basics: `reviewer.ts` Reviewer Agent 定義の invariant test。
 *
 * Reviewer Agent (POST_MVP) は Engineer/Researcher/PM の出力を独立レビューする
 * meta-agent。system prompt + model 設定が壊れないことを回帰防止。`server-only`
 * import は vitest 設定で no-op shim される。
 */
import { describe, expect, it } from 'vitest'

import {
  REVIEWER_MAX_ITERATIONS,
  REVIEWER_MAX_TOKENS,
  REVIEWER_MEMORY_LIMIT,
  REVIEWER_MODEL,
  REVIEWER_ROLE,
  REVIEWER_SYSTEM_PROMPT,
  REVIEWER_SYSTEM_PROMPT_VERSION,
} from './reviewer'

describe('Reviewer role constants', () => {
  it('model は Claude Opus 4-7 (高度推論用)', () => {
    expect(REVIEWER_MODEL).toBe('claude-opus-4-7')
  })

  it('numeric limit が positive integer', () => {
    expect(REVIEWER_MAX_TOKENS).toBeGreaterThan(0)
    expect(Number.isInteger(REVIEWER_MAX_TOKENS)).toBe(true)
    expect(REVIEWER_MAX_ITERATIONS).toBeGreaterThan(0)
    expect(Number.isInteger(REVIEWER_MAX_ITERATIONS)).toBe(true)
    expect(REVIEWER_MEMORY_LIMIT).toBeGreaterThan(0)
    expect(Number.isInteger(REVIEWER_MEMORY_LIMIT)).toBe(true)
  })

  it('SYSTEM_PROMPT_VERSION は 1 以上の整数 (古い memory との互換管理)', () => {
    expect(REVIEWER_SYSTEM_PROMPT_VERSION).toBeGreaterThanOrEqual(1)
    expect(Number.isInteger(REVIEWER_SYSTEM_PROMPT_VERSION)).toBe(true)
  })

  it('SYSTEM_PROMPT は non-empty で日本語応答指示を含む', () => {
    expect(REVIEWER_SYSTEM_PROMPT.length).toBeGreaterThan(100)
    expect(REVIEWER_SYSTEM_PROMPT).toMatch(/日本語/)
    expect(REVIEWER_SYSTEM_PROMPT).toMatch(/Reviewer Agent/)
  })

  it('SYSTEM_PROMPT は approve / request_changes の判定指示を明示', () => {
    expect(REVIEWER_SYSTEM_PROMPT).toMatch(/approve/)
    expect(REVIEWER_SYSTEM_PROMPT).toMatch(/request_changes/)
  })

  it('REVIEWER_ROLE オブジェクトが constants と整合', () => {
    expect(REVIEWER_ROLE.role).toBe('reviewer')
    expect(REVIEWER_ROLE.model).toBe(REVIEWER_MODEL)
    expect(REVIEWER_ROLE.systemPrompt).toBe(REVIEWER_SYSTEM_PROMPT)
    expect(REVIEWER_ROLE.systemPromptVersion).toBe(REVIEWER_SYSTEM_PROMPT_VERSION)
    expect(REVIEWER_ROLE.maxTokens).toBe(REVIEWER_MAX_TOKENS)
    expect(REVIEWER_ROLE.maxIterations).toBe(REVIEWER_MAX_ITERATIONS)
    expect(REVIEWER_ROLE.memoryLimit).toBe(REVIEWER_MEMORY_LIMIT)
  })

  it('REVIEWER_ROLE.displayName は人間可読 (UI 表示用)', () => {
    expect(REVIEWER_ROLE.displayName).toBe('Reviewer Agent')
    expect(REVIEWER_ROLE.displayName.length).toBeGreaterThan(0)
  })
})
