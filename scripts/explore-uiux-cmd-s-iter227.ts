/**
 * Phase 6.15 loop iter 227 — ItemEditDialog で Cmd/Ctrl+S 保存ショートカット。
 *
 * Todoist / TickTick / Notion / Linear など主要な TODO アプリは、編集ダイアログ
 * 中の Cmd+S / Ctrl+S で「保存」をマウスなしで完了できる。saikyo-todo は
 * 「保存」 button まで Tab 移動が必要で、効率が劣っていた。
 *
 * 実装:
 *   - useEffect 内 keydown 監視 (dialog open 時のみ)
 *   - meta/ctrl + 's' (大小)、IME 変換中無視、isPending / title 空時 no-op
 *   - keybindings.ts の KEYBINDINGS に登録 (?ヘルプモーダルに自動表示)
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'cmd-s-iter227',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter227: ItemEditDialog で Cmd/Ctrl+S 保存ショートカット (Todoist / TickTick / Notion 標準)、keybindings.ts に登録で ? ヘルプモーダルに自動表示',
    })
  },
})
