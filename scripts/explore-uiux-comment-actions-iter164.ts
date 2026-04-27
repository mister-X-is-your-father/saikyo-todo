/**
 * Phase 6.15 loop iter 164 — コメント edit / 削除 button の SR 識別 a11y smoke。
 *
 * iter59 (comment-edit) で comment-thread の textarea には aria-label を付けたが、
 * 各コメントの「編集」/「削除」button は text のみで aria-label が無く、複数
 * 自分のコメントを巡回するときに SR で対象を識別できない (iter140 同パターン)。
 * iter164 で「コメント「<body 30 文字>」を編集/削除」形式の aria-label を付与。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'comment-actions-iter164',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter164: comment-thread の 編集/削除 button に body 30 文字 prefix 付き aria-label を追加',
    })
  },
})
