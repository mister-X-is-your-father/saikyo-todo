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
  {
    combo: 'Cmd+S / Ctrl+S',
    description: 'Item 編集ダイアログで保存 (Item を開いている時)',
    group: 'Item',
  },

  // --- Today カーソル (j/k Vim 風) ---
  { combo: 'j / ↓', description: 'Today: 次の Item にカーソル移動', group: 'Today' },
  { combo: 'k / ↑', description: 'Today: 前の Item にカーソル移動', group: 'Today' },
  {
    combo: 'Enter / e',
    description: 'Today: カーソル位置の Item を編集ダイアログで開く',
    group: 'Today',
  },
  {
    combo: 'x / Space',
    description: 'Today: カーソル位置の Item を完了/未完了に切替',
    group: 'Today',
  },
  { combo: 'Esc', description: 'Today: カーソル選択を解除 (ダイアログ未表示時)', group: 'Today' },

  // --- 子タスク (Item 編集ダイアログ「子タスク」タブ内) ---
  // iter290 P0 (queue: subtask gap d/4) で追加。SubtaskTreeNode の <li> に focus
  // が当たっている時のみ動作。前 sibling が無ければ Alt+→ disabled / 既に root
  // なら Alt+← disabled (button aria-label に reason 文言)。
  {
    combo: 'Alt+→',
    description: '子タスク: 1 段インデント (前 sibling の子になる)',
    group: '子タスク',
  },
  {
    combo: 'Alt+←',
    description: '子タスク: 1 段アウトデント (祖父の子になる、root へも戻せる)',
    group: '子タスク',
  },

  // --- グローバル ---
  { combo: 'Cmd+K / Ctrl+K', description: 'コマンドパレットを開く', group: 'グローバル' },
  { combo: '?', description: 'このショートカット一覧を開く', group: 'グローバル' },
  { combo: 'Esc', description: '開いているダイアログを閉じる', group: 'グローバル' },
]
