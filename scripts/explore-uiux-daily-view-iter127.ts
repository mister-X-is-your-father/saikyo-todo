/**
 * Phase 6.15 loop iter 127 — /?view=daily の探索 (iter108 で投入した Daily/Weekly/Monthly view)。
 * 久しぶりに触る画面なので、その後の dialog/svh/landmark a11y 修正が壊していないか runner 経由で検証。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'iter127-daily',
  seed: async (admin, { workspaceId, userId }) => {
    // 今日 / 今週 / 今月 各範囲に items を 1 件ずつ
    const today = new Date()
    const todayIso = today.toISOString().slice(0, 10)
    const weekIso = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10)
    const monthIso = new Date(today.getFullYear(), today.getMonth(), 25).toISOString().slice(0, 10)
    for (const [t, due] of [
      ['iter127 today', todayIso],
      ['iter127 this week', weekIso],
      ['iter127 this month', monthIso],
    ] as const) {
      await admin.from('items').insert({
        workspace_id: workspaceId,
        title: t,
        due_date: due,
        status: 'todo',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
    }
  },
  body: async ({ page, workspaceId, findings }) => {
    // Daily view
    await page.goto(`http://localhost:3001/${workspaceId}?view=daily`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const dailyView = await page.locator('[data-testid="personal-period-view-day"]').count()
    console.log(`[iter127] daily view rendered: ${dailyView}`)
    if (!dailyView) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'daily view が描画されない',
      })
    }

    // ゴール textarea が a11y label を持つ
    const goalAria = await page
      .locator('[data-testid="period-goal-textarea-day"]')
      .getAttribute('aria-label')
    if (!goalAria) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'period-goal-textarea-day に aria-label なし',
      })
    }

    // ゴール保存テスト
    await page.locator('[data-testid="period-goal-textarea-day"]').fill('iter127 ゴール test')
    await page.locator('[data-testid="period-goal-save-day"]').click()
    await page.waitForTimeout(800)
    // reload して反映
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const saved = await page.locator('[data-testid="period-goal-textarea-day"]').inputValue()
    console.log(`[iter127] reloaded goal: ${JSON.stringify(saved)}`)
    if (saved !== 'iter127 ゴール test') {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `goal が永続化されていない: ${saved}`,
      })
    }

    // Weekly + Monthly の view 切替
    await page.goto(`http://localhost:3001/${workspaceId}?view=weekly`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1000)
    const wk = await page.locator('[data-testid="personal-period-view-week"]').count()
    console.log(`[iter127] weekly view: ${wk}`)

    await page.goto(`http://localhost:3001/${workspaceId}?view=monthly`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1000)
    const mo = await page.locator('[data-testid="personal-period-view-month"]').count()
    console.log(`[iter127] monthly view: ${mo}`)
    if (!wk || !mo) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '一部 period view が描画されない',
      })
    }
  },
  exitOnFindings: false,
})
