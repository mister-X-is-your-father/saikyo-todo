import { describe, expect, it } from 'vitest'

import { uuidToLabel } from '@/lib/db/ltree-path'

import {
  formatDescendantsActivityHintJa,
  formatDescendantsProgressJa,
  summarizeDescendantsProgress,
} from './descendants-progress'

const NOW = new Date('2026-04-29T00:00:00Z')

const PARENT_ID = '00000000-0000-0000-0000-00000000aaaa'
const ROOT_OF_PARENT = ''
const PARENT_FULL = uuidToLabel(PARENT_ID)
const SIBLING_ID = '00000000-0000-0000-0000-00000000bbbb'
const SIBLING_FULL = uuidToLabel(SIBLING_ID)

const item = (overrides: {
  id?: string
  parentPath?: string
  status?: string | null
  deletedAt?: Date | null
}) => ({
  parentPath: overrides.parentPath ?? '',
  status: 'status' in overrides ? overrides.status : 'todo',
  deletedAt: overrides.deletedAt ?? null,
})

describe('summarizeDescendantsProgress', () => {
  it('子孫ゼロ → 全 0', () => {
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, [])
    expect(r).toEqual({
      total: 0,
      done: 0,
      inProgress: 0,
      blocked: 0,
      todo: 0,
      cancelled: 0,
      unknown: 0,
      pctDone: 0,
      isComplete: false,
    })
  })

  it('直下子のみ + 全 todo → pctDone=0', () => {
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, [
      item({ parentPath: PARENT_FULL, status: 'todo' }),
      item({ parentPath: PARENT_FULL, status: 'todo' }),
    ])
    expect(r.total).toBe(2)
    expect(r.todo).toBe(2)
    expect(r.pctDone).toBe(0)
    expect(r.isComplete).toBe(false)
  })

  it('done 6 / progress 2 / blocked 1 / todo 1 → pctDone=60% (6/10)', () => {
    const children = [
      ...Array.from({ length: 6 }, () => item({ parentPath: PARENT_FULL, status: 'done' })),
      ...Array.from({ length: 2 }, () => item({ parentPath: PARENT_FULL, status: 'in_progress' })),
      item({ parentPath: PARENT_FULL, status: 'blocked' }),
      item({ parentPath: PARENT_FULL, status: 'todo' }),
    ]
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, children)
    expect(r.total).toBe(10)
    expect(r.done).toBe(6)
    expect(r.inProgress).toBe(2)
    expect(r.blocked).toBe(1)
    expect(r.todo).toBe(1)
    expect(r.pctDone).toBe(60)
    expect(r.isComplete).toBe(false)
  })

  it('全 done → pctDone=100 / isComplete=true', () => {
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, [
      item({ parentPath: PARENT_FULL, status: 'done' }),
      item({ parentPath: PARENT_FULL, status: 'done' }),
    ])
    expect(r.pctDone).toBe(100)
    expect(r.isComplete).toBe(true)
  })

  it('cancelled は分母から除外、4 件中 cancelled 2 + done 2 → pctDone=100% (2/2)', () => {
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, [
      item({ parentPath: PARENT_FULL, status: 'done' }),
      item({ parentPath: PARENT_FULL, status: 'done' }),
      item({ parentPath: PARENT_FULL, status: 'cancelled' }),
      item({ parentPath: PARENT_FULL, status: 'cancelled' }),
    ])
    expect(r.total).toBe(4)
    expect(r.cancelled).toBe(2)
    expect(r.done).toBe(2)
    expect(r.pctDone).toBe(100)
    expect(r.isComplete).toBe(true)
  })

  it('全 cancelled → pctDone=0 / total>0 / isComplete=false', () => {
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, [
      item({ parentPath: PARENT_FULL, status: 'cancelled' }),
      item({ parentPath: PARENT_FULL, status: 'cancelled' }),
    ])
    expect(r.total).toBe(2)
    expect(r.cancelled).toBe(2)
    expect(r.pctDone).toBe(0)
    expect(r.isComplete).toBe(false)
  })

  it('孫タスクも集計に含める (parentPath が parentFull. で始まる)', () => {
    const grandchildPrefix = `${PARENT_FULL}.${uuidToLabel('00000000-0000-0000-0000-00000000cccc')}`
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, [
      item({ parentPath: PARENT_FULL, status: 'in_progress' }),
      item({ parentPath: grandchildPrefix, status: 'done' }),
      item({ parentPath: grandchildPrefix, status: 'todo' }),
    ])
    expect(r.total).toBe(3)
    expect(r.done).toBe(1)
    expect(r.inProgress).toBe(1)
    expect(r.todo).toBe(1)
    expect(r.pctDone).toBe(33) // 1/3
  })

  it('別 parent の sibling は含めない', () => {
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, [
      item({ parentPath: PARENT_FULL, status: 'done' }),
      item({ parentPath: SIBLING_FULL, status: 'todo' }), // 別 parent の子
      item({ parentPath: '', status: 'todo' }), // root 直下 (= parent の sibling)
    ])
    expect(r.total).toBe(1)
    expect(r.done).toBe(1)
  })

  it('deletedAt は除外', () => {
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, [
      item({ parentPath: PARENT_FULL, status: 'done' }),
      item({ parentPath: PARENT_FULL, status: 'todo', deletedAt: NOW }),
    ])
    expect(r.total).toBe(1)
    expect(r.done).toBe(1)
    expect(r.todo).toBe(0)
    expect(r.pctDone).toBe(100)
  })

  it('未知 status は unknown bucket に集約', () => {
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, [
      item({ parentPath: PARENT_FULL, status: 'reviewing' }),
      item({ parentPath: PARENT_FULL, status: null }),
    ])
    expect(r.total).toBe(2)
    expect(r.unknown).toBe(2)
    expect(r.pctDone).toBe(0) // done=0 / denom=2
  })

  it('parent 自身は含めない (= parent の parentPath は parentFull に等しくない)', () => {
    // parent の親子関係: parent.parentPath は ''、parent.id を含む item は無い
    const r = summarizeDescendantsProgress({ id: PARENT_ID, parentPath: ROOT_OF_PARENT }, [
      // parent 自身を装っても parentPath が PARENT_FULL ならそれは parent の子扱い
      // (= 想定通り)。逆に parentPath = '' で parent.id と同じ id の item があっても
      // それは parent と同じ root レベル兄弟なので除外される
      item({ parentPath: '', status: 'in_progress' }),
    ])
    expect(r.total).toBe(0)
  })
})

describe('formatDescendantsProgressJa', () => {
  it('total=0 → "子タスクなし"', () => {
    expect(
      formatDescendantsProgressJa({
        total: 0,
        done: 0,
        inProgress: 0,
        blocked: 0,
        todo: 0,
        cancelled: 0,
        unknown: 0,
        pctDone: 0,
        isComplete: false,
      }),
    ).toBe('子タスクなし')
  })

  it('全 cancelled → "子 N 件 (全キャンセル)"', () => {
    expect(
      formatDescendantsProgressJa({
        total: 2,
        done: 0,
        inProgress: 0,
        blocked: 0,
        todo: 0,
        cancelled: 2,
        unknown: 0,
        pctDone: 0,
        isComplete: false,
      }),
    ).toBe('子 2 件 (全キャンセル)')
  })

  it('混在 → "進捗 60%: 完了 6 / 進行中 2 / blocked 1 / todo 1 (全 10 件)"', () => {
    expect(
      formatDescendantsProgressJa({
        total: 10,
        done: 6,
        inProgress: 2,
        blocked: 1,
        todo: 1,
        cancelled: 0,
        unknown: 0,
        pctDone: 60,
        isComplete: false,
      }),
    ).toBe('進捗 60%: 完了 6 / 進行中 2 / blocked 1 / todo 1 (全 10 件)')
  })

  it('done のみ → "進捗 100%: 完了 N (全 N 件)"', () => {
    expect(
      formatDescendantsProgressJa({
        total: 3,
        done: 3,
        inProgress: 0,
        blocked: 0,
        todo: 0,
        cancelled: 0,
        unknown: 0,
        pctDone: 100,
        isComplete: true,
      }),
    ).toBe('進捗 100%: 完了 3 (全 3 件)')
  })

  it('count=0 の bucket は省略', () => {
    expect(
      formatDescendantsProgressJa({
        total: 5,
        done: 2,
        inProgress: 0,
        blocked: 0,
        todo: 3,
        cancelled: 0,
        unknown: 0,
        pctDone: 40,
        isComplete: false,
      }),
    ).toBe('進捗 40%: 完了 2 / todo 3 (全 5 件)')
  })
})

describe('formatDescendantsActivityHintJa', () => {
  // baseline: 全 status counts を 0 に初期化、テスト個別に上書き
  const p = (overrides: {
    total?: number
    done?: number
    inProgress?: number
    blocked?: number
    todo?: number
    cancelled?: number
    unknown?: number
    pctDone?: number
    isComplete?: boolean
  }) => ({
    total: overrides.total ?? 0,
    done: overrides.done ?? 0,
    inProgress: overrides.inProgress ?? 0,
    blocked: overrides.blocked ?? 0,
    todo: overrides.todo ?? 0,
    cancelled: overrides.cancelled ?? 0,
    unknown: overrides.unknown ?? 0,
    pctDone: overrides.pctDone ?? 0,
    isComplete: overrides.isComplete ?? false,
  })

  it('total=0 → "子タスクなし"', () => {
    expect(formatDescendantsActivityHintJa(p({}))).toBe('子タスクなし')
  })

  it('全 cancelled → "全キャンセル"', () => {
    expect(formatDescendantsActivityHintJa(p({ total: 3, cancelled: 3 }))).toBe('全キャンセル')
  })

  it('isComplete → "完了済"', () => {
    expect(
      formatDescendantsActivityHintJa(p({ total: 5, done: 5, pctDone: 100, isComplete: true })),
    ).toBe('完了済')
  })

  it('blocked > 0 → "ブロック中 (前提解消が先)" (未着手より優先)', () => {
    expect(formatDescendantsActivityHintJa(p({ total: 5, blocked: 1, todo: 4, pctDone: 0 }))).toBe(
      'ブロック中 (前提解消が先)',
    )
  })

  it('全 todo (done=0 / inProgress=0) → "未着手"', () => {
    expect(formatDescendantsActivityHintJa(p({ total: 5, todo: 5, pctDone: 0 }))).toBe('未着手')
  })

  it('pctDone < 25 で in_progress 1 → "スタートが遅い"', () => {
    expect(
      formatDescendantsActivityHintJa(p({ total: 10, inProgress: 1, todo: 9, pctDone: 0 })),
    ).toBe('スタートが遅い')
  })

  it('pctDone >= 25 で inProgress=0 → "停滞気味"', () => {
    expect(formatDescendantsActivityHintJa(p({ total: 10, done: 3, todo: 7, pctDone: 30 }))).toBe(
      '停滞気味',
    )
  })

  it('pctDone 30% で inProgress 1 → "前半遅延"', () => {
    expect(
      formatDescendantsActivityHintJa(
        p({ total: 10, done: 3, inProgress: 1, todo: 6, pctDone: 30 }),
      ),
    ).toBe('前半遅延')
  })

  it('pctDone 60% で inProgress 1 → "順調進行中"', () => {
    expect(
      formatDescendantsActivityHintJa(
        p({ total: 10, done: 6, inProgress: 1, todo: 3, pctDone: 60 }),
      ),
    ).toBe('順調進行中')
  })

  it('pctDone 80% → "仕上げ間近"', () => {
    expect(
      formatDescendantsActivityHintJa(
        p({ total: 10, done: 8, inProgress: 1, todo: 1, pctDone: 80 }),
      ),
    ).toBe('仕上げ間近')
  })
})
