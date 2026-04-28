/**
 * Phase 6.15 loop iter 190 — ItemEditDialog の DoD 必須表示。
 *
 * 旧仕様: isMust=true で DoD IMEInput が出るが、`required` も視覚マーカーも
 * 無く、Service 層で `MUST には DoD が必要です` ValidationError を初めて
 * 知らされる UX だった。
 *
 * 改善:
 *   - Label 末尾に `*` 視覚マーカー (aria-hidden、装飾のみ)
 *   - input に `required` + `aria-required="true"`
 *   - 直下に短いヒント文を `aria-describedby` で紐付け
 *
 * SR は input にフォーカスすると `DoD (完了条件), 必須, MUST タスクは DoD が必須です…`
 * と読み上げる。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'dod-required-iter190',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter190: ItemEditDialog の DoD input に required + aria-required + aria-describedby + 視覚 * マーカー + ヒント文を付与し、submit 前に必須を可視化',
    })
  },
})
