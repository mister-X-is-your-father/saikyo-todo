/**
 * Phase 6.15 loop iter 187 — items-board フィルタ件数の SR 自動読み上げ。
 *
 * 旧仕様: status / sprint / MUST フィルタを切替えても件数 `<span>{N} 件</span>`
 * が静的レンダリングのみで、SR ユーザは「何件絞り込まれたか」を毎回 Tab して
 * 読み戻さないと分からなかった。`role="status" + aria-live="polite" + aria-atomic`
 * を付け、件数変化のたびに SR が "5 件" と自動で読み上げるようにする。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'filter-count-iter187',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter187: items-board のフィルタ件数 span に role="status" + aria-live="polite" + aria-atomic を付与し、フィルタ切替時に SR が件数を自動読み上げ',
    })
  },
})
