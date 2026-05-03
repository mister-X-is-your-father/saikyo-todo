/**
 * iter673 chore: KEYBINDINGS registry の単体テスト。test 不在解消。
 *
 * KEYBINDINGS は help modal / command palette / docs で参照される SoT。
 * shape (combo / description / group) の 3 field 完備性、空文字 prevention、
 * group 重複なし (グループ数 enum の固定) を構造的に保証。
 */
import { describe, expect, it } from 'vitest'

import { KEYBINDINGS } from './keybindings'

describe('KEYBINDINGS', () => {
  it('1 件以上の entry を持つ', () => {
    expect(KEYBINDINGS.length).toBeGreaterThan(0)
  })

  it('各 entry は combo + description + group を非空文字で持つ', () => {
    for (const k of KEYBINDINGS) {
      expect(typeof k.combo).toBe('string')
      expect(typeof k.description).toBe('string')
      expect(typeof k.group).toBe('string')
      expect(k.combo.length).toBeGreaterThan(0)
      expect(k.description.length).toBeGreaterThan(0)
      expect(k.group.length).toBeGreaterThan(0)
    }
  })

  it('combo + group の (combo, group) ペアは重複なし (= 同 group 内 combo は unique)', () => {
    const seen = new Set<string>()
    for (const k of KEYBINDINGS) {
      const key = `${k.group}::${k.combo}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it('既知 group 名が含まれる (= 主要セクションが drift していない)', () => {
    const groups = new Set(KEYBINDINGS.map((k) => k.group))
    // 主要 group の存在を保証
    expect(groups.has('ナビゲーション')).toBe(true)
    expect(groups.has('Item')).toBe(true)
    expect(groups.has('Today')).toBe(true)
    expect(groups.has('グローバル')).toBe(true)
  })

  it('? は help modal を開く global shortcut として登録', () => {
    const help = KEYBINDINGS.find((k) => k.combo === '?')
    expect(help).toBeDefined()
    expect(help?.group).toBe('グローバル')
  })

  it('q は quick-add focus shortcut として登録', () => {
    const quick = KEYBINDINGS.find((k) => k.combo === 'q')
    expect(quick).toBeDefined()
    expect(quick?.group).toBe('Item')
  })
})
