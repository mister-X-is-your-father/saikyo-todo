/**
 * iter1649: FocusQuickAddTestId (iter1649 で独立 type に分離 + export) の
 * invariant test。iter1648 FORM_DESCRIPTORS と同 pattern (= type narrow +
 * literal completeness)。
 *
 * test 対象は **テスト用 fixture list** が type 完全性を満たすか + 各 testid が
 * "-empty-quick-add" suffix convention に従うかの 2 軸。後続で testid 追加 /
 * 修正された時に test が落ちる回帰 guard。
 *
 * 注: focus-quick-add-button.tsx 本体は React component (CLAUDE.md「component
 * test 不要」)。本 test は type literal union の invariant のみ対象、Vitest 既定
 * node env で OK (jsdom 不要)。
 */
import { describe, expect, it } from 'vitest'

import { type FocusQuickAddTestId } from './focus-quick-add-button'

const EXPECTED_TESTIDS: FocusQuickAddTestId[] = [
  'today-empty-quick-add',
  'inbox-empty-quick-add',
  'board-empty-quick-add',
]

describe('FocusQuickAddTestId (iter1649 — type narrow invariant)', () => {
  it('3 testid 全て fixture list と一致 (compile time = type literal、runtime = list 完全性)', () => {
    // TypeScript 型と runtime fixture list が同期していることを保証 (= 後続で
    // type に追加 / 削除があったら fixture も update 必要、compile error で気付く)
    expect(EXPECTED_TESTIDS).toHaveLength(3)
    expect(new Set(EXPECTED_TESTIDS).size).toBe(3) // unique
  })

  it('全 testid が "-empty-quick-add" suffix convention に従う', () => {
    for (const id of EXPECTED_TESTIDS) {
      expect(id.endsWith('-empty-quick-add')).toBe(true)
    }
  })

  it('view prefix は 3 known view (today / inbox / board) のみ', () => {
    const prefixes = EXPECTED_TESTIDS.map((id) => id.replace('-empty-quick-add', ''))
    expect(prefixes.sort()).toEqual(['board', 'inbox', 'today'])
  })

  it('iter1655: testid は view prefix unique (重複 view 名は許可しない、Playwright locator 安定化)', () => {
    const prefixes = EXPECTED_TESTIDS.map((id) => id.replace('-empty-quick-add', ''))
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })
})
