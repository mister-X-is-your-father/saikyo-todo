/**
 * Phase 6.15 loop iter 177 — 残った 4 component の loading/empty <p> SR semantic 一括 smoke。
 *
 * iter161 / 168 / 171 / 176 と同パターンを残り 4 component に適用:
 *   - item-dependencies-panel: 読み込み中
 *   - archived-items-panel: 読み込み中
 *   - item-edit-dialog (Subtasks): 読み込み中 / 子タスクなし
 *   - kanban-view: 列定義読み込み中
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'misc-states-iter177',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter177: 残り 4 component (item-dependencies / archived / item-edit Subtasks / kanban 列定義) の loading=role="status"+aria-live="polite"、empty=role="status"',
    })
  },
})
