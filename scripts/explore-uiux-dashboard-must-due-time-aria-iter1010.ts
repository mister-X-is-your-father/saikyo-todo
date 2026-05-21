/**
 * iter1010 (playwright loop, mode-D = Desktop a11y):
 * Dashboard view の MUST Item 一覧 (must-item-row) 内 `<time dateTime>` 要素は
 * 期限日を raw ISO で表示しているが、`aria-label` が未付与で SR には「期限」
 * の semantic context が伝わらない。同 view の他 row 構成 (タイトル button /
 * StatusBadge / 状態語 span = '期限超過' '期日近' 等) に対し、date 列は位置
 * 依存で「これは期限日?更新日?」 が不明確 (今日 / 昨日 / 来週など、視覚的
 * 配色 (red/amber) は SR で消失するため)。
 *
 * 他 view (today-view / personal-period-view / backlog-view 等) の cross-view
 * pattern「`<time dateTime aria-label="期限 ${ISO}">`」 を dashboard MUST list
 * にも適用し、SR 経路で「2026-05-21 (red)」 →「期限 2026-05-21」 に semantic
 * context を補強する。
 *
 * このスクリプトは:
 *  1. 期限日付の MUST item を 1 件 seed → /<wsId>?view=dashboard にアクセス
 *  2. must-item-row 内の <time> 要素 (期限 ISO 表示) に
 *     `aria-label="期限 <ISO>"` が付与されていることを assert
 *  3. visible text として ISO 日付がそのまま読めることを cross-check (regression)
 *  4. parent <span> の visible 状態語 (期日近 / 期限超過) 維持を cross-check
 *  5. iter925 dashboard region invariant (region/aria-labelledby) 維持 cross-check
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'dashboard-must-due-time-aria-iter1010',
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const today = new Date()
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    // 期限が今日 = soon 表示の MUST item を seed
    const dueIso = iso(today)
    const ins = await admin.from('items').insert({
      workspace_id: ws,
      title: 'iter1010 MUST 期限テスト',
      status: 'todo',
      due_date: dueIso,
      is_must: true,
      dod: '完了条件 dummy',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (ins.error) throw ins.error

    await page.goto(`http://localhost:3001/${ws}?view=dashboard`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid^="must-item-row-"]', { timeout: 10_000 })

    // (1) must-item-row 内の <time> 要素に aria-label="期限 <ISO>" 付与確認
    const timeAriaLabels = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid^="must-item-row-"]'))
      return rows.map((row) => {
        const timeEl = row.querySelector('time')
        return {
          dateTime: timeEl?.getAttribute('datetime') ?? null,
          ariaLabel: timeEl?.getAttribute('aria-label') ?? null,
          text: timeEl?.textContent?.trim() ?? null,
        }
      })
    })
    if (timeAriaLabels.length === 0) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: `must-item-row が見つからない (期待: 1)`,
      })
    }
    let withAria = 0
    for (const t of timeAriaLabels) {
      if (!t.ariaLabel) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `<time dateTime=${t.dateTime}> に aria-label 未付与 (visible text: "${t.text}")`,
        })
        continue
      }
      const expected = `期限 ${t.dateTime}`
      if (t.ariaLabel !== expected) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `<time> aria-label 不一致: 期待 "${expected}" 実際 "${t.ariaLabel}"`,
        })
      } else {
        withAria += 1
      }
    }
    console.log(`[must-time aria-label] rows=${timeAriaLabels.length} with-aria=${withAria}`)

    // (2) parent span の status 語 (期日近) も維持 (regression)
    const rowDetails = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid^="must-item-row-"]'))
      return rows.map((row) => row.textContent ?? '')
    })
    const containsStatusWord = rowDetails.some(
      (t) => t.includes('期日近') || t.includes('期限超過') || t.includes('完了'),
    )
    if (!containsStatusWord) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `MUST row に status 語 (期日近 / 期限超過 / 完了) が見当たらない (regression?)`,
      })
    }
    console.log(`[regression] row text snippet: "${rowDetails[0]?.slice(0, 80) ?? ''}"`)

    // (3) iter925-926 dashboard region invariant: MUST 一覧 region に aria-labelledby
    const mustRegion = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('[role="region"]')).find(
        (r) =>
          (r.getAttribute('aria-label') ?? '').includes('MUST Item 一覧') ||
          r.getAttribute('aria-labelledby')?.includes('must'),
      )
      return {
        found: !!el,
        ariaLabelledBy: el?.getAttribute('aria-labelledby') ?? null,
        ariaLabel: el?.getAttribute('aria-label') ?? null,
      }
    })
    if (!mustRegion.found) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `MUST 一覧 region が見当たらない (iter925-926 invariant 壊れ)`,
      })
    }
    console.log(
      `[region invariant] MUST list region aria-labelledby=${mustRegion.ariaLabelledBy} aria-label=${mustRegion.ariaLabel}`,
    )
  },
})
