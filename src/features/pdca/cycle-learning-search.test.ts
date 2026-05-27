import { describe, expect, it } from 'vitest'

import { type CycleLearningRecord, searchCycleLearnings } from './cycle-learning-search'

const CYCLES: CycleLearningRecord[] = [
  {
    id: 'c1',
    title: 'リリース速度改善',
    hypothesis: 'standup を昼にすると完了率が上がる',
    checkFindings: 'レビュー待ちがボトルネック',
    actDecisions: 'レビュー SLA を短縮',
  },
  {
    id: 'c2',
    title: 'レビュー文化の定着',
    hypothesis: 'ペアレビューで品質が上がる',
    actDecisions: 'レビュー チェックリスト導入',
  },
  {
    id: 'c3',
    title: 'オンボーディング改善',
    hypothesis: 'ドキュメント整備で立ち上がりが早くなる',
  },
]

describe('searchCycleLearnings', () => {
  it('空 query → 全件 (入力順、score 0)', () => {
    const r = searchCycleLearnings(CYCLES, '')
    expect(r).toHaveLength(3)
    expect(r.map((h) => h.record.id)).toEqual(['c1', 'c2', 'c3'])
    expect(r.every((h) => h.score === 0)).toBe(true)
  })

  it('空白のみ query → 全件扱い', () => {
    expect(searchCycleLearnings(CYCLES, '   ')).toHaveLength(3)
  })

  it('全フィールド横断でマッチ', () => {
    const r = searchCycleLearnings(CYCLES, 'レビュー')
    // c1 (checkFindings+actDecisions) と c2 (title+actDecisions)
    expect(r.map((h) => h.record.id).sort()).toEqual(['c1', 'c2'])
  })

  it('title マッチは weight 3 で上位', () => {
    // 'レビュー': c2 は title に含む (weight3) → c1 (本文 weight1 ×2) より上位のはず
    const r = searchCycleLearnings(CYCLES, 'レビュー')
    expect(r[0]!.record.id).toBe('c2')
    expect(r[0]!.matchedFields).toContain('title')
  })

  it('複数 token は AND (全 token を含む record のみ)', () => {
    // 'レビュー 完了' : c1 のみ (レビュー=本文, 完了=hypothesis)。c2 は完了を含まない
    const r = searchCycleLearnings(CYCLES, 'レビュー 完了')
    expect(r.map((h) => h.record.id)).toEqual(['c1'])
  })

  it('どの token も含まなければ hit しない', () => {
    expect(searchCycleLearnings(CYCLES, 'デプロイ')).toEqual([])
  })

  it('大文字小文字を無視', () => {
    const recs: CycleLearningRecord[] = [{ id: 'x', title: 'API レート制限' }]
    expect(searchCycleLearnings(recs, 'api')).toHaveLength(1)
  })

  it('matchedFields は出現フィールドのみ', () => {
    const r = searchCycleLearnings(CYCLES, 'standup')
    expect(r).toHaveLength(1)
    expect(r[0]!.matchedFields).toEqual(['hypothesis'])
  })
})
