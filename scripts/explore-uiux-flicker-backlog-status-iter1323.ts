/**
 * Phase 6.15 loop iter1323 (mode-F = Flicker detection): Backlog view 内 item の
 * status checkbox toggle 直後に UI flicker (= 中間 frame で元状態に snap-back) が無いかを check。
 *
 * ItemCheckbox の useToggleItemStatus mutation が optimistic update OK なら、
 * checkbox click 直後に data-checked が即遷移、その後 server response で再 render しても
 * 視覚状態は変化しない。flicker = 中間 frame で元状態に戻る = optimistic update 不在 or
 * race condition のサイン。
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-flicker-backlog-status-iter1323.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'flicker-backlog-status-iter1323',
  viewport: { width: 1280, height: 800 },
  async seed(admin, { workspaceId, userId }) {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'flicker test item',
      status: 'todo',
      priority: 3,
      due_date: '2026-06-15',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Backlog view に切替 (desktop なので click)
    const backlogBtn = page.locator('[data-testid="view-backlog-btn"]').first()
    if ((await backlogBtn.count()) > 0) await backlogBtn.click()
    await page.waitForTimeout(500)

    // checkbox を探す (backlog row 内)
    const checkbox = page.locator('[data-testid^="item-checkbox-"]').first()
    if ((await checkbox.count()) === 0) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: 'item-checkbox not found - backlog に item が表示されていない',
      })
      return
    }

    const initialChecked = await checkbox.getAttribute('data-checked')
    console.log(`[initial] data-checked=${initialChecked}`)

    // click 実行 (optimistic update が効くか確認)
    await checkbox.click()

    // 直後 → 50/100/200/500ms 後 snapshot
    const snaps: Array<{ ms: number; checked: string | null }> = []
    for (const ms of [0, 50, 100, 200, 500]) {
      if (ms > 0) await page.waitForTimeout(ms)
      const checked = await checkbox.getAttribute('data-checked')
      snaps.push({ ms, checked })
      console.log(`[snap ${ms}ms] data-checked=${checked}`)
    }

    // optimistic update 確認: 0ms 時点で initial の反対値であるべき
    const expectedAfterClick = initialChecked === 'true' ? 'false' : 'true'
    if (snaps[0]?.checked !== expectedAfterClick) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `optimistic update 効いてない: 0ms 時点で data-checked=${snaps[0]?.checked} (期待: ${expectedAfterClick})`,
      })
    }

    // 中間 frame で initial に snap-back したら flicker
    for (let i = 1; i < snaps.length; i++) {
      if (snaps[i]?.checked === initialChecked && i > 0) {
        findings.push({
          level: 'error',
          source: 'observation',
          message: `flicker 検出: ${snaps[i]?.ms}ms 後で data-checked=${initialChecked} (initial) に snap-back (前 ${snaps[i - 1]?.ms}ms=${snaps[i - 1]?.checked})`,
        })
      }
    }

    await page.screenshot({
      path: '/tmp/uiux-flicker-backlog-status-iter1323.png',
      fullPage: true,
    })
  },
})
