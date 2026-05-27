/**
 * playwright-iter1415 (mode-K 探索): ItemEditDialog 内で AssigneePicker (Radix Popover) を開き
 * Escape したとき、**popover だけ閉じて dialog は残る + focus が picker trigger に戻る** ことを確認。
 * nested DismissableLayer の Escape が上位 dialog まで leak しないこと / Popover (PopoverTrigger 有)
 * は controlled dialog (iter1411-1414) と違い focus 復帰が native に効くこと、の回帰 guard。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-nested-overlay-escape-iter1415.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'nested-overlay-escape-iter1415',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'nested overlay テスト item',
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
    await page.locator('[data-testid^=backlog-title-]').first().click()
    await page.waitForSelector('[data-slot=dialog-content]', { timeout: 8000 })
    await page.waitForTimeout(400)

    const trigger = page.locator('[data-testid=assignee-picker-trigger]')
    if ((await trigger.count()) === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'assignee-picker-trigger が見つからない',
      })
      return
    }
    await trigger.click()
    await page.waitForSelector('[role=listbox]', { timeout: 5000 })
    await page.waitForTimeout(300)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    const r = await page.evaluate(() => {
      const t = document.querySelector('[data-testid=assignee-picker-trigger]')
      const a = document.activeElement
      return {
        popoverClosed: t?.getAttribute('aria-expanded') === 'false',
        dialogStillOpen: !!document.querySelector('[data-slot=dialog-content]'),
        focusOnTrigger: a?.getAttribute('data-testid') === 'assignee-picker-trigger',
      }
    })
    console.log('[escape] =', JSON.stringify(r))
    if (!r.popoverClosed)
      findings.push({ level: 'warning', source: 'a11y', message: 'Escape で popover が閉じない' })
    if (!r.dialogStillOpen)
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'nested Escape が dialog まで leak して閉じた',
      })
    if (!r.focusOnTrigger)
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'popover close 後 focus が picker trigger に戻らない',
      })
  },
})
