/**
 * iter1107 basics: `keybindings.ts` の KEYBINDINGS データ invariant test を追加。
 *
 * KEYBINDINGS は keybindings-help-modal + command palette + global-shortcuts の
 * 一元 registry。新しい shortcut 追加時に重複 / 空 description / 未知 group が
 * 入らないよう invariant 回帰防止。`combo` は Esc などで意図的に重複あり
 * (group=Today vs group=グローバル) なので "group+combo" の unique を要件化。
 */
import { describe, expect, it } from 'vitest'

import { KEYBINDINGS } from './keybindings'

describe('KEYBINDINGS invariant', () => {
  it('全 entry に description / combo / group が non-empty で揃っている', () => {
    for (const kb of KEYBINDINGS) {
      expect(kb.combo.length).toBeGreaterThan(0)
      expect(kb.description.length).toBeGreaterThan(0)
      expect(kb.group.length).toBeGreaterThan(0)
    }
  })

  it('group + combo の組合せが unique (同 group 内で同じ combo を重複させない)', () => {
    const seen = new Set<string>()
    for (const kb of KEYBINDINGS) {
      const key = `${kb.group}|${kb.combo}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it('Esc は Today / グローバル の 2 group で意図的に重複している (context 別動作)', () => {
    const escEntries = KEYBINDINGS.filter((kb) => kb.combo === 'Esc')
    // 仕様: Today の Esc (カーソル選択解除) と グローバルの Esc (Dialog 閉じる) の 2 件
    expect(escEntries.length).toBeGreaterThanOrEqual(2)
    const groups = new Set(escEntries.map((kb) => kb.group))
    expect(groups.has('Today')).toBe(true)
    expect(groups.has('グローバル')).toBe(true)
  })

  it('g プレフィクス ナビゲーション 6 件 (Today/Inbox/Kanban/Backlog/Gantt/Dashboard)', () => {
    const navEntries = KEYBINDINGS.filter((kb) => kb.group === 'ナビゲーション')
    expect(navEntries.length).toBe(6)
    for (const kb of navEntries) {
      expect(kb.combo).toMatch(/^g /)
    }
  })

  it('Cmd+K / Ctrl+K がコマンドパレット用に登録されている', () => {
    const cmdK = KEYBINDINGS.find((kb) => kb.combo === 'Cmd+K / Ctrl+K')
    expect(cmdK).toBeDefined()
    expect(cmdK?.group).toBe('グローバル')
    expect(cmdK?.description).toMatch(/コマンドパレット/)
  })

  it('Alt+→ / Alt+← が子タスク indent/outdent に登録されている', () => {
    const indentEntry = KEYBINDINGS.find((kb) => kb.combo === 'Alt+→')
    const outdentEntry = KEYBINDINGS.find((kb) => kb.combo === 'Alt+←')
    expect(indentEntry?.group).toBe('子タスク')
    expect(outdentEntry?.group).toBe('子タスク')
  })

  it('iter1638: `q` (クイック追加にフォーカス) が Item group に登録 (iter1622 aria-keyshortcuts と同期)', () => {
    // iter1622 で quick-add input の aria-keyshortcuts に 'q' を追加。
    // KEYBINDINGS table と aria-keyshortcuts (UI 上の宣言) が同期している invariant。
    const qEntry = KEYBINDINGS.find((kb) => kb.combo === 'q')
    expect(qEntry).toBeDefined()
    expect(qEntry?.group).toBe('Item')
    expect(qEntry?.description).toMatch(/クイック追加/)
  })

  it('iter1651: Cmd+S / Ctrl+S 保存 shortcut が Item group に登録 (item-edit-dialog aria-keyshortcuts と同期)', () => {
    // item-edit-dialog.tsx の save button が aria-keyshortcuts="Meta+S Control+S"
    // を宣言。KEYBINDINGS table も同 shortcut を documented していることを確認。
    const saveEntry = KEYBINDINGS.find((kb) => kb.combo === 'Cmd+S / Ctrl+S')
    expect(saveEntry).toBeDefined()
    expect(saveEntry?.group).toBe('Item')
    expect(saveEntry?.description).toMatch(/保存/)
  })
})
