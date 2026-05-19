import { describe, expect, it } from 'vitest'

import { planAiReviewRequest } from './ai-review-request'

const base = {
  status: 'in_progress',
  dod: 'PR を merge して staging で動作確認',
  description: '本文 これは task の説明文です',
  hasPlan: false,
  hasPendingReview: false,
}

describe('planAiReviewRequest', () => {
  it('dod + description あれば ready', () => {
    const r = planAiReviewRequest(base)
    expect(r.status).toBe('ready')
    expect(r.actionable).toBe(true)
    expect(r.message).toContain('DoD')
    expect(r.message).toContain('説明')
  })

  it('hasPlan true なら Plan も review subject に', () => {
    const r = planAiReviewRequest({ ...base, hasPlan: true })
    expect(r.status).toBe('ready')
    expect(r.message).toContain('Plan')
  })

  it('done status → blocked-done', () => {
    const r = planAiReviewRequest({ ...base, status: 'done' })
    expect(r.status).toBe('blocked-done')
    expect(r.actionable).toBe(false)
    expect(r.message).toContain('完了済')
  })

  it('hasPendingReview true → duplicate', () => {
    const r = planAiReviewRequest({ ...base, hasPendingReview: true })
    expect(r.status).toBe('duplicate')
    expect(r.actionable).toBe(false)
    expect(r.message).toContain('pending')
  })

  it('dod / description が空 + plan 無 → blocked-empty', () => {
    const r = planAiReviewRequest({
      status: 'todo',
      dod: '',
      description: '',
      hasPlan: false,
      hasPendingReview: false,
    })
    expect(r.status).toBe('blocked-empty')
    expect(r.actionable).toBe(false)
  })

  it('dod / description が短すぎる (10 文字未満) + plan 無 → blocked-empty', () => {
    const r = planAiReviewRequest({
      status: 'todo',
      dod: '短い',
      description: '無',
      hasPlan: false,
      hasPendingReview: false,
    })
    expect(r.status).toBe('blocked-empty')
  })

  it('dod 短 + plan あり → ready (plan が素材として有効)', () => {
    const r = planAiReviewRequest({
      status: 'todo',
      dod: '短い',
      description: '',
      hasPlan: true,
      hasPendingReview: false,
    })
    expect(r.status).toBe('ready')
    expect(r.message).toContain('Plan')
    expect(r.message).not.toContain('DoD')
  })

  it('blocking 条件は done > duplicate > empty の優先順 (done が最強)', () => {
    const r = planAiReviewRequest({
      status: 'done',
      dod: '十分長い DoD があります',
      description: '',
      hasPlan: true,
      hasPendingReview: true,
    })
    expect(r.status).toBe('blocked-done')
  })

  it('duplicate は empty より優先', () => {
    const r = planAiReviewRequest({
      status: 'todo',
      dod: '',
      description: '',
      hasPlan: false,
      hasPendingReview: true,
    })
    expect(r.status).toBe('duplicate')
  })
})
