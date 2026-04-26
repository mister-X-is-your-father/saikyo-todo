/**
 * グローバルキーボードショートカットのレジストリ。
 *
 * 実際の handler 実装は `src/components/shared/global-shortcuts.tsx` と
 * `src/components/shared/command-palette.tsx` にあるが、ヘルプ表示 / Command Palette /
 * テストでは「何が登録されているか」を一覧したいので 1 ヶ所にまとめる。
 *
 * 新しい shortcut を追加する時はここにも 1 行足すこと。
 */

export interface Keybinding {
  /** 表示用の key combo (例: `?` / `q` / `g t` / `Cmd+K`) */
  combo: string
  /** 日本語の人間可読な説明 */
  description: string
  /** モーダル内のセクションラベル */
  group: string
}

export const KEYBINDINGS: Keybinding[] = [
  // --- ナビゲーション (g プレフィクス) ---
  { combo: 'g t', description: 'Today に切替', group: 'ナビゲーション' },
  { combo: 'g i', description: 'Inbox に切替', group: 'ナビゲーション' },
  { combo: 'g k', description: 'Kanban に切替', group: 'ナビゲーション' },
  { combo: 'g b', description: 'Backlog に切替', group: 'ナビゲーション' },
  { combo: 'g g', description: 'Gantt に切替', group: 'ナビゲーション' },
  { combo: 'g d', description: 'Dashboard に切替', group: 'ナビゲーション' },

  // --- Item ---
  { combo: 'q', description: 'クイック追加にフォーカス', group: 'Item' },

  // --- グローバル ---
  { combo: 'Cmd+K / Ctrl+K', description: 'コマンドパレットを開く', group: 'グローバル' },
  { combo: '?', description: 'このショートカット一覧を開く', group: 'グローバル' },
  { combo: 'Esc', description: '開いているダイアログを閉じる', group: 'グローバル' },
]
