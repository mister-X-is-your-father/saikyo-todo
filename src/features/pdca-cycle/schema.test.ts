/**
 * iter1100 basics: `pdca-cycle/schema.ts` の zod schema test を追加。
 *
 * PDCA cycle 系 6 schema (Status / Role enum + Create/Update/Advance + LinkItem
 * + Unlink + List)。phase 5 (plan/do/check/act/closed) + role 2 (do/reference)
 * の enum 整合 + Update の「最低 1 件 patch」 refine + List の default を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  AdvancePdcaCyclePhaseInputSchema,
  CreatePdcaCycleInputSchema,
  LinkItemToCycleInputSchema,
  ListPdcaCyclesInputSchema,
  PdcaCycleItemRoleSchema,
  PdcaCycleStatusSchema,
  UnlinkItemFromCycleInputSchema,
  UpdatePdcaCycleInputSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('PdcaCycleStatusSchema (5 phase)', () => {
  it('plan / do / check / act / closed を accept', () => {
    expect(PdcaCycleStatusSchema.parse('plan')).toBe('plan')
    expect(PdcaCycleStatusSchema.parse('do')).toBe('do')
    expect(PdcaCycleStatusSchema.parse('check')).toBe('check')
    expect(PdcaCycleStatusSchema.parse('act')).toBe('act')
    expect(PdcaCycleStatusSchema.parse('closed')).toBe('closed')
  })

  it('未知 status を reject', () => {
    expect(() => PdcaCycleStatusSchema.parse('done')).toThrow()
    expect(() => PdcaCycleStatusSchema.parse('')).toThrow()
  })
})

describe('PdcaCycleItemRoleSchema', () => {
  it('do / reference を accept', () => {
    expect(PdcaCycleItemRoleSchema.parse('do')).toBe('do')
    expect(PdcaCycleItemRoleSchema.parse('reference')).toBe('reference')
  })
})

describe('CreatePdcaCycleInputSchema', () => {
  it('title のみ最小入力で accept (hypothesis / targetMetric / targetValue は default 空文字)', () => {
    const parsed = CreatePdcaCycleInputSchema.parse({
      workspaceId: VALID_UUID,
      title: 'Q2 release speed up',
    })
    expect(parsed.hypothesis).toBe('')
    expect(parsed.targetMetric).toBe('')
    expect(parsed.targetValue).toBe('')
  })

  it('title 空文字 / 200 文字超過で reject', () => {
    expect(() => CreatePdcaCycleInputSchema.parse({ workspaceId: VALID_UUID, title: '' })).toThrow()
    expect(() =>
      CreatePdcaCycleInputSchema.parse({
        workspaceId: VALID_UUID,
        title: 'x'.repeat(201),
      }),
    ).toThrow()
  })

  it('hypothesis 4000 文字超過で reject', () => {
    expect(() =>
      CreatePdcaCycleInputSchema.parse({
        workspaceId: VALID_UUID,
        title: 'x',
        hypothesis: 'x'.repeat(4001),
      }),
    ).toThrow()
  })
})

describe('UpdatePdcaCycleInputSchema', () => {
  it('title のみ patch で accept', () => {
    expect(() =>
      UpdatePdcaCycleInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { title: '新名' },
      }),
    ).not.toThrow()
  })

  it('checkFindings / actDecisions は 8000 文字まで', () => {
    expect(() =>
      UpdatePdcaCycleInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { checkFindings: 'x'.repeat(8001) },
      }),
    ).toThrow()
    expect(() =>
      UpdatePdcaCycleInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { actDecisions: 'x'.repeat(8000) },
      }),
    ).not.toThrow()
  })

  it('patch 空オブジェクトを reject (refine `keys > 0`)', () => {
    expect(() =>
      UpdatePdcaCycleInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: {},
      }),
    ).toThrow()
  })
})

describe('AdvancePdcaCyclePhaseInputSchema', () => {
  it('to=closed で accept', () => {
    expect(() =>
      AdvancePdcaCyclePhaseInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        to: 'closed',
      }),
    ).not.toThrow()
  })

  it('to 不正で reject', () => {
    expect(() =>
      AdvancePdcaCyclePhaseInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        to: 'finished',
      }),
    ).toThrow()
  })
})

describe('LinkItemToCycleInputSchema / UnlinkItemFromCycleInputSchema', () => {
  it('Link は role default=do, sortKey default=0', () => {
    const parsed = LinkItemToCycleInputSchema.parse({
      cycleId: VALID_UUID,
      itemId: VALID_UUID,
    })
    expect(parsed.role).toBe('do')
    expect(parsed.sortKey).toBe(0)
  })

  it('Unlink は cycleId + itemId のみ', () => {
    expect(
      UnlinkItemFromCycleInputSchema.parse({
        cycleId: VALID_UUID,
        itemId: VALID_UUID,
      }),
    ).toEqual({ cycleId: VALID_UUID, itemId: VALID_UUID })
  })
})

describe('ListPdcaCyclesInputSchema', () => {
  it('workspaceId のみで OK、limit default 50', () => {
    const parsed = ListPdcaCyclesInputSchema.parse({ workspaceId: VALID_UUID })
    expect(parsed.limit).toBe(50)
  })

  it('limit 200 超過で reject', () => {
    expect(() => ListPdcaCyclesInputSchema.parse({ workspaceId: VALID_UUID, limit: 201 })).toThrow()
  })

  it('status / ownerId フィルタは省略可', () => {
    expect(() =>
      ListPdcaCyclesInputSchema.parse({
        workspaceId: VALID_UUID,
        status: 'plan',
        ownerId: VALID_UUID,
      }),
    ).not.toThrow()
  })
})
