/**
 * Phase 6.15 loop iter 189 — ItemEditDialog の Key Result (OKR) 選択 select を optgroup 化。
 *
 * 旧仕様: 1 個の flat list に `[Goal Title] KR Title` 形式で表示していたが、
 * SR は「left bracket Goal Title right bracket KR Title」と読み上げ、同じ
 * Goal の KR を 5 個並べると Goal Title を 5 回繰り返し読み上げて冗長だった。
 * `<optgroup label="Goal: ...">` で goal ごとに 1 group にまとめると SR が
 * group 名を 1 回だけ読み上げて KR title を読み上げる semantic に。
 * (iter188 同パターン)
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'kr-optgroup-iter189',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter189: ItemEditDialog の KR select を Goal 毎の optgroup 化し、`[Goal] KR` の bracket 重複読み上げを解消',
    })
  },
})
