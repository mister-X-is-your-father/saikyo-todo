/**
 * playwright-iter1419 (mode-D 探索): header portal overlay 3 種 (通知設定 dialog /
 * NotificationBell popover / コマンドパレット cmdk) を **light** で axe scan。iter1408 は dark。
 * iter1416/1417 で light に取り残しがあったため overlay の light も確認。NotificationBell は
 * 3 type の通知を seed して populated に。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-overlays-light-iter1419.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

async function scan(
  page: import('@playwright/test').Page,
  label: string,
  findings: import('./lib/explore-uiux-runner').Finding[],
) {
  await page.evaluate(AXE_SRC)
  const results = await page.evaluate(async () => {
    // @ts-expect-error axe injected at runtime
    return await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
    })
  })
  const viol = results.violations as Array<{
    id: string
    impact: string
    nodes: Array<{
      html: string
      any: Array<{ data: { contrastRatio?: number; fgColor?: string; bgColor?: string } }>
    }>
  }>
  console.log(`\n[${label}] violations=${viol.length}`)
  for (const v of viol) {
    const d = v.nodes[0]?.any?.[0]?.data
    console.log(
      `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 100)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
    )
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-overlays-light-iter1419',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    // NotificationBell を populated にする (3 type)
    const base = { workspace_id: workspaceId, user_id: userId, read_at: null }
    await admin
      .from('notifications')
      .insert([
        {
          ...base,
          type: 'heartbeat_due',
          title: 'MUST 期限接近',
          body: '期限超過の MUST が 1 件あります',
          severity: 'danger',
        },
        {
          ...base,
          type: 'mention',
          title: 'メンションされました',
          body: '@you コメントで言及',
          severity: 'info',
        },
        {
          ...base,
          type: 'sync_failure',
          title: '同期失敗',
          body: 'Time entry の外部同期に失敗',
          severity: 'warn',
        },
      ])
      .then((r) => {
        if (r.error) console.error('[seed] notif err', r.error.message)
      })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    // light (theme 未設定 = light default)

    const gear = page.locator('button[aria-label^="通知設定"]')
    if ((await gear.count()) > 0) {
      await gear.click()
      await page.waitForSelector('[role=dialog]', { timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(500)
      await scan(page, 'light 通知設定dialog', findings)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    const bell = page.locator('button[aria-label^="通知 ("]')
    if ((await bell.count()) > 0) {
      await bell.click()
      await page.waitForTimeout(600)
      await scan(page, 'light 通知bell', findings)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    await page.keyboard.press('Control+k')
    await page.waitForTimeout(700)
    await scan(page, 'light コマンドパレット', findings)
  },
})
