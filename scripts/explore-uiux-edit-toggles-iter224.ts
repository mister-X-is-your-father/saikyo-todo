/**
 * Phase 6.15 loop iter 224 — Budget / SprintDefaults / Budget Save の SR 化。
 *
 * iter180-223 同パターンを残り 3 button に展開。Budget の 「上限を変更」 button と
 * SprintDefaults の 「編集」 button は state を切替えるだけで、aria-label が
 * 「上限を変更」「編集」のみで context 不明だった (どの設定の編集か SR 不可視)。
 *   - budget「上限を変更」: aria-label に「AI 月次コスト上限と警告閾値の編集モードを開く」
 *   - sprint defaults「編集」: 現在値を含めた context aria-label
 *   - budget「保存」: pending / 通常 で 2 状態別文言
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'edit-toggles-iter224',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter224: Budget edit / save + SprintDefaults edit toggle button の aria-label を context-aware に',
    })
  },
})
