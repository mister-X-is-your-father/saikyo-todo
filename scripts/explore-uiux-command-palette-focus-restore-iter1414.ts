/**
 * playwright-iter1414 (mode-K): CommandPalette (Cmd/Ctrl+K) を **dismiss (Escape)** で閉じた後、
 * focus が opener に戻るかの guard。CommandDialog 本体は ui/command.tsx (編集禁止) で
 * onCloseAutoFocus を持たず <body> 落ちしていた (iter1411-1413 と同根)。consumer 側
 * (command-palette.tsx) で opener 捕捉 + dismiss 時のみ復帰する修正の回帰検査。
 * command/item 選択時の close は run() の focus を尊重するため復帰しない (本 script は dismiss のみ検査)。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-command-palette-focus-restore-iter1414.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'command-palette-focus-restore-iter1414',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    const opener = page.locator('button[aria-label^="Heartbeat"]')
    await opener.focus()
    const openerLabel = await opener.getAttribute('aria-label')

    await page.keyboard.press('Control+k')
    await page.waitForSelector('[role=dialog]', { timeout: 5000 })
    await page.waitForTimeout(400)
    const focusIn = await page.evaluate(() => {
      const d = document.querySelector('[role=dialog]')
      return !!d && d.contains(document.activeElement)
    })
    console.log('[open] focus inside palette =', focusIn)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const restored = await page.evaluate((label) => {
      const a = document.activeElement as HTMLElement | null
      return {
        gone: !document.querySelector('[role=dialog]'),
        matches: a?.getAttribute('aria-label') === label,
        activeTag: a?.tagName,
      }
    }, openerLabel)
    console.log('[dismiss] restore =', JSON.stringify(restored))
    if (!restored.matches) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `command palette dismiss: focus が opener に戻らない (active=${restored.activeTag})`,
      })
    }
  },
})
