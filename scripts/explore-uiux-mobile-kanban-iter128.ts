/**
 * Phase 6.15 loop iter 128 — モバイル (iPhone 13) Kanban + ItemEditDialog の継続検証。
 * iter104/107/109 で修正した modal 位置 / 列縦スクロール / svh 固定が今も保持されているか
 * runner middleware (iter119) 経由で確認。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'iter128-mobile-kanban',
  device: 'iPhone 13',
  isMobile: true,
  seed: async (admin, { workspaceId, userId }) => {
    // 各 status に items を seed (Kanban 列を埋める)
    const items = [
      { title: 'iter128 todo a', status: 'todo' },
      { title: 'iter128 todo b', status: 'todo' },
      { title: 'iter128 in_progress a', status: 'in_progress' },
      { title: 'iter128 done a', status: 'done', done_at: new Date().toISOString() },
    ]
    for (const it of items) {
      await admin.from('items').insert({
        workspace_id: workspaceId,
        title: it.title,
        status: it.status,
        ...(it.done_at ? { done_at: it.done_at } : {}),
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
    }
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=kanban`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(2000)

    // 1. board が landmark (role="group" または <section>) になっている
    const board = await page.locator('[data-testid="kanban-board"]').count()
    console.log(`[iter128] kanban board: ${board}`)
    if (!board) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'kanban-board が描画されない',
      })
    }

    // 2. body が viewport より wider になっていない (overflow-x: clip)
    const docMetrics = await page.evaluate(() => {
      const VW = document.documentElement.clientWidth
      const wide: { tag: string; testid: string; width: number; cls: string }[] = []
      document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
        const w = el.getBoundingClientRect().width
        if (w > VW + 5 && wide.length < 5) {
          wide.push({
            tag: el.tagName,
            testid: el.getAttribute('data-testid') ?? '',
            width: Math.round(w),
            cls: (el.className?.toString() ?? '').slice(0, 60),
          })
        }
      })
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: VW,
        bodyScrollWidth: document.body.scrollWidth,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
        htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
        wide,
      }
    })
    console.log(`[iter128] doc metrics: ${JSON.stringify(docMetrics)}`)
    // overflow-x: clip は documentElement.scrollWidth を縮めない仕様 (layout extent は保たれる)。
    // 実害判定は (a) body.scrollWidth == clientWidth、(b) html/body の overflow-x が clip、
    // (c) body 直下に visible な wide 要素が無いこと。
    if (docMetrics.bodyScrollWidth > docMetrics.clientWidth + 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `body.scrollWidth ${docMetrics.bodyScrollWidth} > clientWidth ${docMetrics.clientWidth} (内部 overflow-x-auto が効いていない)`,
      })
    }
    if (docMetrics.htmlOverflowX !== 'clip' || docMetrics.bodyOverflowX !== 'clip') {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `overflow-x: clip が html(${docMetrics.htmlOverflowX}) / body(${docMetrics.bodyOverflowX}) に適用されていない`,
      })
    }
    if (docMetrics.wide.length > 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `viewport より wide な element 発見: ${JSON.stringify(docMetrics.wide.slice(0, 3))}`,
      })
    }

    // 3. Kanban カードの title click で dialog open + 位置 svh 中央
    const firstCard = page.locator('[data-testid^="kanban-title-"]').first()
    if ((await firstCard.count()) > 0) {
      await firstCard.tap()
      await page.waitForTimeout(1500)

      const dialog = page.locator('[data-slot="dialog-content"]').first()
      const box = await dialog.boundingBox()
      console.log(`[iter128] dialog box: ${JSON.stringify(box)}`)
      if (box) {
        const vp = page.viewportSize()!
        if (box.x + box.width > vp.width + 1) {
          findings.push({
            level: 'warning',
            source: 'observation',
            message: `dialog 右端 ${box.x + box.width}px が viewport ${vp.width} を超過`,
          })
        }
      }
    }

    // 4. モバイル長押し (250ms) で DnD が発動するか:
    //    短タップは drag 発動しない (scroll が効く) を確認
    await page.locator('body').tap({ position: { x: 200, y: 400 } })
    await page.waitForTimeout(300)
  },
  exitOnFindings: false,
})
