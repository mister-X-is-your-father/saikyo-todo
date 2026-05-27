/**
 * playwright-iter1412 (mode-K): KeybindingsHelpModal (`?` で開く controlled dialog) を閉じた後
 * focus が opener に戻るかの guard。iter1411 ItemEditDialog と同根 (DialogTrigger 無し →
 * Radix onCloseAutoFocus が triggerRef=null を focus → <body> 落ち) を keybindings modal にも
 * 適用した修正の回帰検査。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-keybindings-modal-focus-restore-iter1412.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'keybindings-modal-focus-restore-iter1412',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    // opener として安定した button (Heartbeat) に focus
    const opener = page.locator('button[aria-label^="Heartbeat"]')
    await opener.focus()
    const openerLabel = await opener.getAttribute('aria-label')

    // `?` で modal を開く (window keydown listener)
    await page.evaluate(() =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true })),
    )
    await page.waitForSelector('[data-testid=keybindings-help-modal]', { timeout: 5000 })
    await page.waitForTimeout(400)
    const focusIn = await page.evaluate(() => {
      const d = document.querySelector('[data-testid=keybindings-help-modal]')
      return !!d && d.contains(document.activeElement)
    })
    console.log('[open] focus inside modal =', focusIn)
    if (!focusIn)
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'keybindings modal open: focus が modal 内へ移動しない',
      })

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const restored = await page.evaluate((label) => {
      const a = document.activeElement as HTMLElement | null
      return {
        gone: !document.querySelector('[data-testid=keybindings-help-modal]'),
        matches: a?.getAttribute('aria-label') === label,
        activeTag: a?.tagName,
      }
    }, openerLabel)
    console.log('[close] restore =', JSON.stringify(restored))
    if (!restored.matches) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `keybindings modal close: focus が opener に戻らない (active=${restored.activeTag})`,
      })
    }
  },
})
