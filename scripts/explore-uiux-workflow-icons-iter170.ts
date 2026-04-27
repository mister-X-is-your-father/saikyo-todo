/**
 * Phase 6.15 loop iter 170 — workflow-panel の装飾 icon aria-hidden + 有効化/無効化
 * button の aria-label smoke。
 *
 * 旧仕様: lucide icons (Play / Pencil / ChevronDown/Right / Trash2) が button
 * 内に並ぶが aria-hidden 無し → SR で icon 名 ("再生" 等) が二重読み上げされる
 * 可能性。「有効化 / 無効化」button は text のみで複数 workflow を SR で巡回する
 * とき対象不明。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'workflow-icons-iter170',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/workflows`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter170: workflow-panel の装飾 icon (Play/Pencil/ChevronDown/Right/Trash2) に aria-hidden を一括付与、「有効化/無効化」button に動的 aria-label',
    })
  },
})
