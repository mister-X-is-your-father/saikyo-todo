/**
 * Phase 6.15 loop iter 181 — 追加分解 / やり直し button の SR 識別 a11y smoke。
 *
 * iter180 で 全て採用 / 全て却下 / 中止 / icon を整えたが、追加分解 / やり直し
 * button が text のみで件数を含んだ動作 context が SR に伝わらない gap。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'redecompose-iter181',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter181: 追加分解 button に「既存の保留中 N 件を残して追加で AI 分解 / AI 分解を再実行」、やり直し button に「保留中の N 件を全て却下してから AI 分解をやり直し」を動的 aria-label として付与',
    })
  },
})
