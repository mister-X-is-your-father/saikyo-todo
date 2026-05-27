/**
 * playwright-iter1413 (mode-K): WorkflowEditorDialog (workflow card の「編集」button から開く
 * controlled dialog) を閉じた後 focus が opener (wf-edit button) に戻るかの guard。
 * iter1411/1412 と同根 (DialogTrigger 無し → Radix onCloseAutoFocus が triggerRef=null →
 * <body> 落ち) を workflows-panel にも適用した修正の回帰検査。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-editor-focus-restore-iter1413.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'workflow-editor-focus-restore-iter1413',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const { error } = await admin.from('workflows').insert({
      workspace_id: workspaceId,
      name: 'focus restore 用 workflow',
      description: '',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (error) console.error('[seed] workflow err', error.message)
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/workflows`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    const editBtn = page.locator('[data-testid^=wf-edit-]').first()
    if ((await editBtn.count()) === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'wf-edit button が見つからない (seed 失敗?)',
      })
      return
    }
    await editBtn.focus()
    const openerLabel = await editBtn.getAttribute('aria-label')
    await editBtn.click()
    await page.waitForSelector('[data-testid^=wf-editor-dialog-]', { timeout: 6000 })
    await page.waitForTimeout(400)
    const focusIn = await page.evaluate(() => {
      const d = document.querySelector('[data-testid^=wf-editor-dialog-]')
      return !!d && d.contains(document.activeElement)
    })
    console.log('[open] focus inside editor =', focusIn)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const restored = await page.evaluate((label) => {
      const a = document.activeElement as HTMLElement | null
      return {
        gone: !document.querySelector('[data-testid^=wf-editor-dialog-]'),
        matches: a?.getAttribute('aria-label') === label,
        activeTag: a?.tagName,
      }
    }, openerLabel)
    console.log('[close] restore =', JSON.stringify(restored))
    if (!restored.matches) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `workflow editor close: focus が opener に戻らない (active=${restored.activeTag})`,
      })
    }
  },
})
