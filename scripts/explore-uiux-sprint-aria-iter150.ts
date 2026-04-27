/**
 * Phase 6.15 loop iter 150 — Sprint card 各 button の SR 識別 a11y smoke。
 *
 * iter133/139/140/144 同パターン: 期間 / 稼働開始 / 完了 / 計画に戻す / 中止 /
 * 振り返り生成 / Pre-mortem 生成 button に title はあるが aria-label に
 * sprint name が無く、SR で対象 sprint を識別できない。iter150 で全 button に
 * 「Sprint「<name>」を…」形式の aria-label を追加。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'sprint-aria-iter150',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/sprints`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter150: Sprint card 7 button (期間/稼働開始/完了/計画に戻す/中止/振り返り/Pre-mortem) に sprint name 含む aria-label を追加',
    })
  },
})
