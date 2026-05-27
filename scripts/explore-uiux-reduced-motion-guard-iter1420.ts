/**
 * playwright-iter1420 (mode-A11y 探索): prefers-reduced-motion: reduce を emulate し、
 * globals.css iter1365 の universal reset (animation/transition-duration ~0) が実効である
 * ことを behavioral 検査。Tailwind v4 / Lightning CSS が universal selector 宣言を drop すると
 * 黙って効かなくなる (CSS コメントの警告) ため、dialog の animate-in / spinner 等で実測 guard。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-reduced-motion-guard-iter1420.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'reduced-motion-guard-iter1420',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'reduced-motion guard item',
      description: '',
      status: 'todo',
      is_must: false,
      priority: 2,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(700)

    const mq = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    console.log('[mq] reduced-motion active =', mq)
    if (!mq)
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'reduced-motion emulate が効いていない (test 環境問題)',
      })

    // dialog を開いて animate-in 要素の duration を測る
    await page.locator('[data-testid^=backlog-title-]').first().click()
    await page.waitForSelector('[data-slot=dialog-content]', { timeout: 8000 })
    await page.waitForTimeout(300)
    const durations = await page.evaluate(() => {
      const el = document.querySelector('[data-slot=dialog-content]')
      if (!el) return null
      const cs = getComputedStyle(el as Element)
      return { anim: cs.animationDuration, trans: cs.transitionDuration }
    })
    console.log('[durations]', JSON.stringify(durations))
    const toMaxMs = (v: string) =>
      Math.max(0, ...v.split(',').map((s) => parseFloat(s) * (s.trim().endsWith('ms') ? 1 : 1000)))
    if (durations) {
      const maxAnim = toMaxMs(durations.anim)
      const maxTrans = toMaxMs(durations.trans)
      console.log(`[parsed] animMs=${maxAnim} transMs=${maxTrans}`)
      if (maxAnim > 5 || maxTrans > 5) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `reduced-motion reset 不発: dialog animation=${durations.anim} transition=${durations.trans} (>5ms)`,
        })
      }
    }
  },
})
