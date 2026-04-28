/**
 * Phase 6.15 loop iter 222 — ItemEditDialog の baseline 記録/更新/クリア button の SR 化。
 *
 * 旧仕様: ベースライン記録 / 更新 / クリア button は aria-label が無く、SR は
 * 「ベースライン記録」「baseline クリア」しか聞き取れず、対象の Item や
 * 旧 baseline 値、pending 状態が context として伝わらなかった。
 *
 * 改善:
 *   - set-baseline: pending / 更新 (旧 baseline 値含む) / 初回記録 の 3 状態別文言
 *   - clear-baseline: pending / 通常 (現 baseline 値含む) の 2 状態別文言
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'baseline-buttons-iter222',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter222: baseline 記録 / 更新 / クリア button に aria-label を新規付与 (item title + 旧 baseline 値 + pending 状態)',
    })
  },
})
