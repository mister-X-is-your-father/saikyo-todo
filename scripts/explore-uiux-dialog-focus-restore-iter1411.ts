/**
 * playwright-iter1411 (mode-K = keyboard/focus 探索): ItemEditDialog を開いて Escape で
 * 閉じた後、focus が trigger (backlog title button) に戻るかを検査。Radix Dialog の
 * focus restoration が効いているかの behavioral guard (axe では検出不可)。
 * 併せて open 直後に focus が dialog 内へ移動するかも確認。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dialog-focus-restore-iter1411.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'dialog-focus-restore-iter1411',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'focus restore テスト item',
      description: '',
      status: 'todo',
      is_must: false,
      priority: 2,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    const trigger = page.locator('[data-testid^=backlog-title-]').first()
    await trigger.focus()
    const triggerTestId = await trigger.getAttribute('data-testid')

    // open dialog via keyboard (Enter on focused trigger)
    await page.keyboard.press('Enter')
    await page.waitForSelector('[data-slot=dialog-content]', { timeout: 8000 })
    await page.waitForTimeout(500)

    const focusInsideDialog = await page.evaluate(() => {
      const dlg = document.querySelector('[data-slot=dialog-content]')
      return !!dlg && dlg.contains(document.activeElement)
    })
    console.log('[open] focus inside dialog =', focusInsideDialog)
    if (!focusInsideDialog) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'dialog open: focus が dialog 内へ移動しない',
      })
    }

    // close via Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)

    const restored = await page.evaluate((tid) => {
      const active = document.activeElement as HTMLElement | null
      return {
        dialogGone: !document.querySelector('[data-slot=dialog-content]'),
        activeTestId: active?.getAttribute('data-testid'),
        activeTag: active?.tagName,
        matchesTrigger: active?.getAttribute('data-testid') === tid,
      }
    }, triggerTestId)
    console.log('[close] restore =', JSON.stringify(restored))
    if (!restored.dialogGone) {
      findings.push({ level: 'warning', source: 'a11y', message: 'Escape で dialog が閉じない' })
    }
    if (!restored.matchesTrigger) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `dialog close: focus が trigger (${triggerTestId}) に戻らない (active=${restored.activeTag}/${restored.activeTestId})`,
      })
    }
  },
})
