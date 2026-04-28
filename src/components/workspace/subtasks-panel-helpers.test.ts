/**
 * iter255 refactor: subtasks-panel 抽出に伴う pure helper 検証。
 * Component 本体は project policy で test しないが、bulk 入力 parser は
 * UI から切り離せて UI 動作の前提となるので unit test で押さえる。
 */
import { describe, expect, it } from 'vitest'

import { uuidToLabel } from '@/lib/db/ltree-path'

import {
  compareSiblings,
  countDescendants,
  findGrandparentId,
  findPrevSibling,
  getDescendants,
  type LtreeNode,
  parseBulkSubtaskTitles,
} from './subtasks-panel-helpers'

describe('parseBulkSubtaskTitles', () => {
  it('改行区切りで分割し空行を除外する', () => {
    const text = ['仕様書を読む', 'スキーマ設計', 'プロトタイプ実装'].join('\n')
    expect(parseBulkSubtaskTitles(text)).toEqual([
      '仕様書を読む',
      'スキーマ設計',
      'プロトタイプ実装',
    ])
  })

  it('行頭・行末の空白は trim して保持', () => {
    const text = '  foo  \n\tbar\t'
    expect(parseBulkSubtaskTitles(text)).toEqual(['foo', 'bar'])
  })

  it('空行 (空白のみを含む) は完全に除外', () => {
    const text = ['', '   ', '\t\t', 'one', '', 'two', '   ', ''].join('\n')
    expect(parseBulkSubtaskTitles(text)).toEqual(['one', 'two'])
  })

  it('空文字 / 改行のみの入力は空配列', () => {
    expect(parseBulkSubtaskTitles('')).toEqual([])
    expect(parseBulkSubtaskTitles('\n\n\n')).toEqual([])
    expect(parseBulkSubtaskTitles('   ')).toEqual([])
  })

  it('単行 (改行なし) も処理できる', () => {
    expect(parseBulkSubtaskTitles('only-one')).toEqual(['only-one'])
  })

  it('日本語 / emoji / 半角混在を保持', () => {
    expect(parseBulkSubtaskTitles('🚀 リリース\n設計レビュー\nQA pass')).toEqual([
      '🚀 リリース',
      '設計レビュー',
      'QA pass',
    ])
  })
})

// iter290 P0 (queue: subtask gap d/4): indent/outdent helpers
//
// テスト用 fixture: parentPath は uuidToLabel 後の値 (= ハイフン除去 32 文字)
// だが、unit test では「同 parentPath で sibling」が扱えればよいので任意文字列でよい。

function node(input: Partial<LtreeNode> & Pick<LtreeNode, 'id'>): LtreeNode {
  return {
    parentPath: '',
    position: 'm',
    deletedAt: null,
    ...input,
  }
}

describe('compareSiblings', () => {
  it('position asc で比較', () => {
    expect(
      compareSiblings(node({ id: 'a', position: 'a' }), node({ id: 'b', position: 'b' })),
    ).toBeLessThan(0)
  })

  it('同 position は id asc で tie-break', () => {
    expect(
      compareSiblings(node({ id: 'a', position: 'm' }), node({ id: 'b', position: 'm' })),
    ).toBeLessThan(0)
    expect(
      compareSiblings(node({ id: 'b', position: 'm' }), node({ id: 'a', position: 'm' })),
    ).toBeGreaterThan(0)
  })

  it('完全一致は 0', () => {
    expect(
      compareSiblings(node({ id: 'a', position: 'm' }), node({ id: 'a', position: 'm' })),
    ).toBe(0)
  })
})

describe('findPrevSibling', () => {
  const items: LtreeNode[] = [
    node({ id: 'a', parentPath: '', position: 'a' }),
    node({ id: 'b', parentPath: '', position: 'b' }),
    node({ id: 'c', parentPath: '', position: 'c' }),
    node({ id: 'x', parentPath: 'aaaa', position: 'a' }), // 別 parent の child
  ]

  it('真ん中の sibling は直前を返す', () => {
    const target = items[1]! // b
    const prev = findPrevSibling(target, items)
    expect(prev?.id).toBe('a')
  })

  it('末尾の sibling は直前 (= 最後の前) を返す', () => {
    const target = items[2]! // c
    const prev = findPrevSibling(target, items)
    expect(prev?.id).toBe('b')
  })

  it('先頭の sibling (= 前 sibling 無し) は null', () => {
    const target = items[0]! // a
    expect(findPrevSibling(target, items)).toBeNull()
  })

  it('別 parent の child は同 parent から探さない', () => {
    const target = items[3]! // x (parentPath='aaaa')
    expect(findPrevSibling(target, items)).toBeNull()
  })

  it('deletedAt 付き sibling は除外', () => {
    const list: LtreeNode[] = [
      node({ id: 'a', position: 'a', deletedAt: new Date() }),
      node({ id: 'b', position: 'b' }),
    ]
    expect(findPrevSibling(list[1]!, list)).toBeNull()
  })

  it('同 position は id 順で前後判定', () => {
    const list: LtreeNode[] = [node({ id: 'a', position: 'm' }), node({ id: 'b', position: 'm' })]
    // b の prev は a (id asc)
    expect(findPrevSibling(list[1]!, list)?.id).toBe('a')
    // a の prev は無い
    expect(findPrevSibling(list[0]!, list)).toBeNull()
  })
})

describe('findGrandparentId', () => {
  // ltree label は uuidToLabel 後 (ハイフン除去) の文字列だが、
  // 実装は parentPath を split してから一致確認するだけなので、
  // テストでは label 風の任意文字列で検証する。
  const A = '00000000000000000000000000000000a' // 33 chars だが OK
  const B = '00000000000000000000000000000000b'
  const C = '00000000000000000000000000000000c'

  // uuidToLabel は単に id.replace(/-/g, '') なので、
  // テストでは id にハイフン無しの文字列を使えば label === id になる。
  const items: LtreeNode[] = [
    node({ id: A, parentPath: '' }),
    node({ id: B, parentPath: A }),
    node({ id: C, parentPath: `${A}.${B}` }),
  ]

  it('parentPath 空 (= root item) は null', () => {
    expect(findGrandparentId(items[0]!, items)).toBeNull()
  })

  it('parentPath 1 segment (= root 直下) は "root" sentinel', () => {
    expect(findGrandparentId(items[1]!, items)).toBe('root')
  })

  it('parentPath 2+ segments は祖父 id を返す', () => {
    expect(findGrandparentId(items[2]!, items)).toBe(A)
  })

  it('祖父 item が見つからない (削除等) は null', () => {
    const orphan = node({ id: C, parentPath: 'unknownLabel.someOther' })
    expect(findGrandparentId(orphan, items)).toBeNull()
  })

  it('祖父が deletedAt なら除外して null', () => {
    const list: LtreeNode[] = [
      node({ id: A, parentPath: '', deletedAt: new Date() }),
      node({ id: B, parentPath: A }),
      node({ id: C, parentPath: `${A}.${B}` }),
    ]
    expect(findGrandparentId(list[2]!, list)).toBeNull()
  })

  it('深さ 3 (parentPath 3 segments) は 2nd-to-last segment が祖父', () => {
    const D = '00000000000000000000000000000000d'
    const deep = node({ id: D, parentPath: `${A}.${B}.${C}` })
    const list = [...items, deep]
    expect(findGrandparentId(deep, list)).toBe(B)
  })
})

describe('getDescendants / countDescendants (iter300 refactor)', () => {
  // root.A.B.C のような tree。uuidToLabel は ハイフン除去なので
  // ハイフン無しの id を使うと label === id。
  const A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  const C = 'cccccccccccccccccccccccccccccccc'
  const D = 'dddddddddddddddddddddddddddddddd'
  const E = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

  it('parent (root) の直接の子のみ拾う (1 段)', () => {
    const items: LtreeNode[] = [
      node({ id: A, parentPath: '' }),
      node({ id: B, parentPath: uuidToLabel(A) }),
      node({ id: C, parentPath: uuidToLabel(A) }),
    ]
    const parent = { id: A, parentPath: '' }
    expect(
      getDescendants(parent, items)
        .map((i) => i.id)
        .sort(),
    ).toEqual([B, C])
    expect(countDescendants(parent, items)).toBe(2)
  })

  it('parent (root) の直接の子 + 孫まで再帰的に拾う (2 段)', () => {
    const items: LtreeNode[] = [
      node({ id: A, parentPath: '' }),
      node({ id: B, parentPath: uuidToLabel(A) }),
      node({ id: C, parentPath: `${uuidToLabel(A)}.${uuidToLabel(B)}` }),
      node({ id: D, parentPath: `${uuidToLabel(A)}.${uuidToLabel(B)}` }),
    ]
    const parent = { id: A, parentPath: '' }
    expect(countDescendants(parent, items)).toBe(3) // B, C, D
  })

  it('parent (nested) でも fullPath 計算が動く', () => {
    // root: A、A の子: B、B の子: C
    const items: LtreeNode[] = [
      node({ id: A, parentPath: '' }),
      node({ id: B, parentPath: uuidToLabel(A) }),
      node({ id: C, parentPath: `${uuidToLabel(A)}.${uuidToLabel(B)}` }),
      node({ id: D, parentPath: `${uuidToLabel(A)}.${uuidToLabel(B)}` }),
    ]
    // B を parent として渡せば C, D の 2 件
    const parentB = { id: B, parentPath: uuidToLabel(A) }
    expect(countDescendants(parentB, items)).toBe(2)
  })

  it('deletedAt の子孫は除外', () => {
    const items: LtreeNode[] = [
      node({ id: A, parentPath: '' }),
      node({ id: B, parentPath: uuidToLabel(A) }),
      node({ id: C, parentPath: uuidToLabel(A), deletedAt: new Date() }),
    ]
    const parent = { id: A, parentPath: '' }
    expect(countDescendants(parent, items)).toBe(1) // B のみ
  })

  it('parent 自身 / sibling は除外 (parentPath が一致しないので)', () => {
    const items: LtreeNode[] = [
      node({ id: A, parentPath: '' }), // parent 自身
      node({ id: E, parentPath: '' }), // root sibling
      node({ id: B, parentPath: uuidToLabel(A) }), // child of A
    ]
    const parent = { id: A, parentPath: '' }
    expect(countDescendants(parent, items)).toBe(1)
  })

  it('子孫が 0 件なら 0', () => {
    const items: LtreeNode[] = [node({ id: A, parentPath: '' })]
    const parent = { id: A, parentPath: '' }
    expect(countDescendants(parent, items)).toBe(0)
  })

  it('別 tree の同名 prefix を持つ item を誤って拾わない (boundary 確認)', () => {
    // A の fullPath = "A"、A 以外の root item B の fullPath = "B"。
    // "A" で始まる別 tree の何かが居ないか厳密に確認。ここでは fullPath が
    // ちょうど一致または `.` 続きなので、startsWith は安全。
    const items: LtreeNode[] = [
      node({ id: A, parentPath: '' }),
      node({ id: 'aaab' + 'a'.repeat(28), parentPath: '' }), // label が "aaab..." で始まる別 root
      node({ id: B, parentPath: uuidToLabel(A) }),
    ]
    const parent = { id: A, parentPath: '' }
    // A の子 = B のみ。aaab... は別 root なので拾わない
    expect(countDescendants(parent, items)).toBe(1)
  })
})
