/**
 * iter1106 basics: `bulk-selection.ts` Zustand store の unit test を追加。
 *
 * Backlog 一括 checkbox / bulk action bar の選択 state container。toggle が
 * add/remove 両方向、deselect が冪等、setMany が完全置換、clear が空集合
 * (workspace 切替時の重要 invariant) を回帰防止。
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { useBulkSelectionStore } from './bulk-selection'

describe('useBulkSelectionStore', () => {
  beforeEach(() => {
    useBulkSelectionStore.getState().clear()
  })

  it('初期 state は空集合', () => {
    const s = useBulkSelectionStore.getState()
    expect(s.size()).toBe(0)
    expect(s.ids()).toEqual([])
    expect(s.has('any')).toBe(false)
  })

  it('toggle は未選択→選択、選択→未選択を切替', () => {
    const s = useBulkSelectionStore.getState()
    s.toggle('a')
    expect(useBulkSelectionStore.getState().has('a')).toBe(true)
    s.toggle('a')
    expect(useBulkSelectionStore.getState().has('a')).toBe(false)
  })

  it('toggle は複数 id を独立に積み上げる', () => {
    const s = useBulkSelectionStore.getState()
    s.toggle('a')
    s.toggle('b')
    s.toggle('c')
    expect(useBulkSelectionStore.getState().size()).toBe(3)
    expect(useBulkSelectionStore.getState().ids().sort()).toEqual(['a', 'b', 'c'])
  })

  it('setMany は完全置換 (旧選択は消える)', () => {
    const s = useBulkSelectionStore.getState()
    s.toggle('a')
    s.toggle('b')
    s.setMany(['x', 'y'])
    const next = useBulkSelectionStore.getState()
    expect(next.size()).toBe(2)
    expect(next.has('a')).toBe(false)
    expect(next.has('x')).toBe(true)
    expect(next.has('y')).toBe(true)
  })

  it('deselect は選択中の id を外し、未選択 id は no-op (冪等)', () => {
    const s = useBulkSelectionStore.getState()
    s.setMany(['a', 'b'])
    s.deselect('a')
    expect(useBulkSelectionStore.getState().size()).toBe(1)
    expect(useBulkSelectionStore.getState().has('a')).toBe(false)
    // 未選択 id を deselect は no-op (state 不変)
    s.deselect('z')
    expect(useBulkSelectionStore.getState().size()).toBe(1)
  })

  it('clear は空集合に戻す (workspace 切替時の重要 invariant)', () => {
    const s = useBulkSelectionStore.getState()
    s.setMany(['a', 'b', 'c'])
    s.clear()
    expect(useBulkSelectionStore.getState().size()).toBe(0)
    expect(useBulkSelectionStore.getState().ids()).toEqual([])
  })

  it('setMany 空配列で clear と同等', () => {
    const s = useBulkSelectionStore.getState()
    s.setMany(['a', 'b'])
    s.setMany([])
    expect(useBulkSelectionStore.getState().size()).toBe(0)
  })

  it('setMany が同 id の重複を Set として dedup', () => {
    const s = useBulkSelectionStore.getState()
    s.setMany(['a', 'a', 'b'])
    expect(useBulkSelectionStore.getState().size()).toBe(2)
  })
})
