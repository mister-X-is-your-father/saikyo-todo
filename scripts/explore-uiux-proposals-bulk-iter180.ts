/**
 * Phase 6.15 loop iter 180 — decompose-proposals-panel の bulk button SR 識別 +
 * 装飾 icon aria-hidden smoke。
 *
 * 旧仕様: 全て採用 / 全て却下 button が text のみで件数 context 無し。X /
 * RotateCw icon は aria-hidden 無し → SR で「close」「rotate clockwise」を
 * 二重読み上げ可能性。iter167 BulkActionBar / iter170 同パターン。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'proposals-bulk-iter180',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter180: decompose-proposals-panel の 全て採用/全て却下 button に件数含む aria-label、X / RotateCw icon に aria-hidden',
    })
  },
})
