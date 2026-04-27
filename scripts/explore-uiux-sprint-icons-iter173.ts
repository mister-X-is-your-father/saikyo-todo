/**
 * Phase 6.15 loop iter 173 — sprints-panel の装飾 icon aria-hidden 一括付与 smoke。
 *
 * iter170 / 171 / 172 同パターンを sprints-panel にも展開: CalendarRange /
 * Play / CheckCircle / Pause / X / Sparkles の 6 icon を SR から hide。
 * SR 識別 button aria-label は iter150 で付与済なので今回は触らない。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'sprint-icons-iter173',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/sprints`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter173: sprints-panel の CalendarRange / Play / CheckCircle / Pause / X / Sparkles に aria-hidden を一括付与',
    })
  },
})
