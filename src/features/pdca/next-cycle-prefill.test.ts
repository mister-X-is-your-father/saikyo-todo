import { describe, expect, it } from 'vitest'

import { buildNextCyclePrefill, nextTitle } from './next-cycle-prefill'

describe('nextTitle', () => {
  it('suffix 無し → (2) を付ける', () => {
    expect(nextTitle('Q2 改善')).toBe('Q2 改善 (2)')
  })
  it('(N) suffix → N+1', () => {
    expect(nextTitle('Q2 改善 (2)')).toBe('Q2 改善 (3)')
    expect(nextTitle('Q2 改善 (9)')).toBe('Q2 改善 (10)')
  })
  it('trailing space を吸収', () => {
    expect(nextTitle('Q2 改善 (2)  ')).toBe('Q2 改善 (3)')
  })
  it('base 無しの (N) のみ', () => {
    expect(nextTitle('(2)')).toBe('(3)')
  })
  it('空 title → サイクル (2)', () => {
    expect(nextTitle('')).toBe('サイクル (2)')
    expect(nextTitle('   ')).toBe('サイクル (2)')
  })
})

describe('buildNextCyclePrefill', () => {
  it('actDecisions 優先で hypothesis を導く', () => {
    const r = buildNextCyclePrefill({
      title: 'リリース速度改善',
      checkFindings: 'standup を昼に移したが効果薄',
      actDecisions: 'PR レビュー SLA を 4h に短縮する',
      targetMetric: '週次完了 item 数',
    })
    expect(r.title).toBe('リリース速度改善 (2)')
    expect(r.hypothesis).toBe(
      '前サイクル「リリース速度改善」の改善決定を踏まえて：\nPR レビュー SLA を 4h に短縮する',
    )
    expect(r.targetMetric).toBe('週次完了 item 数')
  })

  it('actDecisions 空なら checkFindings を踏まえる', () => {
    const r = buildNextCyclePrefill({
      title: 'リリース速度改善',
      checkFindings: 'レビュー待ちが boトルネック',
      actDecisions: '',
    })
    expect(r.hypothesis).toBe(
      '前サイクル「リリース速度改善」の学びを踏まえて：\nレビュー待ちが boトルネック',
    )
  })

  it('両方空なら最小の続き宣言 (空文字は返さない)', () => {
    const r = buildNextCyclePrefill({ title: 'リリース速度改善' })
    expect(r.hypothesis).toBe('前サイクル「リリース速度改善」の続きとして、次の仮説を立てる。')
    expect(r.hypothesis).not.toBe('')
  })

  it('targetMetric 未指定 → 空文字', () => {
    const r = buildNextCyclePrefill({ title: 'X', actDecisions: 'Y' })
    expect(r.targetMetric).toBe('')
  })

  it('前後空白を trim してから処理', () => {
    const r = buildNextCyclePrefill({
      title: '  改善 (2) ',
      actDecisions: '  決定A  ',
      targetMetric: '  lead time  ',
    })
    expect(r.title).toBe('改善 (3)')
    expect(r.hypothesis).toBe('前サイクル「改善 (2)」の改善決定を踏まえて：\n決定A')
    expect(r.targetMetric).toBe('lead time')
  })

  it('空 title でも前サイクル lead を出す', () => {
    const r = buildNextCyclePrefill({ title: '', actDecisions: 'Z' })
    expect(r.title).toBe('サイクル (2)')
    expect(r.hypothesis).toBe('前サイクルの改善決定を踏まえて：\nZ')
  })
})
