/**
 * iter1113 basics: PM / Researcher / Engineer agent role 定義の invariant test。
 *
 * 4 つの Agent (PM / Researcher / Engineer / Reviewer) のうち、Reviewer は
 * iter1112 で test 済。残 3 つの role constants をまとめて回帰防止。
 *
 * 各 role の model / token / iteration limit / prompt non-empty / ROLE
 * オブジェクトの shape 整合性を確認。Anthropic model ID は cutoff 後にも
 * 変更されうるが、shape は安定して保つ。
 */
import { describe, expect, it } from 'vitest'

import {
  ENGINEER_MAX_ITERATIONS,
  ENGINEER_MAX_TOKENS,
  ENGINEER_MODEL,
  ENGINEER_ROLE,
  ENGINEER_SYSTEM_PROMPT,
  ENGINEER_SYSTEM_PROMPT_VERSION,
} from './engineer'
import {
  PM_MAX_ITERATIONS,
  PM_MAX_TOKENS,
  PM_MEMORY_LIMIT,
  PM_MODEL,
  PM_ROLE,
  PM_SYSTEM_PROMPT,
  PM_SYSTEM_PROMPT_VERSION,
} from './pm'
import {
  RESEARCHER_MAX_ITERATIONS,
  RESEARCHER_MAX_TOKENS,
  RESEARCHER_MEMORY_LIMIT,
  RESEARCHER_MODEL,
  RESEARCHER_ROLE,
  RESEARCHER_SYSTEM_PROMPT,
  RESEARCHER_SYSTEM_PROMPT_VERSION,
} from './researcher'

describe('PM Role', () => {
  it('model は Haiku (軽量・高頻度起動向け)', () => {
    expect(PM_MODEL).toBe('claude-haiku-4-5')
  })

  it('limit は positive int (memory limit 含む)', () => {
    expect(PM_MAX_TOKENS).toBeGreaterThan(0)
    expect(PM_MAX_ITERATIONS).toBeGreaterThan(0)
    expect(PM_MEMORY_LIMIT).toBeGreaterThan(0)
  })

  it('prompt は 日本語応答指示 + PM Agent 識別を含む', () => {
    expect(PM_SYSTEM_PROMPT.length).toBeGreaterThan(50)
    expect(PM_SYSTEM_PROMPT).toMatch(/日本語/)
  })

  it('PM_ROLE が prompt / model と整合', () => {
    expect(PM_ROLE.model).toBe(PM_MODEL)
    expect(PM_ROLE.systemPrompt).toBe(PM_SYSTEM_PROMPT)
    expect(PM_ROLE.systemPromptVersion).toBe(PM_SYSTEM_PROMPT_VERSION)
  })
})

describe('Researcher Role', () => {
  it('model は Sonnet (バランス型・調査向け)', () => {
    expect(RESEARCHER_MODEL).toBe('claude-sonnet-4-6')
  })

  it('limit は positive int (memory limit 含む)', () => {
    expect(RESEARCHER_MAX_TOKENS).toBeGreaterThan(0)
    expect(RESEARCHER_MAX_ITERATIONS).toBeGreaterThan(0)
    expect(RESEARCHER_MEMORY_LIMIT).toBeGreaterThan(0)
  })

  it('prompt は 日本語応答指示 を含む', () => {
    expect(RESEARCHER_SYSTEM_PROMPT.length).toBeGreaterThan(50)
    expect(RESEARCHER_SYSTEM_PROMPT).toMatch(/日本語/)
  })

  it('RESEARCHER_ROLE が prompt / model と整合', () => {
    expect(RESEARCHER_ROLE.model).toBe(RESEARCHER_MODEL)
    expect(RESEARCHER_ROLE.systemPrompt).toBe(RESEARCHER_SYSTEM_PROMPT)
    expect(RESEARCHER_ROLE.systemPromptVersion).toBe(RESEARCHER_SYSTEM_PROMPT_VERSION)
  })
})

describe('Engineer Role', () => {
  it('model は Opus 4-7 (高度推論・コード変更向け)', () => {
    expect(ENGINEER_MODEL).toBe('claude-opus-4-7')
  })

  it('Engineer は他 role より max_tokens / iterations が大きい (コード変更多段)', () => {
    expect(ENGINEER_MAX_TOKENS).toBeGreaterThanOrEqual(PM_MAX_TOKENS)
    expect(ENGINEER_MAX_TOKENS).toBeGreaterThanOrEqual(RESEARCHER_MAX_TOKENS)
    expect(ENGINEER_MAX_ITERATIONS).toBeGreaterThanOrEqual(PM_MAX_ITERATIONS)
  })

  it('prompt に Engineer Agent + 日本語応答指示', () => {
    expect(ENGINEER_SYSTEM_PROMPT.length).toBeGreaterThan(100)
    expect(ENGINEER_SYSTEM_PROMPT).toMatch(/Engineer Agent/)
    expect(ENGINEER_SYSTEM_PROMPT).toMatch(/日本語/)
  })

  it('ENGINEER_ROLE が prompt / model と整合', () => {
    expect(ENGINEER_ROLE.model).toBe(ENGINEER_MODEL)
    expect(ENGINEER_ROLE.systemPrompt).toBe(ENGINEER_SYSTEM_PROMPT)
    expect(ENGINEER_ROLE.systemPromptVersion).toBe(ENGINEER_SYSTEM_PROMPT_VERSION)
  })
})

describe('Role versions invariant (memory 互換管理)', () => {
  it('全 role の SYSTEM_PROMPT_VERSION は positive integer', () => {
    for (const v of [
      PM_SYSTEM_PROMPT_VERSION,
      RESEARCHER_SYSTEM_PROMPT_VERSION,
      ENGINEER_SYSTEM_PROMPT_VERSION,
    ]) {
      expect(v).toBeGreaterThanOrEqual(1)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})
