/**
 * playwright-iter1395 (mode-M = Mobile audit): 375px viewport (click-login で reliable
 * render) + **実 item 投入** で today view と ItemEditDialog の overflow / tap-target /
 * cramping を audit。
 *
 * 注: `device: iPhone SE` emulation (tap login) は item load が不安定だったため、
 * `viewport` (click login) + 2200ms wait + is_must/description 明示 seed で安定 render させる。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-populated-iter1395.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'mobile-populated-iter1395',
  viewport: { width: 375, height: 667 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    const od = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
    await admin.from('items').insert([
      {
        workspace_id: workspaceId,
        title: '締切超過の最優先MUSTタスクで横幅をかなり圧迫する長めの日本語タイトル例',
        description: '見積: 45分',
        status: 'todo',
        is_must: true,
        priority: 1,
        due_date: od,
        scheduled_for: t,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: '進行中タスク',
        description: '',
        status: 'in_progress',
        is_must: false,
        priority: 2,
        scheduled_for: t,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=today`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2200)

    // 1. body 横 overflow
    const { docW, viewW } = await page.evaluate(() => ({
      docW: document.documentElement.scrollWidth,
      viewW: window.innerWidth,
    }))
    console.log(`[today overflow] doc=${docW} view=${viewW}`)
    if (docW > viewW + 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `today body 横 overflow: ${docW} > ${viewW}`,
      })
    }
    await page.screenshot({ path: '/tmp/mobile-populated-today-iter1395.png', fullPage: true })

    // 2. 主要 tap target ≥44 (今日の作戦盤 row / checkbox / quick-add submit)
    const targets = [
      '[data-testid^="operation-board-row-"]',
      '[data-testid^="today-must-"]',
      '[data-testid="quick-add-submit"]',
    ]
    for (const sel of targets) {
      const loc = page.locator(sel).first()
      if ((await loc.count()) === 0) {
        console.log(`  ${sel}: not found`)
        continue
      }
      const box = await loc.boundingBox()
      if (!box) continue
      const w = Math.round(box.width)
      const h = Math.round(box.height)
      console.log(`  ${sel}: ${w}x${h}`)
      if (h < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sel}: 高さ ${h}px < 44 (WCAG 2.5.5)`,
        })
      }
    }

    // 3. dialog を開いて overflow
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(2000)
    const be = page.locator('[data-testid^="backlog-edit-"]').first()
    if ((await be.count()) > 0) {
      await be.click()
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(500)
      const dlgW = await page.evaluate(() => document.documentElement.scrollWidth)
      console.log(`[dialog open overflow] doc=${dlgW} view=375`)
      if (dlgW > 376) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `dialog 開時 body 横 overflow: ${dlgW} > 375`,
        })
      }
      await page.screenshot({ path: '/tmp/mobile-populated-dialog-iter1395.png', fullPage: true })
    }
  },
})
