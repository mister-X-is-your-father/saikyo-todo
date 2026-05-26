import { describe, expect, it } from 'vitest'

import {
  findDanglingInputs,
  findUnsatisfiedInputs,
  inferDependenciesFromIo,
  type IoArtifactLike,
} from './infer-dependencies'

describe('inferDependenciesFromIo', () => {
  it('output → input のシンプル match', () => {
    const r = inferDependenciesFromIo([
      { itemId: 'a', kind: 'output', label: '設計書' },
      { itemId: 'b', kind: 'input', label: '設計書' },
    ])
    expect(r).toEqual([{ fromItemId: 'a', toItemId: 'b', label: '設計書' }])
  })

  it('lower-case 正規化 + trim で match (大文字小文字 / 前後空白 を無視)', () => {
    const r = inferDependenciesFromIo([
      { itemId: 'a', kind: 'output', label: 'Spec.PDF' },
      { itemId: 'b', kind: 'input', label: '  spec.pdf  ' },
    ])
    expect(r).toHaveLength(1)
    expect(r[0]?.label).toBe('spec.pdf')
  })

  it('1 つの output が複数 input にマッチ → N 件 edge', () => {
    const r = inferDependenciesFromIo([
      { itemId: 'a', kind: 'output', label: 'spec' },
      { itemId: 'b', kind: 'input', label: 'spec' },
      { itemId: 'c', kind: 'input', label: 'spec' },
    ])
    expect(r).toHaveLength(2)
    expect(r.map((d) => d.toItemId).sort()).toEqual(['b', 'c'])
  })

  it('自己依存 (= 同 item の input + output 同 label) は除外', () => {
    const r = inferDependenciesFromIo([
      { itemId: 'a', kind: 'output', label: 'spec' },
      { itemId: 'a', kind: 'input', label: 'spec' },
    ])
    expect(r).toEqual([])
  })

  it('一致しない label は dependency 出ない', () => {
    const r = inferDependenciesFromIo([
      { itemId: 'a', kind: 'output', label: '設計書' },
      { itemId: 'b', kind: 'input', label: '議事録' },
    ])
    expect(r).toEqual([])
  })

  it('空 / whitespace-only label は無視', () => {
    const r = inferDependenciesFromIo([
      { itemId: 'a', kind: 'output', label: '' },
      { itemId: 'b', kind: 'input', label: '   ' },
    ])
    expect(r).toEqual([])
  })

  it('重複 pair は dedup される (同 from-to-label が複数 artifact から出ても 1 件)', () => {
    const r = inferDependenciesFromIo([
      { itemId: 'a', kind: 'output', label: 'spec' },
      { itemId: 'a', kind: 'output', label: 'spec' }, // 同じ output 重複
      { itemId: 'b', kind: 'input', label: 'spec' },
    ])
    expect(r).toHaveLength(1)
  })

  it('output / input の orientation 逆転 (input → output) は edge 出ない', () => {
    const r = inferDependenciesFromIo([
      { itemId: 'a', kind: 'input', label: 'spec' },
      { itemId: 'b', kind: 'output', label: 'spec' },
    ])
    expect(r).toEqual([{ fromItemId: 'b', toItemId: 'a', label: 'spec' }])
  })
})

describe('findUnsatisfiedInputs', () => {
  const artifacts: IoArtifactLike[] = [
    { itemId: 'a', kind: 'output', label: 'spec' },
    { itemId: 'b', kind: 'input', label: 'spec' },
    { itemId: 'c', kind: 'output', label: 'meeting' },
    { itemId: 'b', kind: 'input', label: 'meeting' },
  ]

  it('全 from が undone → b は 2 個 block', () => {
    const r = findUnsatisfiedInputs(artifacts, [
      { itemId: 'a', done: false },
      { itemId: 'b', done: false },
      { itemId: 'c', done: false },
    ])
    const bReport = r.find((x) => x.itemId === 'b')!
    expect(bReport.blockingItems).toHaveLength(2)
    expect(bReport.blockingItems.map((b) => b.fromItemId).sort()).toEqual(['a', 'c'])
  })

  it('from が done なら block 解消', () => {
    const r = findUnsatisfiedInputs(artifacts, [
      { itemId: 'a', done: true }, // spec 提供済
      { itemId: 'b', done: false },
      { itemId: 'c', done: false }, // meeting 未提供
    ])
    const bReport = r.find((x) => x.itemId === 'b')!
    expect(bReport.blockingItems).toHaveLength(1)
    expect(bReport.blockingItems[0]?.fromItemId).toBe('c')
  })

  it('全 from が done → blocked リスト空', () => {
    const r = findUnsatisfiedInputs(artifacts, [
      { itemId: 'a', done: true },
      { itemId: 'b', done: false },
      { itemId: 'c', done: true },
    ])
    expect(r.find((x) => x.itemId === 'b')).toBeUndefined()
  })

  it('依存関係無し → 空配列', () => {
    expect(
      findUnsatisfiedInputs(
        [{ itemId: 'a', kind: 'output', label: 'spec' }],
        [{ itemId: 'a', done: false }],
      ),
    ).toEqual([])
  })
})

describe('findDanglingInputs (iter1371)', () => {
  it('output が存在する input は dangling でない', () => {
    const r = findDanglingInputs([
      { itemId: 'a', kind: 'output', label: '設計書' },
      { itemId: 'b', kind: 'input', label: '設計書' },
    ])
    expect(r).toEqual([])
  })

  it('どの output にも一致しない input を返す (= 入手経路なし)', () => {
    const r = findDanglingInputs([
      { itemId: 'a', kind: 'output', label: '設計書' },
      { itemId: 'b', kind: 'input', label: '設計書' },
      { itemId: 'b', kind: 'input', label: '予算承認' }, // 誰も output しない
    ])
    expect(r).toEqual([{ itemId: 'b', label: '予算承認' }])
  })

  it('label 正規化 (trim + lower-case) で output と照合', () => {
    const r = findDanglingInputs([
      { itemId: 'a', kind: 'output', label: '  API Spec ' },
      { itemId: 'b', kind: 'input', label: 'api spec' },
    ])
    expect(r).toEqual([])
  })

  it('空 / whitespace label は無視、同 item の重複 input は 1 件に集約', () => {
    const r = findDanglingInputs([
      { itemId: 'b', kind: 'input', label: '   ' },
      { itemId: 'b', kind: 'input', label: '予算' },
      { itemId: 'b', kind: 'input', label: '予算' },
    ])
    expect(r).toEqual([{ itemId: 'b', label: '予算' }])
  })
})
