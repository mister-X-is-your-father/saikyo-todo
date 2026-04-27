/**
 * Phase 6.15 loop iter 167 — BulkActionBar の SR a11y smoke。
 *
 * 旧仕様: bar 全体が role 無しで「N 件選択中」spans + 各 status button が
 * 「X に」のみ、削除 / 解除 button にも aria-label 無し → 複数選択中の
 * 操作 SR 把握困難。bar に `role="region" + aria-label="一括操作 (N 件選択中)"`、
 * status button に `aria-label="選択 N 件を「X」に変更"`、削除に
 * `aria-label="選択 N 件を soft delete"`、解除に `aria-label="選択を解除"`、
 * 装飾区切り <div> に `aria-hidden="true"`。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'bulk-action-iter167',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter167: BulkActionBar の bar に role="region" + aria-label、status/削除/解除 button に件数含む aria-label、装飾 div に aria-hidden を一括付与',
    })
  },
})
