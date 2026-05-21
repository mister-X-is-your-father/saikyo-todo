/**
 * iter1011 (playwright loop, mode-M = Mobile audit):
 * iPhone SE (375x667) で items-board の filter row (MUST checkbox + Status select +
 * Sprint select + filter-count chip) を audit。
 *
 * 検出対象:
 *  1. 親 row が documentElement.scrollWidth > viewport 375px を発生させていないか
 *     (= 横スクロール / 押し出し)
 *  2. 各 filter 要素 (filter-must / filter-status / filter-sprint / filter-count)
 *     の bounding box が click target 44x44 を満たすか
 *  3. select element の wrap 動作 (375px で wrap 出来ているか)
 *  4. filter-count chip が選択数 visible のまま
 *  5. 関連 view-switcher ボタン (9 button) の rough 整列 sanity
 *
 * 修正は別 iter (本 iter は audit 中心、findings ベースで polish 候補を HANDOFF §9 に記録)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-items-board-filters-iter1011',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    // seed 2 items so filter-count chip has non-trivial state
    await admin.from('items').insert([
      {
        workspace_id: ws,
        title: 'iter1011 mobile audit item 1',
        status: 'todo',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: ws,
        title: 'iter1011 mobile audit item 2',
        status: 'in_progress',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
        is_must: true,
        dod: 'DoD dummy',
      },
    ])

    await page.goto(`http://localhost:3001/${ws}?view=today`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="view-switcher"]', { timeout: 10_000 })

    // (1) viewport 横スクロール? documentElement.scrollWidth
    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    if (docW > viewW + 4) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `documentElement.scrollWidth=${docW}px > viewport ${viewW}px (横スクロール発生 = layout 潰れ)`,
      })
    }

    // (2) filter 4 要素の 44x44 audit。
    // checkbox 系は <label> wrap が tap target を担保するため label 側の box を測る。
    const filterTargets = [
      {
        sel: 'label[for="filter-must"]',
        name: 'filter-must label (checkbox wrapper)',
        minH: 44,
        minW: 44,
      },
      { sel: '[data-testid="filter-status"]', name: 'filter-status (select)', minH: 44, minW: 44 },
      { sel: '[data-testid="filter-sprint"]', name: 'filter-sprint (select)', minH: 44, minW: 44 },
      // filter-count は interactive ではない status chip、44x44 不要
      { sel: '[data-testid="filter-count"]', name: 'filter-count (count chip)', minH: 0, minW: 0 },
    ]
    for (const t of filterTargets) {
      const box = await page
        .locator(t.sel)
        .first()
        .boundingBox()
        .catch(() => null)
      if (!box) {
        findings.push({
          level: 'info',
          source: 'observation',
          message: `${t.name}: not visible (locator ${t.sel} miss)`,
        })
        continue
      }
      const w = Math.round(box.width)
      const h = Math.round(box.height)
      console.log(`[44x44 audit] ${t.name}: ${w}x${h}`)
      if (h < t.minH || w < t.minW) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${t.name}: ${w}x${h} < ${t.minW}x${t.minH} (tap target 不足 WCAG 2.5.5)`,
        })
      }
    }

    // (3) screenshot 保存 (修正前 baseline)
    await page.screenshot({
      path: '/tmp/uiux-mobile-items-board-filters-iter1011.png',
      fullPage: true,
    })

    // (4) view-switcher 9 button の 44x44 sanity (cross-check iter463 既存)
    const views = [
      'today',
      'inbox',
      'kanban',
      'backlog',
      'gantt',
      'dashboard',
      'daily',
      'weekly',
      'monthly',
    ]
    let belowCount = 0
    for (const v of views) {
      const box = await page
        .locator(`button[data-testid="view-${v}-btn"]`)
        .first()
        .boundingBox()
        .catch(() => null)
      if (!box) continue
      if (box.height < 44 || box.width < 44) {
        belowCount += 1
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `view-${v}-btn: ${Math.round(box.width)}x${Math.round(box.height)} < 44x44`,
        })
      }
    }
    console.log(`[view-switcher 44x44] ${9 - belowCount}/9 OK`)
  },
})
