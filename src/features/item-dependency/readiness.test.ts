import { describe, expect, it } from 'vitest'

import { formatDependencyReadiness, summarizeDependencyReadiness } from './readiness'
import type { ItemDependencyGroup, ItemRef } from './schema'

const ref = (id: string, overrides: Partial<ItemRef> = {}): ItemRef => ({
  id,
  title: `item-${id}`,
  status: 'todo',
  isMust: false,
  doneAt: null,
  priority: 4,
  ...overrides,
})

const emptyGroup: ItemDependencyGroup = { blockedBy: [], blocking: [], related: [] }

const NOW = new Date('2026-04-28T00:00:00Z')

describe('summarizeDependencyReadiness', () => {
  it('空 group は isReady=true / 全件 0', () => {
    const r = summarizeDependencyReadiness(emptyGroup)
    expect(r).toEqual({
      isBlocked: false,
      isReady: true,
      openBlockedByCount: 0,
      blockedByCount: 0,
      openBlockingCount: 0,
      blockingCount: 0,
      relatedCount: 0,
    })
  })

  it('blockedBy が 1 件、未完了 → isBlocked=true', () => {
    const r = summarizeDependencyReadiness({
      ...emptyGroup,
      blockedBy: [{ ref: ref('a'), createdAt: NOW }],
    })
    expect(r.isBlocked).toBe(true)
    expect(r.isReady).toBe(false)
    expect(r.openBlockedByCount).toBe(1)
    expect(r.blockedByCount).toBe(1)
  })

  it('blockedBy が 1 件、完了済 (doneAt あり) → isBlocked=false', () => {
    const r = summarizeDependencyReadiness({
      ...emptyGroup,
      blockedBy: [{ ref: ref('a', { doneAt: NOW }), createdAt: NOW }],
    })
    expect(r.isBlocked).toBe(false)
    expect(r.isReady).toBe(true)
    expect(r.openBlockedByCount).toBe(0)
    expect(r.blockedByCount).toBe(1)
  })

  it('blockedBy 3 件のうち 2 件完了 → openBlockedByCount=1, isBlocked=true', () => {
    const r = summarizeDependencyReadiness({
      ...emptyGroup,
      blockedBy: [
        { ref: ref('a', { doneAt: NOW }), createdAt: NOW },
        { ref: ref('b'), createdAt: NOW },
        { ref: ref('c', { doneAt: NOW }), createdAt: NOW },
      ],
    })
    expect(r.openBlockedByCount).toBe(1)
    expect(r.blockedByCount).toBe(3)
    expect(r.isBlocked).toBe(true)
  })

  it('blocking (= 自分の後続) のカウント: open / 全件', () => {
    const r = summarizeDependencyReadiness({
      ...emptyGroup,
      blocking: [
        { ref: ref('x'), createdAt: NOW },
        { ref: ref('y', { doneAt: NOW }), createdAt: NOW },
        { ref: ref('z'), createdAt: NOW },
      ],
    })
    expect(r.openBlockingCount).toBe(2)
    expect(r.blockingCount).toBe(3)
    // blocking 件数は isBlocked に影響しない
    expect(r.isBlocked).toBe(false)
    expect(r.isReady).toBe(true)
  })

  it('related は count のみ (open 概念なし)', () => {
    const r = summarizeDependencyReadiness({
      ...emptyGroup,
      related: [
        { ref: ref('p'), createdAt: NOW },
        { ref: ref('q', { doneAt: NOW }), createdAt: NOW },
      ],
    })
    expect(r.relatedCount).toBe(2)
    expect(r.isBlocked).toBe(false)
  })

  it('全種混在の集計', () => {
    const r = summarizeDependencyReadiness({
      blockedBy: [
        { ref: ref('a', { doneAt: NOW }), createdAt: NOW },
        { ref: ref('b'), createdAt: NOW },
      ],
      blocking: [
        { ref: ref('x'), createdAt: NOW },
        { ref: ref('y'), createdAt: NOW },
        { ref: ref('z', { doneAt: NOW }), createdAt: NOW },
      ],
      related: [{ ref: ref('p'), createdAt: NOW }],
    })
    expect(r).toEqual({
      isBlocked: true,
      isReady: false,
      openBlockedByCount: 1,
      blockedByCount: 2,
      openBlockingCount: 2,
      blockingCount: 3,
      relatedCount: 1,
    })
  })
})

describe('formatDependencyReadiness', () => {
  it('全 0 件 → "依存なし"', () => {
    const s = formatDependencyReadiness(summarizeDependencyReadiness(emptyGroup))
    expect(s).toBe('依存なし')
  })

  it('blocker 1 件未完了 + 後続なし → "前提 1 件未完了 (1 件中)"', () => {
    const s = formatDependencyReadiness(
      summarizeDependencyReadiness({
        ...emptyGroup,
        blockedBy: [{ ref: ref('a'), createdAt: NOW }],
      }),
    )
    expect(s).toBe('前提 1 件未完了 (1 件中)')
  })

  it('blocker 全完了 + 後続 2 件 (全 open) → "依存解決済み / 後続 2 件"', () => {
    const s = formatDependencyReadiness(
      summarizeDependencyReadiness({
        ...emptyGroup,
        blockedBy: [{ ref: ref('a', { doneAt: NOW }), createdAt: NOW }],
        blocking: [
          { ref: ref('x'), createdAt: NOW },
          { ref: ref('y'), createdAt: NOW },
        ],
      }),
    )
    expect(s).toBe('依存解決済み / 後続 2 件')
  })

  it('blocker 1/3 未完了 + 後続 1/2 未完了 + 関連 1 件 → 全部表示', () => {
    const s = formatDependencyReadiness(
      summarizeDependencyReadiness({
        blockedBy: [
          { ref: ref('a', { doneAt: NOW }), createdAt: NOW },
          { ref: ref('b'), createdAt: NOW },
          { ref: ref('c', { doneAt: NOW }), createdAt: NOW },
        ],
        blocking: [
          { ref: ref('x'), createdAt: NOW },
          { ref: ref('y', { doneAt: NOW }), createdAt: NOW },
        ],
        related: [{ ref: ref('p'), createdAt: NOW }],
      }),
    )
    expect(s).toBe('前提 1 件未完了 (3 件中) / 後続 1 件未完了 (2 件中) / 関連 1 件')
  })

  it('blocker 0 件 + 後続 1 件 (open) + 関連 0 件 → "後続 1 件" のみ ("依存なし" sentinel は出ない)', () => {
    const s = formatDependencyReadiness(
      summarizeDependencyReadiness({
        ...emptyGroup,
        blocking: [{ ref: ref('x'), createdAt: NOW }],
      }),
    )
    expect(s).toBe('後続 1 件')
  })

  it('blocker 0 件 + 後続 0 件 + 関連 1 件 → "関連 1 件"', () => {
    const s = formatDependencyReadiness(
      summarizeDependencyReadiness({
        ...emptyGroup,
        related: [{ ref: ref('p'), createdAt: NOW }],
      }),
    )
    expect(s).toBe('関連 1 件')
  })

  it('blocker 全 done + 後続 1 件全 done → "依存解決済み / 後続 1 件 (全完了)"', () => {
    const s = formatDependencyReadiness(
      summarizeDependencyReadiness({
        ...emptyGroup,
        blockedBy: [{ ref: ref('a', { doneAt: NOW }), createdAt: NOW }],
        blocking: [{ ref: ref('x', { doneAt: NOW }), createdAt: NOW }],
      }),
    )
    expect(s).toBe('依存解決済み / 後続 1 件 (全完了)')
  })
})
