/**
 * Phase 6.15 loop iter 186 — Today empty state 🎉 と QuickAdd preview 🧠 の SR 漏れ補正。
 *
 * iter178 で ItemEditDialog の emoji を aria-hidden 化したが、Today view の
 * 「今日のタスクはありません 🎉」と QuickAdd preview chip の「🧠 AI 分解」が
 * 残っていた。SR が "party popper" / "brain" と読み上げて意味不明なため、
 * `<span aria-hidden="true">` で wrap し title 側 / 文字列側のみ読み上げ。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'emoji-a11y-iter186',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter186: Today empty state 🎉 を icon prop に分離 (aria-hidden)、QuickAdd 🧠 を aria-hidden span で wrap',
    })
  },
})
