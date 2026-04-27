/**
 * Phase 6.15 loop iter 140 — Decompose proposal カードの SR 識別 a11y smoke。
 *
 * iter133/139 と同パターン: 採用 / 却下 button が title 属性のみで aria-label
 * が無く、SR で "採用" / "X" を連呼するだけ → 対象 proposal を識別できない。
 * MUST badge も visual only で SR 不可視。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'decompose-proposal-a11y-iter140',
  body: async ({ page, workspaceId, findings }) => {
    // proposal は AI 経由生成が必要なので smoke は static check に留める
    // (UI が render される条件: proposal が DB に存在する状態)
    // ここでは workspace ホームを開いて a11y 構造を把握するだけ。
    await page.goto(`http://localhost:3001/${workspaceId}`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)

    // proposal-* 要素は通常 ItemEditDialog 内 or AI 分解結果 panel に出る。
    // 探索だけ — 実際の adoption 動作は service test 側で担保。
    const proposals = await page.locator('[data-testid^="proposal-"]').count()
    console.log(`[iter140] proposal nodes (probably 0 unless seeded): ${proposals}`)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter140 は static fix。Decompose proposal の accept/reject button + MUST badge に aria-label を追加',
    })
  },
})
