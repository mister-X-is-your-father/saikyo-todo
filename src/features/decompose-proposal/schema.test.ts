/**
 * iter682 chore: decompose-proposal schema (zod) の単体テスト。test 不在解消。
 *
 * AI 分解 staging proposal の Update / Accept / Reject / BulkAction input を直接
 * unit test。title 1-500 / description max 5000 / dod max 2000 + nullable / patch 空 reject。
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
  it('既知 status を accept', () => {
    expect(ProposalStatusSchema.parse('pending')).toBe('pending')
    expect(ProposalStatusSchema.parse('accepted')).toBe('accepted')
    expect(ProposalStatusSchema.parse('rejected')).toBe('rejected')
  })

  it('未知 status は reject', () => {
    expect(() => ProposalStatusSchema.parse('done')).toThrow()
  })
})

describe('UpdateProposalInputSchema', () => {
  it('patch.title で accept', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({ id: VALID_UUID, patch: { title: 'updated' } }),
    ).not.toThrow()
  })

  it('patch.description で accept', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({ id: VALID_UUID, patch: { description: 'desc' } }),
    ).not.toThrow()
  })

  it('patch.isMust = true で accept', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({ id: VALID_UUID, patch: { isMust: true } }),
    ).not.toThrow()
  })

  it('patch.dod null で accept (nullable)', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({ id: VALID_UUID, patch: { dod: null } }),
    ).not.toThrow()
  })

  it('patch 空 → reject (refine)', () => {
    expect(() => UpdateProposalInputSchema.parse({ id: VALID_UUID, patch: {} })).toThrow(
      /更新項目がありません/,
    )
  })

  it('title 501 文字 → reject', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({
        id: VALID_UUID,
        patch: { title: 'a'.repeat(501) },
      }),
    ).toThrow()
  })

  it('description 5001 文字 → reject', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({
        id: VALID_UUID,
        patch: { description: 'a'.repeat(5001) },
      }),
    ).toThrow()
  })

  it('dod 2001 文字 → reject', () => {
    expect(() =>
      UpdateProposalInputSchema.parse({
        id: VALID_UUID,
        patch: { dod: 'a'.repeat(2001) },
      }),
    ).toThrow()
  })
})

describe('AcceptProposalInputSchema / RejectProposalInputSchema', () => {
  it('Accept: valid uuid で accept', () => {
    expect(AcceptProposalInputSchema.parse({ id: VALID_UUID })).toEqual({ id: VALID_UUID })
  })

  it('Reject: valid uuid で accept', () => {
    expect(RejectProposalInputSchema.parse({ id: VALID_UUID })).toEqual({ id: VALID_UUID })
  })

  it('UUID 不正 → reject (Accept)', () => {
    expect(() => AcceptProposalInputSchema.parse({ id: 'bad' })).toThrow()
  })
})

describe('BulkProposalActionInputSchema', () => {
  it('valid parentItemId で accept', () => {
    expect(BulkProposalActionInputSchema.parse({ parentItemId: VALID_UUID })).toEqual({
      parentItemId: VALID_UUID,
    })
  })

  it('UUID 不正 → reject', () => {
    expect(() => BulkProposalActionInputSchema.parse({ parentItemId: 'bad' })).toThrow()
  })
})
