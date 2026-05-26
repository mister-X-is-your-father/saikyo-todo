/**
 * playwright-iter1402 (mode-F / responsiveness): item-tag 付与は useSetItemTags が
 * **onSuccess-invalidate only** (onMutate 楽観 update 無し) のため、tag option を click して
 * から UI (option の checkmark / trigger chip) が反映されるまで server round-trip 待ちになる。
 * iter437/1013 で item status/reorder には onMutate を入れたが tag 付与は invalidate のみで
 * 不整合。本 script で click → aria 反映までの遅延 (lag) を実測する。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-flicker-tag-toggle-iter1402.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'flicker-tag-toggle-iter1402',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'タグ付与テスト item',
      description: '',
      status: 'todo',
      is_must: false,
      priority: 2,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    await admin
      .from('tags')
      .insert({ workspace_id: workspaceId, name: '重要', color: '#ef4444', kind: 'normal' })
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
    await page.locator('[data-testid="tag-picker-trigger"]').first().click()
    await page.waitForSelector('[data-testid^="tag-option-"]', { timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(500)
    const opt = page.locator('[data-testid^="tag-option-"]').first()
    if ((await opt.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'tag-option not found' })
      return
    }
    const before = await opt.getAttribute('aria-selected').catch(() => null)
    // cmdk CommandItem は aria-selected (cursor) と独自 check icon。check icon の opacity で判定。
    const checkOpacityBefore = await opt
      .locator('svg')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity)
      .catch(() => 'n/a')
    console.log(`[before] aria-selected=${before} checkIconOpacity=${checkOpacityBefore}`)

    const tClick = Date.now()
    await opt.click()
    // click 後、check icon opacity が 0→1 になるまでの時間を polling
    let flippedMs: number | null = null
    for (const ms of [0, 30, 60, 100, 150, 250, 400, 700, 1200]) {
      if (ms > 0) await page.waitForTimeout(ms - (Date.now() - tClick > ms ? 0 : 0))
      const op = await opt
        .locator('svg')
        .first()
        .evaluate((el) => getComputedStyle(el).opacity)
        .catch(() => 'n/a')
      if (op === '1' && flippedMs === null) flippedMs = Date.now() - tClick
    }
    console.log(`[result] check icon flipped to opacity=1 after ≈${flippedMs ?? '>1200'}ms`)
    if (flippedMs === null || flippedMs > 200) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: `tag toggle UI 反映が ${flippedMs ?? '>1200'}ms (onMutate 楽観 update 無し、server 待ち)`,
      })
    }
  },
})
