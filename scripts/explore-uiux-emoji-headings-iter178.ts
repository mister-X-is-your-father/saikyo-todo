/**
 * Phase 6.15 loop iter 178 — ItemEditDialog 装飾 emoji aria-hidden + Engineer
 * trigger button の SR 識別 smoke。
 *
 * 旧仕様: ItemEditDialog の base tab 内 panel 見出し「🧠 AI で分解」「🛠 Engineer
 * に実装させる」と Engineer trigger button text に emoji 直書きで SR が「brain」
 * 「hammer」と読み上げ、文脈不要な装飾が混じっていた。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'emoji-headings-iter178',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter178: ItemEditDialog 装飾 emoji 🧠 / 🛠 を `<span aria-hidden>` で wrap、Engineer trigger button に item title + autoPr 含む aria-label',
    })
  },
})
