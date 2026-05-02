/**
 * queue: AP-6 substrate — automation-part registry → MCP Tool builder の単体テスト。
 *
 * Anthropic 版 (anthropic-bridge.test.ts) と挙動が一致することを保証する parity 試験
 * + MCP 固有の field 名 (inputSchema, not input_schema) を確認。
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { buildAnthropicToolDefinitions } from './anthropic-bridge'
import { buildMcpToolDefinitions } from './mcp-bridge'
import { _resetRegistryForTesting, registerPart } from './registry'
import { definePart } from './types'

const itemCreate = definePart({
  id: 'item.create',
  label: 'item を作成',
  description: 'workspace に新規 item を追加する',
  category: 'item' as const,
  sideEffect: 'write' as const,
  input: z.object({ title: z.string().min(1) }),
  output: z.object({ id: z.string() }),
  run: async () => ({ id: 'x' }),
})

const itemList = definePart({
  id: 'item.list',
  label: 'item 一覧',
  description: 'item 一覧',
  category: 'item' as const,
  sideEffect: 'read' as const,
  input: z.object({}),
  output: z.array(z.object({ id: z.string() })),
  run: async () => [],
})

describe('buildMcpToolDefinitions', () => {
  it('field 名は inputSchema (camelCase、Anthropic input_schema と異なる)', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    const tools = buildMcpToolDefinitions()
    expect(tools[0]).toHaveProperty('inputSchema')
    expect(tools[0]).not.toHaveProperty('input_schema')
  })

  it('inputSchema は zod → JSON Schema (type=object + properties + required)', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    const tools = buildMcpToolDefinitions()
    const tool = tools[0]!
    expect(tool.inputSchema).toMatchObject({
      type: 'object',
      properties: { title: { type: 'string', minLength: 1 } },
      required: ['title'],
    })
  })

  it('description / name は anthropic-bridge と parity (同 part 同 出力)', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    registerPart(itemList)
    const mcp = buildMcpToolDefinitions()
    const ant = buildAnthropicToolDefinitions()
    expect(mcp.map((t) => t.name)).toEqual(ant.map((t) => t.name))
    expect(mcp.map((t) => t.description)).toEqual(ant.map((t) => t.description))
  })

  it('label === description なら 1 個だけ (重複回避)', () => {
    _resetRegistryForTesting()
    registerPart(itemList)
    const tools = buildMcpToolDefinitions()
    expect(tools[0]).toMatchObject({ name: 'item_list', description: 'item 一覧' })
  })

  it('filter で sideEffect=read のみに絞れる (write part 除外)', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    registerPart(itemList)
    const readOnly = buildMcpToolDefinitions({ sideEffect: 'read' })
    expect(readOnly.map((t) => t.name)).toEqual(['item_list'])
  })

  it('全 tool name は MCP 制約 ^[a-zA-Z0-9_-]{1,64}$ を満たす', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    registerPart(itemList)
    const tools = buildMcpToolDefinitions()
    const re = /^[a-zA-Z0-9_-]{1,64}$/
    for (const t of tools) {
      expect(t.name).toMatch(re)
    }
  })
})
