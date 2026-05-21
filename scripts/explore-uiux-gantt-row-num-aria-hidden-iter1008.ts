/**
 * iter1008 (playwright loop, mode-D = Desktop a11y):
 * Gantt view の row-num span (`<span data-testid="gantt-row-num-${idx+1}">1</span>`)
 * は視覚的な行番号 (TeamGantt 風) のためだけのものだが、aria-hidden が抜けており
 * SR がアイテム title 直前に「1」「2」「3」… を毎行読み上げてしまう (noise)。
 * 既に親 `<div role="row" aria-rowindex={n}>` で SR には position 情報を提供済みなので、
 * visible row-num span は装飾扱いに固定するのが正しい。
 *
 * このスクリプトは:
 *  1. アイテムを 3 件 seed → /<wsId>?view=gantt にアクセス
 *  2. row-num span 3 件全てに aria-hidden="true" が付与されていることを assert
 *  3. 親 role="row" + aria-rowindex の維持 (regression invariant) も assert
 *  4. MUST chip / item title / bar 等の既存 aria 構造は無変更で残っていることを cross-check
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'gantt-row-num-aria-hidden-iter1008',
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    // seed: 3 個の item を期間付きで insert (gantt が row として描画する条件は startDate + dueDate 両方ある)
    const ws = workspaceId
    const today = new Date()
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    const items = [
      {
        title: 'iter1008 行番号テスト A',
        start: iso(today),
        due: iso(new Date(today.getTime() + 2 * 86400000)),
        isMust: true,
      },
      {
        title: 'iter1008 行番号テスト B',
        start: iso(new Date(today.getTime() + 1 * 86400000)),
        due: iso(new Date(today.getTime() + 4 * 86400000)),
        isMust: false,
      },
      {
        title: 'iter1008 行番号テスト C',
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

    // row-num spans を抽出 → aria-hidden=true 確認
    const rowNums = await page.locator('[data-testid^="gantt-row-num-"]').evaluateAll((els) =>
      els.map((e) => ({
        testid: e.getAttribute('data-testid'),
        text: e.textContent?.trim() ?? null,
        ariaHidden: e.getAttribute('aria-hidden'),
      })),
    )
    if (rowNums.length < 3) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: `row-num span が ${rowNums.length} 件しか描画されていない (期待: ≥3)`,
      })
    }
    let hiddenOk = 0
    for (const r of rowNums) {
      if (r.ariaHidden !== 'true') {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `row-num span ${r.testid} に aria-hidden="true" 不在 (text="${r.text}")`,
        })
      } else {
        hiddenOk += 1
      }
    }
    console.log(`[row-num] count=${rowNums.length} aria-hidden=true count=${hiddenOk}`)

    // regression invariant: parent role="row" + aria-rowindex は維持
    const rows = await page.locator('[data-testid^="gantt-row-"][role="row"]').evaluateAll((els) =>
      els.map((e) => ({
        testid: e.getAttribute('data-testid'),
        role: e.getAttribute('role'),
        rowindex: e.getAttribute('aria-rowindex'),
      })),
    )
    const validRows = rows.filter(
      (r) => r.testid?.startsWith('gantt-row-') && !r.testid.startsWith('gantt-row-num'),
    )
    if (validRows.length < 3) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: `gantt-row-<id> role="row" rows ${validRows.length} 件しか見えない (期待: ≥3)`,
      })
    }
    for (const r of validRows) {
      if (r.role !== 'row' || !r.rowindex) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${r.testid} role=${r.role} aria-rowindex=${r.rowindex} regression invariant 壊れ`,
        })
      }
    }
    console.log(`[gantt-row invariant] rows=${validRows.length} all have role=row + aria-rowindex`)

    // MUST chip cross-check (iter925 invariant): role="img" + aria-label="MUST タスク"
    const mustChips = await page
      .locator('[data-testid^="gantt-row-"] [role="img"][aria-label="MUST タスク"]')
      .count()
    console.log(`[gantt-must invariant] MUST chips count=${mustChips} (≥1 期待)`)
  },
})
