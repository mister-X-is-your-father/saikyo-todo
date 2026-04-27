/**
 * Phase 6.15 loop iter 172 — goals-panel の装飾 icon aria-hidden + AI 分解
 * button の SR 識別 smoke。
 *
 * iter170 / 171 同パターンを goals-panel にも展開: ChevronDown / ChevronRight /
 * Sparkles / Plus icon に aria-hidden、AI 分解 button に Goal name 含む aria-label。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'goals-icons-iter172',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/goals`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter172: goals-panel の ChevronDown/Right/Sparkles/Plus に aria-hidden、AI 分解 button に Goal name 含む aria-label',
    })
  },
})
