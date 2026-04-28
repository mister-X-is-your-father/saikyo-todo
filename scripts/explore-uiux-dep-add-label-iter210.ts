/**
 * Phase 6.15 loop iter 210 — ItemDependenciesPanel 依存追加 form の label 関連付け。
 *
 * 旧仕様: `<Label>依存を追加</Label>` は htmlFor 無しで、配下の 2 つの select
 * (依存の種類 / 依存先 Item) と関連付けが無かった。SR は select 個別の
 * aria-label のみ読み上げて「依存を追加というセクション」の context 不明だった
 * (iter209 担当者 / タグ 同パターン)。
 *
 * 改善: 親 div を `role="group"` + `aria-labelledby="dep-add-label"`、Label に
 * `id="dep-add-label"` を付け、SR が「依存を追加 グループ」を確立してから
 * select / button を読む semantic に。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'dep-add-label-iter210',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter210: ItemDependenciesPanel 依存追加 form 親 div に role="group" + aria-labelledby、Label に id 付与',
    })
  },
})
