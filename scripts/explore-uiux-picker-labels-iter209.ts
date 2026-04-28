/**
 * Phase 6.15 loop iter 209 — ItemEditDialog の AssigneePicker / TagPicker に label 関連付け。
 *
 * 旧仕様: 担当者 / タグ の `<Label>` は `htmlFor` 無しで、AssigneePicker /
 * TagPicker の Popover trigger Button (内部で aria-label を持つが) との
 * 関連付けが無かった。SR ユーザは Popover の aria-label のみ読み上げて
 * 「担当者」というセクションコンテキストが伝わらなかった。
 *
 * 改善: 親 div を `role="group"` + `aria-labelledby` で Label の id に紐付け、
 * SR が「担当者 グループ」の context を確立してから Popover button を読む
 * semantic に。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'picker-labels-iter209',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter209: ItemEditDialog の AssigneePicker / TagPicker 親 div を role="group" + aria-labelledby で Label に関連付け',
    })
  },
})
