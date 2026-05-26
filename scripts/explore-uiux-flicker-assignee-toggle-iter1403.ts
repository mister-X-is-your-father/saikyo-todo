/**
 * playwright-iter1403 (mode-F / responsiveness): iter1402 (tag) と同型。AssigneePicker の
 * assignee 付与は useSetItemAssignees が onSuccess-invalidate のみだったため checkmark 反映に
 * server round-trip 待ち (~1s lag) だった。onMutate 楽観 update 追加後の応答時間を実測。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-flicker-assignee-toggle-iter1403.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'flicker-assignee-toggle-iter1403',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'アサイン付与テスト item',
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
    await page.waitForTimeout(2200)
    const editBtn = page.locator('[data-testid^="backlog-edit-"]').first()
    if ((await editBtn.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'backlog-edit not found' })
      return
    }
    await editBtn.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.waitForTimeout(400)
    await page.locator('[data-testid="assignee-picker-trigger"]').first().click()
    await page
      .waitForSelector('[data-testid^="assignee-option-"]', { timeout: 5000 })
      .catch(() => {})
    await page.waitForTimeout(500)
    const opt = page.locator('[data-testid^="assignee-option-"]').first()
    if ((await opt.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'assignee-option not found' })
      return
    }
    const tClick = Date.now()
    await opt.click()
    let flippedMs: number | null = null
    for (const ms of [0, 30, 60, 100, 150, 250, 400, 700, 1200]) {
      if (ms > 0) await page.waitForTimeout(ms)
      const op = await opt
        .locator('svg')
        .first()
        .evaluate((el) => getComputedStyle(el).opacity)
        .catch(() => 'n/a')
      if (op === '1' && flippedMs === null) flippedMs = Date.now() - tClick
    }
    console.log(
      `[result] assignee check icon flipped to opacity=1 after ≈${flippedMs ?? '>1200'}ms`,
    )
    if (flippedMs === null || flippedMs > 250) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `assignee toggle UI 反映が ${flippedMs ?? '>1200'}ms (楽観 update 未効?)`,
      })
    }
  },
})
