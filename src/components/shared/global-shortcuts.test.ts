/**
 * iter1653: `G_PREFIX_VIEWS` (iter1645 で lookup table 化、iter1653 で export)
 * の invariant test。KEYBINDINGS の "ナビゲーション" group 6 entry と同期している
 * ことを assert (= bash↔TS 等価性 + 1 source of truth 不在による divergent を防ぐ)。
 *
 * iter1648 FORM_DESCRIPTORS / iter1649 FocusQuickAddTestId と同 pattern (= type
 * narrow + literal completeness)。後続で view 追加 / 削除があった時、KEYBINDINGS と
 * G_PREFIX_VIEWS の片方だけ update したら test が落ちる回帰 guard。
 *
 * 注: GlobalShortcuts component 本体は React component (CLAUDE.md「component
 * test 不要」)。本 test は **データ table の invariant のみ** を対象、node env で OK。
 */
import { describe, expect, it } from 'vitest'

import { KEYBINDINGS } from '@/lib/keybindings'

import { G_PREFIX_VIEWS } from './global-shortcuts'

describe('G_PREFIX_VIEWS (iter1645 — chord g→view lookup table)', () => {
  it('6 key (t/i/k/b/g/d) 全てに view 名が定義されている', () => {
    expect(Object.keys(G_PREFIX_VIEWS).sort()).toEqual(['b', 'd', 'g', 'i', 'k', 't'])
  })

  it('view 名は 6 known view (today/inbox/kanban/backlog/gantt/dashboard) のみ', () => {
    const views = Object.values(G_PREFIX_VIEWS).sort()
    expect(views).toEqual(['backlog', 'dashboard', 'gantt', 'inbox', 'kanban', 'today'])
  })

  it('KEYBINDINGS ナビゲーション group と同期 (key 数 + 各 key → view 対応)', () => {
    // KEYBINDINGS は `g <key>` (chord) を `<view> に切替` という形で登録している
    // (e.g., 'g t' → 'Today に切替')。G_PREFIX_VIEWS は `<key>` → `<view>` の lookup table。
    // 両者の key 数 (6) と view set が一致することを assert。
    const navEntries = KEYBINDINGS.filter((kb) => kb.group === 'ナビゲーション')
    expect(navEntries.length).toBe(Object.keys(G_PREFIX_VIEWS).length)

    // 各 KEYBINDINGS entry が G_PREFIX_VIEWS の view 名を description に含む
    for (const kb of navEntries) {
      const key = kb.combo.replace(/^g /, '') as keyof typeof G_PREFIX_VIEWS
      const view = G_PREFIX_VIEWS[key]
      expect(view).toBeDefined()
      // description は "Today に切替" 形式、view 名 capitalize と一致
      const capitalized = view.charAt(0).toUpperCase() + view.slice(1)
      expect(kb.description).toMatch(new RegExp(`^${capitalized} に切替`))
    }
  })
})
