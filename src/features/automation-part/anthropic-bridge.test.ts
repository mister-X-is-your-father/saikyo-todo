/**
 * queue: AP-5 substrate — automation-part registry → Anthropic Tool builder の単体テスト。
 *
 * filter / name 変換 / description 結合 / input_schema 引継ぎ / 逆引きの 5 軸を検証。
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  buildAnthropicToolDefinitions,
  partIdToToolName,
  resolvePartIdFromToolName,
  toolNameToPartIdCandidate,
} from './anthropic-bridge'
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

const scheduleStart = definePart({
  id: 'schedule.start_timer',
  label: 'タイマー開始',
  description: 'item の実測タイマー開始',
  category: 'schedule' as const,
  sideEffect: 'write' as const,
  input: z.object({ itemId: z.string().uuid() }),
  output: z.object({ id: z.string() }),
  run: async () => ({ id: 'x' }),
})

describe('partIdToToolName / toolNameToPartIdCandidate', () => {
  it('dot は underscore に置換される (Anthropic name 制約)', () => {
    expect(partIdToToolName('item.create')).toBe('item_create')
    expect(partIdToToolName('schedule.start_timer')).toBe('schedule_start_timer')
  })

  it('逆引きは _ → . 全置換 (元の partId に戻る)', () => {
    expect(toolNameToPartIdCandidate('item_create')).toBe('item.create')
  })

  it('start_timer のように underscore 含む id は逆引きで非可逆 (registry 確認が必要)', () => {
    // schedule.start_timer → schedule_start_timer → schedule.start.timer (誤)
    // → registry 側で実 id 存在確認が必要、本 helper は候補生成のみ責任
    expect(toolNameToPartIdCandidate('schedule_start_timer')).toBe('schedule.start.timer')
  })
})

describe('resolvePartIdFromToolName (iter1376)', () => {
  it('dot 単純 id を解決', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    expect(resolvePartIdFromToolName('item_create')).toBe('item.create')
  })

  it('underscore 含む id を正しく解決 (候補逆変換が壊れるケース)', () => {
    _resetRegistryForTesting()
    registerPart(scheduleStart)
    // toolNameToPartIdCandidate では 'schedule.start.timer' (誤) になるが registry 解決は正しい
    expect(toolNameToPartIdCandidate('schedule_start_timer')).toBe('schedule.start.timer')
    expect(resolvePartIdFromToolName('schedule_start_timer')).toBe('schedule.start_timer')
  })

  it('未登録 tool name → undefined', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    expect(resolvePartIdFromToolName('nope_nope')).toBeUndefined()
  })
})

describe('buildAnthropicToolDefinitions', () => {
  it('label === description なら description を 1 個だけ出す (重複回避)', () => {
    _resetRegistryForTesting()
    registerPart(itemList)
    const tools = buildAnthropicToolDefinitions()
    expect(tools).toHaveLength(1)
    expect(tools[0]).toMatchObject({ name: 'item_list', description: 'item 一覧' })
  })

  it('label !== description なら "label — description" で結合', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    const tools = buildAnthropicToolDefinitions()
    expect(tools[0]).toMatchObject({
      name: 'item_create',
      description: 'item を作成 — workspace に新規 item を追加する',
    })
  })

  it('input_schema は zod → JSON Schema (type=object + properties + required)', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    const tools = buildAnthropicToolDefinitions()
    const tool = tools[0]!
    expect(tool.input_schema).toMatchObject({
      type: 'object',
      properties: { title: { type: 'string', minLength: 1 } },
      required: ['title'],
    })
  })

  it('filter で sideEffect=read のみに絞れる (write part 除外)', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    registerPart(itemList)
    registerPart(scheduleStart)
    const readOnly = buildAnthropicToolDefinitions({ sideEffect: 'read' })
    expect(readOnly.map((t) => t.name)).toEqual(['item_list'])
  })

  it('filter で category=schedule のみに絞れる', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    registerPart(scheduleStart)
    const scheduleOnly = buildAnthropicToolDefinitions({ category: 'schedule' })
    expect(scheduleOnly.map((t) => t.name)).toEqual(['schedule_start_timer'])
  })

  it('複数 part の name は sort 済 (id localeCompare 順)', () => {
    _resetRegistryForTesting()
    registerPart(scheduleStart)
    registerPart(itemCreate)
    registerPart(itemList)
    const tools = buildAnthropicToolDefinitions()
    expect(tools.map((t) => t.name)).toEqual(['item_create', 'item_list', 'schedule_start_timer'])
  })

  it('全 tool name は Anthropic 制約 ^[a-zA-Z0-9_-]{1,64}$ を満たす', () => {
    _resetRegistryForTesting()
    registerPart(itemCreate)
    registerPart(itemList)
    registerPart(scheduleStart)
    const tools = buildAnthropicToolDefinitions()
    const re = /^[a-zA-Z0-9_-]{1,64}$/
    for (const t of tools) {
      expect(t.name).toMatch(re)
    }
  })
})
