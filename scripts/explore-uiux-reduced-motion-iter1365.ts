/**
 * playwright-iter1365 (mode-D fix verify): prefers-reduced-motion: reduce 時に
 * グローバル motion reset (globals.css) が効いて animation/transition-duration が
 * ほぼ 0 に潰れることを assert する regression guard。
 *
 * iter1365 で globals.css に `@media (prefers-reduced-motion: reduce)` block を追加
 * (WCAG 2.3.3)。本 script は reduced-motion emulation 下で代表 animated 要素の
 * computed style を測り、duration が 0.01ms 相当に潰れていることを確認する。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-reduced-motion-iter1365.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'reduced-motion-iter1365',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: true,
  body: async ({ page, workspaceId, findings }) => {
    // OS の reduced-motion 設定を emulate
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // reduced-motion 下で任意要素に transition / animation を強制適用し duration を測る。
    // globals.css の reset (`transition-duration: 0.01ms !important`) が効けば ~0 になる。
    const { transitionMs, animationMs } = await page.evaluate(() => {
      const el = document.createElement('div')
      el.style.transitionProperty = 'opacity'
      el.style.transitionDuration = '2s'
      el.style.animationName = 'spin'
      el.style.animationDuration = '2s'
      document.body.appendChild(el)
      const cs = getComputedStyle(el)
      const td = cs.transitionDuration
      const ad = cs.animationDuration
      const result = {
        transitionMs: td.endsWith('ms') ? parseFloat(td) : parseFloat(td) * 1000,
        animationMs: ad.endsWith('ms') ? parseFloat(ad) : parseFloat(ad) * 1000,
      }
      el.remove()
      return result
    })
    console.log(
      `[reduced-motion] transitionDuration=${transitionMs}ms animationDuration=${animationMs}ms`,
    )

    if (transitionMs > 1) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `reduced-motion 下で transition-duration=${transitionMs}ms (reset 未適用、期待 ~0.01ms)`,
      })
    }
    if (animationMs > 1) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `reduced-motion 下で animation-duration=${animationMs}ms (reset 未適用、期待 ~0.01ms)`,
      })
    }
  },
})
