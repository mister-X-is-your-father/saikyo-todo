import { describe, expect, it } from 'vitest'

import { assessIoCompleteness, formatIoCompletenessJa, ioCompletenessTone } from './io-completeness'

describe('assessIoCompleteness', () => {
  it('全定義 → score 3 / complete', () => {
    const c = assessIoCompleteness({ hasGoal: true, inputCount: 2, outputCount: 1 })
    expect(c).toEqual({ score: 3, missing: [], complete: true })
  })

  it('一部未定義 → missing に列挙', () => {
    const c = assessIoCompleteness({ hasGoal: true, inputCount: 0, outputCount: 0 })
    expect(c.score).toBe(1)
    expect(c.missing).toEqual(['インプット', 'アウトプット'])
    expect(c.complete).toBe(false)
  })

  it('全未定義 → score 0', () => {
    const c = assessIoCompleteness({ hasGoal: false, inputCount: 0, outputCount: 0 })
    expect(c.score).toBe(0)
    expect(c.missing).toEqual(['ゴール', 'インプット', 'アウトプット'])
  })

  it('missing は ゴール → インプット → アウトプット 順', () => {
    const c = assessIoCompleteness({ hasGoal: false, inputCount: 0, outputCount: 5 })
    expect(c.missing).toEqual(['ゴール', 'インプット'])
  })
})

describe('formatIoCompletenessJa', () => {
  it('完備', () => {
    expect(
      formatIoCompletenessJa(
        assessIoCompleteness({ hasGoal: true, inputCount: 1, outputCount: 1 }),
      ),
    ).toBe('I/O 定義 完備 (3/3)')
  })
  it('一部', () => {
    expect(
      formatIoCompletenessJa(
        assessIoCompleteness({ hasGoal: true, inputCount: 1, outputCount: 0 }),
      ),
    ).toBe('I/O 定義 2/3 (未: アウトプット)')
  })
  it('全未定義', () => {
    expect(
      formatIoCompletenessJa(
        assessIoCompleteness({ hasGoal: false, inputCount: 0, outputCount: 0 }),
      ),
    ).toBe('I/O 未定義 (0/3)')
  })
})

describe('ioCompletenessTone', () => {
  it('完備 ok / 一部 warn / 全未定義 danger', () => {
    expect(
      ioCompletenessTone(assessIoCompleteness({ hasGoal: true, inputCount: 1, outputCount: 1 })),
    ).toBe('ok')
    expect(
      ioCompletenessTone(assessIoCompleteness({ hasGoal: true, inputCount: 0, outputCount: 1 })),
    ).toBe('warn')
    expect(
      ioCompletenessTone(assessIoCompleteness({ hasGoal: false, inputCount: 0, outputCount: 0 })),
    ).toBe('danger')
  })
})
