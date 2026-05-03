/**
 * iter669 chore: bulk-selection store の単体テスト。test 不在だったので追加。
 *
 * Backlog view の一括 checkbox で使う Zustand store の挙動 (toggle / setMany /
 * deselect / clear / has / size / ids) を最小限の input/output ペアで検証。
 * Zustand の `create` 戻り値は自身が hook + getState/setState を持つので、
 * `useBulkSelectionStore.getState()` 経由で sync 操作可能。
 */
import { afterEach, describe, expect, it } from 'vitest'

import { useBulkSelectionStore } from './bulk-selection'

afterEach(() => {
  // 各 test 後に store を初期化して isolation を保証
  useBulkSelectionStore.getState().clear()
})

describe('useBulkSelectionStore', () => {
  it('初期状態は空 (selected.size=0)', () => {
    expect(useBulkSelectionStore.getState().size()).toBe(0)
    expect(useBulkSelectionStore.getState().ids()).toEqual([])
  })

  it('toggle で追加 / 削除', () => {
    const { toggle, has } = useBulkSelectionStore.getState()
    toggle('id-1')
    expect(has('id-1')).toBe(true)
    expect(useBulkSelectionStore.getState().size()).toBe(1)
    toggle('id-1')
    expect(has('id-1')).toBe(false)
    expect(useBulkSelectionStore.getState().size()).toBe(0)
  })

  it('setMany で一括設定 (既存は上書き)', () => {
    const s = useBulkSelectionStore.getState()
    s.toggle('a')
    s.setMany(['x', 'y', 'z'])
    expect(useBulkSelectionStore.getState().size()).toBe(3)
    expect(useBulkSelectionStore.getState().has('a')).toBe(false)
    expect(useBulkSelectionStore.getState().has('x')).toBe(true)
  })

  it('deselect で 1 件削除 (該当なしは noop)', () => {
    const s = useBulkSelectionStore.getState()
    s.setMany(['a', 'b'])
    s.deselect('a')
    expect(useBulkSelectionStore.getState().has('a')).toBe(false)
    expect(useBulkSelectionStore.getState().has('b')).toBe(true)
    s.deselect('unknown') // noop
    expect(useBulkSelectionStore.getState().size()).toBe(1)
  })

  it('clear で全削除', () => {
    const s = useBulkSelectionStore.getState()
    s.setMany(['a', 'b', 'c'])
    s.clear()
    expect(useBulkSelectionStore.getState().size()).toBe(0)
    expect(useBulkSelectionStore.getState().ids()).toEqual([])
  })

  it('ids() は selected の配列 snapshot を返す (Set 順は insertion order)', () => {
    const s = useBulkSelectionStore.getState()
    s.toggle('first')
    s.toggle('second')
    s.toggle('third')
    expect(useBulkSelectionStore.getState().ids()).toEqual(['first', 'second', 'third'])
  })

  it('has() は selected.has と同じ', () => {
    const s = useBulkSelectionStore.getState()
    s.setMany(['a'])
    expect(s.has('a')).toBe(true)
    expect(s.has('z')).toBe(false)
  })
})
