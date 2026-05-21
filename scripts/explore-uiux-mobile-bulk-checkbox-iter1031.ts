/**
 * iter1031 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で BulkCheckbox (backlog row 内の `<input type="checkbox">` 直接利用) audit。
 *
 * 構造 (bulk-action-bar.tsx line 149-158):
 *   <input
 *     type="checkbox"
 *     aria-label={label}
 *     ...
 *   />
 *   ↑ label wrap なし、tap target は 13x13 ~ 16x16 (browser default checkbox size)
 *
 * iter1011 で確認した filter-must は <label> wrap で 56x44 tap target を担保
 * していたが、backlog 行内 BulkCheckbox は label wrap が無い。WCAG 2.5.5 違反の
 * 可能性が高い (= filter-must と divergent pattern)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-bulk-checkbox-iter1031',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const ids: string[] = []
    for (let i = 0; i < 2; i++) {
      const r = await admin
        .from('items')
        .insert({
          workspace_id: ws,
          title: `iter1031 bulk checkbox mobile ${i + 1}`,
          status: 'todo',
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        })
        .select()
        .single()
      if (r.error || !r.data) throw r.error
      ids.push(r.data.id as string)
    }

    await page.goto(`http://localhost:3001/${ws}?view=backlog`, { waitUntil: 'networkidle' })
    await page.waitForSelector(`[data-testid="bulk-select-${ids[0]}"]`, { timeout: 10_000 })

    const id0 = ids[0]
    if (!id0) {
      findings.push({ level: 'error', source: 'observation', message: 'no seeded items' })
      return
    }
    // bulk-select checkbox: visible 13x13 + ::before pseudo で tap area を 45x45 に拡張
    // (Playwright boundingBox は ::before を含まない、className 検証で代替)
    const cbAttrs = await page.locator(`[data-testid="bulk-select-${id0}"]`).evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { w: r.width, h: r.height, className: el.className }
    })
    console.log(`[bulk-select checkbox] ${JSON.stringify(cbAttrs)}`)
    if (!cbAttrs.className.includes('before:-inset-4')) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `bulk-select checkbox: visible ${Math.round(cbAttrs.w)}x${Math.round(cbAttrs.h)} で ::before pseudo tap target 拡張 (before:-inset-4) 無し → WCAG 2.5.5 違反`,
      })
    }

    const allAttrs = await page.locator('[data-testid="bulk-select-all"]').evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { w: r.width, h: r.height, className: el.className }
    })
    console.log(`[bulk-select-all] ${JSON.stringify(allAttrs)}`)
    if (!allAttrs.className.includes('before:-inset-4')) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `bulk-select-all checkbox: ::before pseudo tap target 拡張 無し`,
      })
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-bulk-checkbox-iter1031.png', fullPage: true })
  },
})
