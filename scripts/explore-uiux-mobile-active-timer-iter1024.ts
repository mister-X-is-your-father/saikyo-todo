/**
 * iter1024 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で ActiveTimerPanel (右下 fixed の floating panel) の
 * positioning / readability audit。
 *
 * 構造 (active-timer-panel.tsx):
 *   - `fixed right-4 bottom-4 z-40` で右下 floating
 *   - content: タスクタイマー label + 経過時間 + 4 action buttons (Pause/Play/PiP/Stop)
 *
 * 320px viewport で:
 *   1. panel が viewport の左端を超えていないか (= 横スクロール)
 *   2. 4 button (Pause/PiP/Stop + 1) が 44x44 tap target を満たすか
 *   3. panel が下端 content (BulkActionBar 等) と overlap してないか
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-active-timer-iter1024',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const today = new Date().toISOString().slice(0, 10)
    const a = await admin
      .from('items')
      .insert({
        workspace_id: ws,
        title: 'iter1024 mobile timer audit',
        status: 'todo',
        scheduled_for: today,
        due_date: today,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select()
      .single()
    if (a.error || !a.data) throw a.error
    const itemId = a.data.id as string

    await page.goto(`http://localhost:3001/${ws}?view=today`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="today-view"]', { timeout: 10_000 })

    // タイマー開始: start-timer-${itemId} button をクリック
    const startBtn = page.locator(`[data-testid="start-timer-${itemId}"]`)
    if (await startBtn.count()) {
      await startBtn.click()
    } else {
      findings.push({
        level: 'info',
        source: 'observation',
        message: `start-timer-${itemId} button が見つからない`,
      })
    }
    await page.waitForSelector('[data-testid="active-timer-panel"]', { timeout: 5_000 })

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    const viewH = await page.evaluate(() => window.innerHeight)
    console.log(`[viewport] ${viewW}x${viewH} doc.scrollWidth=${docW}`)

    const panelMetrics = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="active-timer-panel"]') as HTMLElement | null
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
      }
    })
    console.log(`[panel] ${JSON.stringify(panelMetrics)}`)
    if (panelMetrics) {
      if (panelMetrics.left < 0) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `panel.left=${panelMetrics.left}px (viewport 左端を超えている)`,
        })
      }
      if (panelMetrics.right > viewW + 4) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `panel.right=${panelMetrics.right}px > viewport ${viewW}px (overflow)`,
        })
      }
      if (panelMetrics.bottom > viewH + 4) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `panel.bottom=${panelMetrics.bottom}px > viewport ${viewH}px (overflow)`,
        })
      }
    }

    const buttons = await page
      .locator('[data-testid="active-timer-panel"] button')
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect()
          return {
            testid: el.getAttribute('data-testid') ?? '',
            w: Math.round(r.width),
            h: Math.round(r.height),
            ariaLabel: el.getAttribute('aria-label')?.slice(0, 50) ?? '',
          }
        }),
      )
    console.log(`[panel buttons] count=${buttons.length}`)
    for (const b of buttons) {
      console.log(`  ${b.testid}: ${b.w}x${b.h}`)
      if (b.h < 44 || b.w < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${b.testid}: ${b.w}x${b.h} < 44x44 (tap target 不足)`,
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-active-timer-iter1024.png', fullPage: true })
  },
})
