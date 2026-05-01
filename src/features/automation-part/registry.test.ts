/**
 * queue: AP-1 substrate — registry の単体テスト (pure)。
 * part の実 run() は実 Supabase + service 経由なので別途 (AP-1 完了時に) integration test 検討。
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  _resetRegistryForTesting,
  buildPartManifest,
  buildPartManifestEntry,
  getPart,
  listParts,
  registerPart,
  requirePart,
} from './registry'
import { definePart } from './types'

const fakePart = definePart({
  id: 'test.fake',
  label: 'fake',
  description: 'test',
  category: 'item' as const,
  sideEffect: 'read' as const,
  input: z.object({ x: z.number() }),
  output: z.object({ y: z.number() }),
  run: async (input) => ({ y: input.x * 2 }),
})

describe('automation-part registry', () => {
  it('register + get で取れる', () => {
    _resetRegistryForTesting()
    registerPart(fakePart)
    const got = getPart('test.fake')
    expect(got).toBeDefined()
    expect(got?.id).toBe('test.fake')
  })

  it('同じ id を二度 register すると throw', () => {
    _resetRegistryForTesting()
    registerPart(fakePart)
    expect(() => registerPart(fakePart)).toThrow(/既に登録済/)
  })

  it('requirePart: 未登録は throw', () => {
    _resetRegistryForTesting()
    expect(() => requirePart('nope')).toThrow(/未登録/)
  })

  it('listParts: filter で絞り込める', () => {
    _resetRegistryForTesting()
    registerPart(fakePart)
    registerPart(
      definePart({
        id: 'test.write',
        label: 'w',
        description: '',
        category: 'item' as const,
        sideEffect: 'write' as const,
        input: z.object({}),
        output: z.object({}),
        run: async () => ({}),
      }),
    )
    expect(listParts({ sideEffect: 'read' }).map((p) => p.id)).toEqual(['test.fake'])
    expect(listParts({ sideEffect: 'write' }).map((p) => p.id)).toEqual(['test.write'])
    expect(listParts({ category: 'item' })).toHaveLength(2)
  })

  it('part.run: input → output が動く', async () => {
    _resetRegistryForTesting()
    registerPart(fakePart)
    const p = requirePart('test.fake')
    const out = await p.run(
      { x: 21 },
      { workspaceId: 'w', actorType: 'user', actorId: 'u', invokedFrom: 'direct' },
    )
    expect(out).toEqual({ y: 42 })
  })

  it('buildPartManifestEntry: zod schema → JSON Schema 込みの manifest', () => {
    _resetRegistryForTesting()
    registerPart(fakePart)
    const m = buildPartManifestEntry(fakePart)
    expect(m).toMatchObject({
      id: 'test.fake',
      label: 'fake',
      description: 'test',
      category: 'item',
      sideEffect: 'read',
    })
    // input: { x: number } → JSON Schema
    expect(m.inputJsonSchema).toMatchObject({
      type: 'object',
      properties: { x: { type: 'number' } },
      required: ['x'],
    })
    // output: { y: number } → JSON Schema
    expect(m.outputJsonSchema).toMatchObject({
      type: 'object',
      properties: { y: { type: 'number' } },
      required: ['y'],
    })
  })

  it('buildPartManifest: filter で絞込 + 全 part の manifest', () => {
    _resetRegistryForTesting()
    registerPart(fakePart)
    registerPart(
      definePart({
        id: 'test.write',
        label: 'w',
        description: '',
        category: 'schedule' as const,
        sideEffect: 'write' as const,
        input: z.object({}),
        output: z.object({}),
        run: async () => ({}),
      }),
    )
    const all = buildPartManifest()
    expect(all).toHaveLength(2)
    expect(all.map((m) => m.id).sort()).toEqual(['test.fake', 'test.write'])
    const writeOnly = buildPartManifest({ sideEffect: 'write' })
    expect(writeOnly.map((m) => m.id)).toEqual(['test.write'])
    const itemOnly = buildPartManifest({ category: 'item' })
    expect(itemOnly.map((m) => m.id)).toEqual(['test.fake'])
  })
})
