/**
 * iter1013 (playwright loop, mode-F = Flicker detection):
 * Kanban view cross-column DnD (card を todo→in_progress に drag) で
 * 「並び順 / 列が一瞬戻る」 flicker を検出。
 *
 * 背景:
 * `useUpdateItemStatus` (hooks.ts:96-120) は onMutate で
 *   `await qc.cancelQueries(...)` を使っているが、await の microtask
 * 境界が setQueryData を次 tick まで遅延させ、ドラッグ確定の一瞬だけ
 * 古い列に card が visible になる flicker が起きる懸念。
 *
 * `useReorderItem` (hooks.ts:167-193) は同問題を 2026-04-30 修正済で
 *   `void qc.cancelQueries(...)` (fire-and-forget) + 非 async onMutate
 *   で setQueryData を synchronously 走らせる。
 *
 * このスクリプトは:
 *  1. Kanban view を表示 → card 1 件を todo 列にいる
 *  2. dragAndDrop で in_progress 列に移動
 *  3. drop 確定の 0 / 50 / 100 / 200 / 500ms 後 に snapshot 取得
 *  4. 中間 snapshot のいずれかで card が todo 列に戻る (= 元位置に
 *     snapback) frame を検出
 *  5. detection 結果に応じて findings に push (修正は別 commit)
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mode-f-kanban-status-flicker-iter1013',
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    // todo 列に 1 件、in_progress 列に 1 件 (target = todo の card を in_progress に移す)
    const a = await admin
      .from('items')
      .insert({
        workspace_id: ws,
        title: 'iter1013 flicker target',
        status: 'todo',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select()
      .single()
    if (a.error || !a.data) throw a.error
    const targetId = a.data.id as string

    const b = await admin.from('items').insert({
      workspace_id: ws,
      title: 'iter1013 flicker context',
      status: 'in_progress',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (b.error) throw b.error

    await page.goto(`http://localhost:3001/${ws}?view=kanban`, { waitUntil: 'networkidle' })
    await page.waitForSelector(`[data-testid="kanban-card-${targetId}"]`, { timeout: 10_000 })

    // Drop target: in_progress column の droppable region
    const sourceCard = `[data-testid="kanban-card-${targetId}"]`
    const destColumn = `[data-droppable-status="in_progress"]`

    // 列構造確認
    const before = await page.evaluate((tid) => {
      const card = document.querySelector(
        `[data-testid="kanban-card-${tid}"]`,
      ) as HTMLElement | null
      if (!card) return null
      const col = card.closest('[data-testid^="kanban-column-"]') as HTMLElement | null
      return { columnTestId: col?.getAttribute('data-testid') ?? null }
    }, targetId)
    console.log(`[before] card column: ${before?.columnTestId ?? 'unknown'}`)

    // Drag and drop with sample snapshots immediately after drop
    const snapshots: Array<{ ms: number; column: string | null }> = []

    // dnd-kit + MouseSensor は activationConstraint distance=5 を要求するため
    // 単一 dragAndDrop では発火しない。明示的に down → 5px move → drop pos に move → up を実行。
    const srcBox = await page.locator(sourceCard).boundingBox()
    const dstBox = await page.locator(destColumn).boundingBox()
    if (!srcBox || !dstBox) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: `bounding box取得失敗 (src=${!!srcBox} dst=${!!dstBox})`,
      })
    } else {
      const sx = srcBox.x + srcBox.width / 2
      const sy = srcBox.y + srcBox.height / 2
      const dx = dstBox.x + dstBox.width / 2
      const dy = dstBox.y + dstBox.height / 2
      await page.mouse.move(sx, sy)
      await page.mouse.down()
      // > 5px move to trigger MouseSensor activationConstraint
      await page.mouse.move(sx + 10, sy + 10, { steps: 5 })
      await page.mouse.move(dx, dy, { steps: 10 })
      await page.mouse.up()
    }

    for (const ms of [0, 50, 100, 200, 500]) {
      if (ms > 0) await page.waitForTimeout(ms)
      const snap = await page.evaluate((tid) => {
        const card = document.querySelector(
          `[data-testid="kanban-card-${tid}"]`,
        ) as HTMLElement | null
        if (!card) return null
        const col = card.closest('[data-testid^="kanban-column-"]') as HTMLElement | null
        return col?.getAttribute('data-testid') ?? null
      }, targetId)
      snapshots.push({ ms, column: snap })
      console.log(`[snap +${ms}ms] card column: ${snap}`)
    }

    // flicker: 0ms snap で in_progress 列に居るのが期待。それ以前 / 中間で todo に戻る frame があれば flicker
    const expectedColumn = 'kanban-column-in_progress'
    const goodEnd =
      snapshots.length > 0 && snapshots[snapshots.length - 1]?.column === expectedColumn
    const flickerFrame = snapshots.find((s) => s.column !== expectedColumn && s.column !== null)
    if (!goodEnd) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `終了 snap で expected column ${expectedColumn} にカードが居ない (DnD 失敗 / status 反映遅延)`,
      })
    }
    if (flickerFrame && goodEnd) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `flicker 検出: +${flickerFrame.ms}ms で column ${flickerFrame.column} (期待 ${expectedColumn} に戻る前 frame)`,
      })
    }

    // first snapshot から最終までの transition を log
    console.log(`[summary] flicker detected: ${flickerFrame ? 'YES' : 'NO'}, good end: ${goodEnd}`)
  },
})
