/**
 * iter1009 (playwright loop, mode-D = Desktop a11y):
 * Gantt view の timeline header に並ぶ "M/d" 日付ラベル ("5/21", "5/22", ...) は
 * sighted 用の視覚 ruler だが、内側 div container に aria-hidden が無く SR が
 * 「5/21 5/22 5/23 …」を header 走査時に毎日読み上げてしまう noise だった。
 *
 * 親 `role="grid"` は `aria-colcount={2}` (= Item label + Timeline の 2 列構造)
 * しか宣言しておらず、日付ラベルは Timeline 列の subdivision visual。一方で
 * Item 行の bar には `aria-label="<title>: 2026-05-21 → 2026-05-23 (3d) ..."` で
 * 日付が個別に SR に届くため、header の M/d 列は SR では装飾扱いに固定するのが
 * 正しい。
 *
 * このスクリプトは:
 *  1. アイテムを 3 件 seed → /<wsId>?view=gantt にアクセス
 *  2. timeline header 内の `data-weekend` 持つ day cell の container div に
 *     aria-hidden="true" が付与されていることを assert (子 cell 個別ではなく親
 *     container 1 箇所で全 day cell を SR-hide する)
 *  3. "Item" header text は visible のまま残ることを cross-check
 *  4. iter1008 invariant (row-num aria-hidden) も維持されていることを cross-check
 *  5. 親 grid の aria-colcount=2 (= 構造変更してない) cross-check
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'gantt-day-header-aria-hidden-iter1009',
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const today = new Date()
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    const items = [
      {
        title: 'iter1009 day-header テスト A',
        start: iso(today),
        due: iso(new Date(today.getTime() + 2 * 86400000)),
        isMust: false,
      },
      {
        title: 'iter1009 day-header テスト B',
        start: iso(new Date(today.getTime() + 1 * 86400000)),
        due: iso(new Date(today.getTime() + 4 * 86400000)),
        isMust: false,
      },
      {
        title: 'iter1009 day-header テスト C',
        start: iso(new Date(today.getTime() + 2 * 86400000)),
        due: iso(new Date(today.getTime() + 5 * 86400000)),
        isMust: false,
      },
    ]
    for (const it of items) {
      const ins = await admin.from('items').insert({
        workspace_id: ws,
        title: it.title,
        status: 'todo',
        start_date: it.start,
        due_date: it.due,
        is_must: it.isMust,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      if (ins.error) throw ins.error
    }

    await page.goto(`http://localhost:3001/${ws}?view=gantt`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="gantt-view"]', { timeout: 10_000 })

    // (1) day cell container に aria-hidden=true 付与確認 (= 個別 day cell ではなく container 1 箇所で SR-hide)
    const dayCellContainerHidden = await page.evaluate(() => {
      const cell = document.querySelector('[data-weekend]') as HTMLElement | null
      if (!cell) return { found: false, parentAriaHidden: null }
      const parent = cell.parentElement
      return {
        found: true,
        parentAriaHidden: parent?.getAttribute('aria-hidden') ?? null,
      }
    })
    if (!dayCellContainerHidden.found) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: `data-weekend 持つ day cell が見つからない (gantt header 構造変更?)`,
      })
    } else if (dayCellContainerHidden.parentAriaHidden !== 'true') {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `day cell の親 container に aria-hidden="true" 不在 (現在 aria-hidden=${dayCellContainerHidden.parentAriaHidden})`,
      })
    }
    console.log(
      `[day-header] day-cell parent aria-hidden=${dayCellContainerHidden.parentAriaHidden}`,
    )

    // (2) "Item" header text は visible のまま (= aria-hidden 化していないこと)
    const itemHeader = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="gantt-view"]')
      if (!grid) return null
      const text = grid.textContent ?? ''
      // header に 'Item' という visible text があるか
      const itemSpan = Array.from(grid.querySelectorAll('div')).find(
        (el) => el.textContent?.trim() === 'Item' && el.children.length === 0,
      )
      return {
        hasItemText: text.includes('Item'),
        itemSpanAriaHidden: itemSpan?.getAttribute('aria-hidden') ?? null,
      }
    })
    if (!itemHeader?.hasItemText) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: `"Item" header text が見当たらない (cross-check 失敗)`,
      })
    } else if (itemHeader.itemSpanAriaHidden === 'true') {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `"Item" header span が誤って aria-hidden="true" に (visible 列ヘッダは SR に残すべき)`,
      })
    }
    console.log(
      `[item-header] visible text=${itemHeader?.hasItemText} aria-hidden=${itemHeader?.itemSpanAriaHidden}`,
    )

    // (3) iter1008 invariant cross-check: row-num span aria-hidden=true 維持
    const rowNumsHidden = await page
      .locator('[data-testid^="gantt-row-num-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-hidden')))
    const allHidden = rowNumsHidden.length > 0 && rowNumsHidden.every((v) => v === 'true')
    if (!allHidden) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `iter1008 invariant 壊れ: row-num span ${rowNumsHidden.filter((v) => v !== 'true').length} 件 aria-hidden 不在`,
      })
    }
    console.log(
      `[iter1008 invariant] row-num all aria-hidden=true: ${allHidden} (n=${rowNumsHidden.length})`,
    )

    // (4) 親 grid の aria-colcount=2 維持
    const gridAttrs = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="gantt-view"]')
      return {
        role: grid?.getAttribute('role') ?? null,
        colcount: grid?.getAttribute('aria-colcount') ?? null,
        rowcount: grid?.getAttribute('aria-rowcount') ?? null,
      }
    })
    if (gridAttrs.role !== 'grid' || gridAttrs.colcount !== '2') {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `gantt-view grid attr 壊れ: role=${gridAttrs.role} colcount=${gridAttrs.colcount}`,
      })
    }
    console.log(
      `[grid invariant] role=${gridAttrs.role} colcount=${gridAttrs.colcount} rowcount=${gridAttrs.rowcount}`,
    )
  },
})
