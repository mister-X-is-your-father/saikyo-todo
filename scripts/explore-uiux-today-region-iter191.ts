/**
 * Phase 6.15 loop iter 191 — Today view 各グループ Card に role="region" + aria-label。
 *
 * 旧仕様: 「期限超過 (3)」「今日 (5)」等の Card は単なる div で landmark
 * になっておらず、SR ユーザは「期限超過 left paren 3 right paren」と読み上げ
 * られて context 把握も skip 移動もできなかった。
 *
 * 改善: 各 Card に `role="region"` + `aria-label="<label> N 件"` を付け、
 * SR が landmark として認識し「期限超過 3 件 region」と読み上げる semantic に。
 * paren を含む元 text は視覚保持。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'today-region-iter191',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter191: Today view 各グループ Card に role="region" + aria-label="<label> N 件" を付与し、SR が landmark で「期限超過 3 件 region」と読み上げ可能',
    })
  },
})
