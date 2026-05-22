/**
 * iter1098 basics: `agent/schema.ts` の zod schema test を追加。
 *
 * Agent 系 invocation 入口の 3 schema (AgentRole / AppendMemory / Enqueue) と
 * Anthropic Messages API 形 InvocationPromptSchema。role enum + memory role enum
 * + maxTokens 16k 上限 + messages min 1 + content non-empty を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  AGENT_MEMORY_ROLES,
  AGENT_ROLES,
  AgentMemoryRoleSchema,
  AgentRoleSchema,
  AppendMemoryInputSchema,
  EnqueueInvocationInputSchema,
  InvocationPromptSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('AgentRoleSchema', () => {
  it('全 AGENT_ROLES を accept', () => {
    for (const r of AGENT_ROLES) {
      expect(AgentRoleSchema.parse(r)).toBe(r)
    }
  })

  it('未知 role を reject', () => {
    expect(() => AgentRoleSchema.parse('writer')).toThrow()
  })

  it('AGENT_ROLES に MVP 4 役割 (pm/researcher/engineer/reviewer)', () => {
    expect(AGENT_ROLES).toContain('pm')
    expect(AGENT_ROLES).toContain('researcher')
    expect(AGENT_ROLES).toContain('engineer')
    expect(AGENT_ROLES).toContain('reviewer')
  })
})

describe('AgentMemoryRoleSchema', () => {
  it('全 AGENT_MEMORY_ROLES を accept', () => {
    for (const r of AGENT_MEMORY_ROLES) {
      expect(AgentMemoryRoleSchema.parse(r)).toBe(r)
    }
  })

  it('Anthropic Messages role と中間表現の対応', () => {
    expect(AGENT_MEMORY_ROLES).toContain('user')
    expect(AGENT_MEMORY_ROLES).toContain('assistant')
    expect(AGENT_MEMORY_ROLES).toContain('tool_call')
    expect(AGENT_MEMORY_ROLES).toContain('tool_result')
  })
})

describe('AppendMemoryInputSchema', () => {
  it('正常入力を accept', () => {
    expect(() =>
      AppendMemoryInputSchema.parse({
        agentId: VALID_UUID,
        role: 'user',
        content: 'hello',
      }),
    ).not.toThrow()
  })

  it('toolCalls は unknown / null / 省略可', () => {
    expect(() =>
      AppendMemoryInputSchema.parse({
        agentId: VALID_UUID,
        role: 'tool_call',
        content: '',
        toolCalls: { name: 'read_item', args: {} },
      }),
    ).not.toThrow()
  })

  it('agentId が UUID でないと reject', () => {
    expect(() =>
      AppendMemoryInputSchema.parse({ agentId: 'bad', role: 'user', content: 'x' }),
    ).toThrow()
  })

  it('role enum 外を reject', () => {
    expect(() =>
      AppendMemoryInputSchema.parse({ agentId: VALID_UUID, role: 'system', content: 'x' }),
    ).toThrow()
  })
})

describe('InvocationPromptSchema', () => {
  it('messages 1 件以上 + system 省略可', () => {
    expect(() =>
      InvocationPromptSchema.parse({
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).not.toThrow()
  })

  it('messages 0 件で reject', () => {
    expect(() => InvocationPromptSchema.parse({ messages: [] })).toThrow()
  })

  it('messages 内 content 空文字で reject (min 1)', () => {
    expect(() =>
      InvocationPromptSchema.parse({
        messages: [{ role: 'user', content: '' }],
      }),
    ).toThrow()
  })

  it('messages role enum 外を reject (user/assistant のみ)', () => {
    expect(() =>
      InvocationPromptSchema.parse({
        messages: [{ role: 'system', content: 'x' }],
      }),
    ).toThrow()
  })

  it('maxTokens 16384 超過で reject', () => {
    expect(() =>
      InvocationPromptSchema.parse({
        messages: [{ role: 'user', content: 'x' }],
        maxTokens: 16385,
      }),
    ).toThrow()
    // 境界 OK
    expect(() =>
      InvocationPromptSchema.parse({
        messages: [{ role: 'user', content: 'x' }],
        maxTokens: 16384,
      }),
    ).not.toThrow()
  })
})

describe('EnqueueInvocationInputSchema', () => {
  const baseValid = {
    workspaceId: VALID_UUID,
    role: 'pm' as const,
    model: 'claude-haiku-4-5',
    prompt: { messages: [{ role: 'user' as const, content: 'go' }] },
    idempotencyKey: VALID_UUID,
  }

  it('正常入力を accept (targetItemId 省略可)', () => {
    expect(() => EnqueueInvocationInputSchema.parse(baseValid)).not.toThrow()
  })

  it('model 空文字を reject', () => {
    expect(() => EnqueueInvocationInputSchema.parse({ ...baseValid, model: '' })).toThrow()
  })
})
