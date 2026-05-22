/**
 * iter1092 basics: `decompose-proposal/schema.ts` の zod schema test を追加。
 *
 * AI 分解 staging proposal の review action (update / accept / reject / bulk) は
 * decompose-proposals-panel の per-row + 上部 bulk button から呼ばれる。各 schema
 * の UUID / 範囲 + Update の「最低 1 件 patch」 refine を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  AcceptProposalInputSchema,
  BulkProposalActionInputSchema,
  ProposalStatusSchema,
  RejectProposalInputSchema,
  UpdateProposalInputSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('ProposalStatusSchema', () => {
  it('3 つの enum 値を accept', () => {
    expect(ProposalStatusSchema.parse('pending')).toBe('pending')
    expect(ProposalStatusSchema.parse('accepted')).toBe('accepted')
    expect(ProposalStatusSchema.parse('rejected')).toBe('rejected')
  })

  it('未知 status を reject', () => {
    expect(() => ProposalStatusSchema.parse('done')).toThrow()
    expect(() => ProposalStatusSchema.parse('')).toThrow()
  })
})

describe('UpdateProposalInputSchema', () => {
  it('title のみ patch でも OK', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({ id: VALID_UUID, patch: { title: '新タイトル' } }),
    ).not.toThrow()
  })

  it('isMust のみ patch でも OK', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({ id: VALID_UUID, patch: { isMust: true } }),
    ).not.toThrow()
  })

  it('dod は nullable (null 明示で「削除」 意図)', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({ id: VALID_UUID, patch: { dod: null } }),
    ).not.toThrow()
    expect(() =>
      UpdateProposalInputSchema.parse({ id: VALID_UUID, patch: { dod: '完了基準' } }),
    ).not.toThrow()
  })

  it('patch 空オブジェクトを reject (refine `keys > 0`)', () => {
    expect(() => UpdateProposalInputSchema.parse({ id: VALID_UUID, patch: {} })).toThrow()
  })

  it('title 500 文字超過 / description 5000 文字超過 / dod 2000 文字超過 で reject', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({
        id: VALID_UUID,
        patch: { title: 'x'.repeat(501) },
      }),
    ).toThrow()
    expect(() =>
      UpdateProposalInputSchema.parse({
        id: VALID_UUID,
        patch: { description: 'x'.repeat(5001) },
      }),
    ).toThrow()
    expect(() =>
      UpdateProposalInputSchema.parse({
        id: VALID_UUID,
        patch: { dod: 'x'.repeat(2001) },
      }),
    ).toThrow()
  })
})

describe('AcceptProposalInputSchema / RejectProposalInputSchema', () => {
  it('UUID id を accept', () => {
    expect(AcceptProposalInputSchema.parse({ id: VALID_UUID })).toEqual({ id: VALID_UUID })
    expect(RejectProposalInputSchema.parse({ id: VALID_UUID })).toEqual({ id: VALID_UUID })
  })

  it('UUID 形式 NG で reject', () => {
    expect(() => AcceptProposalInputSchema.parse({ id: 'bad' })).toThrow()
    expect(() => RejectProposalInputSchema.parse({ id: '123' })).toThrow()
  })
})

describe('BulkProposalActionInputSchema', () => {
  it('parentItemId UUID で accept', () => {
    expect(BulkProposalActionInputSchema.parse({ parentItemId: VALID_UUID })).toEqual({
      parentItemId: VALID_UUID,
    })
  })

  it('UUID 形式 NG で reject', () => {
    expect(() => BulkProposalActionInputSchema.parse({ parentItemId: 'bad' })).toThrow()
  })
})
