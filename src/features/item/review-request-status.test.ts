import { describe, expect, it } from 'vitest'

import {
  formatReviewRequestSummaryJa,
  type ReviewRequestRow,
  reviewRequestTone,
  summarizeReviewRequests,
} from './review-request-status'

function rows(...statuses: ReviewRequestRow['status'][]): ReviewRequestRow[] {
  return statuses.map((status) => ({ status }))
}

describe('summarizeReviewRequests', () => {
  it('空 → 全 0 / hasOpen false / allApproved false', () => {
    const s = summarizeReviewRequests([])
    expect(s.total).toBe(0)
    expect(s.hasOpen).toBe(false)
    expect(s.allApproved).toBe(false)
  })

  it('status 別カウント', () => {
    const s = summarizeReviewRequests(rows('pending', 'approved', 'approved', 'changes_requested'))
    expect(s.total).toBe(4)
    expect(s.pending).toBe(1)
    expect(s.approved).toBe(2)
    expect(s.changesRequested).toBe(1)
  })

  it('hasOpen: pending か changes_requested があれば true', () => {
    expect(summarizeReviewRequests(rows('approved', 'pending')).hasOpen).toBe(true)
    expect(summarizeReviewRequests(rows('approved', 'changes_requested')).hasOpen).toBe(true)
    expect(summarizeReviewRequests(rows('approved', 'approved')).hasOpen).toBe(false)
  })

  it('allApproved: total>0 かつ全件 approved', () => {
    expect(summarizeReviewRequests(rows('approved', 'approved')).allApproved).toBe(true)
    expect(summarizeReviewRequests(rows('approved', 'pending')).allApproved).toBe(false)
    expect(summarizeReviewRequests([]).allApproved).toBe(false)
  })
})

describe('reviewRequestTone', () => {
  it('changes_requested 優先で danger', () => {
    expect(reviewRequestTone(summarizeReviewRequests(rows('pending', 'changes_requested')))).toBe(
      'danger',
    )
  })
  it('pending → warn', () => {
    expect(reviewRequestTone(summarizeReviewRequests(rows('approved', 'pending')))).toBe('warn')
  })
  it('全 approved → ok', () => {
    expect(reviewRequestTone(summarizeReviewRequests(rows('approved')))).toBe('ok')
  })
  it('依頼なし → idle', () => {
    expect(reviewRequestTone(summarizeReviewRequests([]))).toBe('idle')
  })
})

describe('formatReviewRequestSummaryJa', () => {
  it('依頼なし', () => {
    expect(formatReviewRequestSummaryJa(summarizeReviewRequests([]))).toBe('レビュー依頼なし')
  })
  it('全承認済', () => {
    expect(
      formatReviewRequestSummaryJa(summarizeReviewRequests(rows('approved', 'approved'))),
    ).toBe('全レビュー承認済 (2)')
  })
  it('混在 → breakdown', () => {
    expect(
      formatReviewRequestSummaryJa(
        summarizeReviewRequests(rows('approved', 'changes_requested', 'pending')),
      ),
    ).toBe('レビュー: 承認 1 / 要修正 1 / 待ち 1')
  })
})
