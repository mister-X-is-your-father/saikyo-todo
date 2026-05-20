import { describe, expect, it } from 'vitest'

import {
  classifyConsultationStatus,
  type ConsultationOption,
  consultationStatusSeverity,
  type ConsultationVote,
  formatConsultationStatusJa,
  tallyConsultation,
} from './consultation-tally'

const options: ConsultationOption[] = [
  { index: 0, label: 'A 案: 新規開発' },
  { index: 1, label: 'B 案: 既存改修' },
  { index: 2, label: 'C 案: 様子見' },
]

const T1 = new Date('2026-05-19T09:00:00Z')
const T2 = new Date('2026-05-19T10:00:00Z')

describe('tallyConsultation', () => {
  it('vote 無し → 全 0', () => {
    const r = tallyConsultation(options, [])
    expect(r.totalVotes).toBe(0)
    expect(r.topIndex).toBeNull()
    expect(r.rows.every((row) => row.voteCount === 0)).toBe(true)
  })

  it('単純投票: 3 票 / 0 / 0 → 0 が leading', () => {
    const votes: ConsultationVote[] = [
      { optionIndex: 0, userId: 'alice', votedAt: T1 },
      { optionIndex: 0, userId: 'bob', votedAt: T1 },
      { optionIndex: 0, userId: 'carol', votedAt: T1 },
    ]
    const r = tallyConsultation(options, votes)
    expect(r.totalVotes).toBe(3)
    expect(r.topIndex).toBe(0)
    expect(r.rows[0]?.isLeading).toBe(true)
    expect(r.rows[1]?.isLeading).toBe(false)
    expect(r.rows[0]?.voters).toEqual(['alice', 'bob', 'carol'])
    expect(r.rows[0]?.ratio).toBe(1)
  })

  it('同 user 重複投票 → 最新だけ採用', () => {
    const votes: ConsultationVote[] = [
      { optionIndex: 0, userId: 'alice', votedAt: T1 },
      { optionIndex: 1, userId: 'alice', votedAt: T2 }, // alice の最新は 1
    ]
    const r = tallyConsultation(options, votes)
    expect(r.totalVotes).toBe(1)
    expect(r.uniqueVoters).toBe(1)
    expect(r.rows[0]?.voteCount).toBe(0)
    expect(r.rows[1]?.voteCount).toBe(1)
    expect(r.topIndex).toBe(1)
  })

  it('tie: 1 票 / 1 票 / 0 → 両方 leading、topIndex は最初の', () => {
    const votes: ConsultationVote[] = [
      { optionIndex: 0, userId: 'alice', votedAt: T1 },
      { optionIndex: 1, userId: 'bob', votedAt: T1 },
    ]
    const r = tallyConsultation(options, votes)
    expect(r.rows[0]?.isLeading).toBe(true)
    expect(r.rows[1]?.isLeading).toBe(true)
    expect(r.rows[2]?.isLeading).toBe(false)
    expect(r.topIndex).toBe(0) // 最初の leading
  })

  it('ratio が比率になる', () => {
    const votes: ConsultationVote[] = [
      { optionIndex: 0, userId: 'a', votedAt: T1 },
      { optionIndex: 0, userId: 'b', votedAt: T1 },
      { optionIndex: 1, userId: 'c', votedAt: T1 },
      { optionIndex: 2, userId: 'd', votedAt: T1 },
    ]
    const r = tallyConsultation(options, votes)
    expect(r.rows[0]?.ratio).toBe(0.5)
    expect(r.rows[1]?.ratio).toBe(0.25)
    expect(r.rows[2]?.ratio).toBe(0.25)
  })
})

describe('classifyConsultationStatus', () => {
  const NOW = new Date('2026-05-19T12:00:00Z')

  it('decided → status=decided 最強', () => {
    expect(
      classifyConsultationStatus({
        deadline: new Date('2026-05-15T00:00:00Z'),
        decided: true,
        now: NOW,
      }),
    ).toBe('decided')
  })

  it('deadline 無し → open', () => {
    expect(classifyConsultationStatus({ deadline: null, decided: false, now: NOW })).toBe('open')
  })

  it('deadline 1 日超先 → open', () => {
    expect(
      classifyConsultationStatus({
        deadline: new Date('2026-05-25T12:00:00Z'),
        decided: false,
        now: NOW,
      }),
    ).toBe('open')
  })

  it('deadline 24h 以内 → closing-soon', () => {
    expect(
      classifyConsultationStatus({
        deadline: new Date('2026-05-19T20:00:00Z'),
        decided: false,
        now: NOW,
      }),
    ).toBe('closing-soon')
  })

  it('deadline 経過 + 未 decided → overdue', () => {
    expect(
      classifyConsultationStatus({
        deadline: new Date('2026-05-15T00:00:00Z'),
        decided: false,
        now: NOW,
      }),
    ).toBe('overdue')
  })
})

describe('consultationStatusSeverity (iter1028)', () => {
  it('decided → ok (緑、判断完了)', () => {
    expect(consultationStatusSeverity('decided')).toBe('ok')
  })

  it('open → info (青、受付中)', () => {
    expect(consultationStatusSeverity('open')).toBe('info')
  })

  it('closing-soon → warn (黄、締切間近)', () => {
    expect(consultationStatusSeverity('closing-soon')).toBe('warn')
  })

  it('overdue → danger (赤、判断漏れ)', () => {
    expect(consultationStatusSeverity('overdue')).toBe('danger')
  })
})

describe('formatConsultationStatusJa (iter1028)', () => {
  it('open → "受付中"', () => {
    expect(formatConsultationStatusJa('open')).toBe('受付中')
  })

  it('closing-soon → "締切間近"', () => {
    expect(formatConsultationStatusJa('closing-soon')).toBe('締切間近')
  })

  it('overdue → "判断漏れ"', () => {
    expect(formatConsultationStatusJa('overdue')).toBe('判断漏れ')
  })

  it('decided → "決定済"', () => {
    expect(formatConsultationStatusJa('decided')).toBe('決定済')
  })
})
