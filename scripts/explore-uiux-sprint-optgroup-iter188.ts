/**
 * Phase 6.15 loop iter 188 — ItemEditDialog の Sprint 選択 select を optgroup 化。
 *
 * 旧仕様: active な Sprint だけ option text 先頭に `★ ` を入れて区別していたが、
 * SR は「black star, My Sprint」のように読み上げ意味不明だった。
 * `<optgroup label="稼働中">` / `<optgroup label="計画中">` で 2 group に分け、
 * SR が group 名 (status) を先に読み上げて context を確立する semantic に。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'sprint-optgroup-iter188',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter188: ItemEditDialog の Sprint select を optgroup ("稼働中" / "計画中") 化し、★ 文字 (SR が "black star" と読み上げ) を撤廃',
    })
  },
})
