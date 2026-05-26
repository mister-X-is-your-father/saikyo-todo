/**
 * playwright-iter1396 (mode-F = Flicker detection、ユーザ要望「並び順が一瞬戻る」): Backlog の
 * DnD reorder 直後に row 順序を 0/50/100/200/500ms で snapshot し、中間 frame で元順序に
 * snap-back する flicker を検出する。
 *
 * useReorderItem は iter437 で onMutate 同 frame setQueryData の楽観 update 済 → flicker
 * 無しを期待 (regression guard)。万一 snap-back すれば検出。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-flicker-backlog-reorder-iter1396.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'flicker-backlog-reorder-iter1396',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const base = {
      workspace_id: workspaceId,
      status: 'todo',
      is_must: false,
      description: '',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    }
    await admin.from('items').insert([
      { ...base, title: 'AAA 並べ替え 1', priority: 2 },
      { ...base, title: 'BBB 並べ替え 2', priority: 2 },
      { ...base, title: 'CCC 並べ替え 3', priority: 2 },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(2200)

    const rowSel = '[data-testid^="backlog-row-"]'
    const order = async () =>
      page.locator(rowSel).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))

    const before = await order()
    console.log(`[before] ${before.length} rows: ${before.join(', ')}`)
    if (before.length < 3) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: `rows<3 (${before.length}) — reorder 不可`,
      })
      return
    }

    // 1 行目の drag handle を 3 行目位置まで drag (dnd-kit MouseSensor distance=5)
    const handle = page.locator('[data-testid="backlog-drag-handle"]').first()
    const target = page.locator(rowSel).nth(2)
    const hb = await handle.boundingBox()
    const tb = await target.boundingBox()
    if (!hb || !tb) {
      findings.push({ level: 'info', source: 'observation', message: 'handle/target box 取得失敗' })
      return
    }
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await page.mouse.down()
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 10) // >5px で activate
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 5 })
    await page.mouse.up()

    // 直後から interval で order snapshot
    const snaps: (string | null)[][] = []
    for (const ms of [0, 50, 100, 200, 500]) {
      if (ms > 0) await page.waitForTimeout(ms)
      snaps.push(await order())
    }
    snaps.forEach((s, i) => console.log(`[snap ${[0, 50, 100, 200, 500][i]}ms] ${s.join(', ')}`))

    // flicker = 0ms より後の中間 snap が before (元順序) に逆戻り
    const beforeKey = JSON.stringify(before)
    for (let i = 1; i < snaps.length; i++) {
      if (JSON.stringify(snaps[i]) === beforeKey && JSON.stringify(snaps[0]) !== beforeKey) {
        findings.push({
          level: 'error',
          source: 'observation',
          message: `flicker 検出: ${[0, 50, 100, 200, 500][i]}ms 後に元順序へ snap-back`,
        })
      }
    }
    const finalChanged = JSON.stringify(snaps[snaps.length - 1]) !== beforeKey
    console.log(
      `[result] final order changed from before = ${finalChanged}, flicker findings = ${findings.filter((f) => f.level === 'error').length}`,
    )
  },
})
