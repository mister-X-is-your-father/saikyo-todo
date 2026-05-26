/**
 * playwright-iter1401 (mode-F = Flicker detection): Kanban view で item-checkbox を
 * complete 切替した直後の data-checked を 0/50/100/200/500ms で snapshot し、
 * optimistic update が一瞬戻る (true→false→true) flicker を検出する。
 *
 * useToggleCompleteItem は iter1013 で onMutate 同 frame setQueryData 済 → flicker 無し期待。
 * iter1323 (Backlog) / iter1396 (reorder) に続く mode-F guard、本 iter は Kanban view 担当。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-flicker-kanban-complete-iter1401.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'flicker-kanban-complete-iter1401',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'Kanban 完了切替テスト',
      description: '',
      status: 'todo',
      is_must: false,
      priority: 2,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=kanban`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(2200)

    const cb = page.locator('[data-testid^="item-checkbox-"]').first()
    if ((await cb.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'item-checkbox not found' })
      return
    }
    const before = await cb.getAttribute('data-checked')
    console.log(`[before] data-checked=${before}`)
    await cb.click()

    const snaps: (string | null)[] = []
    for (const ms of [0, 50, 100, 200, 500]) {
      if (ms > 0) await page.waitForTimeout(ms)
      snaps.push(await cb.getAttribute('data-checked').catch(() => 'gone'))
    }
    console.log(`[snaps] ${snaps.join(', ')}`)

    // flicker = 0ms で true になった後、中間 snap が before (false) に逆戻り
    for (let i = 1; i < snaps.length; i++) {
      if (snaps[i] === before && snaps[0] !== before) {
        findings.push({
          level: 'error',
          source: 'observation',
          message: `flicker 検出: ${[0, 50, 100, 200, 500][i]}ms 後に data-checked が ${before} へ逆戻り`,
        })
      }
    }
    console.log(`[result] flicker findings = ${findings.filter((f) => f.level === 'error').length}`)
  },
})
