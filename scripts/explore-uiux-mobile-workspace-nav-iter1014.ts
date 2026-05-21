/**
 * iter1014 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で workspace home の nav links (Goals / Sprints / PDCA /
 * Templates / Workflows / API 連携 / Time Entries / Archive / 一覧) の overflow audit。
 *
 * 構造 (page.tsx):
 *   <header ...>
 *     <h1>{title}</h1>
 *     <Badge>{role}</Badge>
 *     <p>{email}</p>
 *   ...
 *   <div role="group">
 *     <HeartbeatButton />
 *     <nav className="flex flex-wrap items-center gap-2" aria-label="ワークスペース内 ...">
 *       <Button asChild><Link>Goals</Link></Button>
 *       ... 8 more buttons ...
 *     </nav>
 *     <NotificationBell /> <NotificationPreferencesButton /> <ThemeToggle />
 *   </div>
 *
 * `flex-wrap` は付与済 (workspace home page.tsx line 64) なので wrap は効くはず。
 * audit したいのは:
 *  1. 320px viewport で nav が overflow なく wrap している
 *  2. 各 nav button が 44x44 tap target
 *  3. utility group (NotificationBell / Settings / Theme) も同 row で wrap 可
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-workspace-nav-iter1014',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, findings }) => {
    const ws = workspaceId
    await page.goto(`http://localhost:3001/${ws}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('nav[aria-label^="ワークスペース内"]', { timeout: 10_000 })

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    if (docW > viewW + 4) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `documentElement.scrollWidth=${docW}px > viewport ${viewW}px (横スクロール = layout 潰れ)`,
      })
    }

    // nav 内の 9 link を各々 audit
    const navLinks = await page
      .locator('nav[aria-label^="ワークスペース内"] a')
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect()
          return {
            text: el.textContent?.trim() ?? '',
            href: el.getAttribute('href') ?? '',
            w: Math.round(r.width),
            h: Math.round(r.height),
            right: Math.round(r.right),
            top: Math.round(r.top),
            ariaLabel: el.getAttribute('aria-label'),
          }
        }),
      )
    console.log(`[nav-links] count=${navLinks.length}`)
    let below44 = 0
    let overflowed = 0
    const rows = new Map<number, string[]>()
    for (const link of navLinks) {
      console.log(`  - "${link.text}": ${link.w}x${link.h} top=${link.top} right=${link.right}`)
      if (link.h < 44 || link.w < 44) {
        below44 += 1
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `nav link "${link.text}" ${link.w}x${link.h} < 44x44 (tap target 不足)`,
        })
      }
      if (link.right > viewW + 4) {
        overflowed += 1
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `nav link "${link.text}" right=${link.right}px > viewport ${viewW}px (overflow)`,
        })
      }
      const row = rows.get(link.top) ?? []
      row.push(link.text)
      rows.set(link.top, row)
    }
    console.log(`[wrap] ${rows.size} rows (= flex-wrap 行数)`)
    for (const [top, names] of [...rows.entries()].sort(([a], [b]) => a - b)) {
      console.log(`  row@${top}: ${names.join(' / ')}`)
    }

    // utility (NotificationBell / NotificationPreferences / ThemeToggle) も audit
    const utilities = await page
      .locator(
        'button[data-testid="notification-bell"], button[data-testid="notification-preferences"], button[data-testid="theme-toggle"]',
      )
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect()
          return {
            testid: el.getAttribute('data-testid'),
            w: Math.round(r.width),
            h: Math.round(r.height),
            top: Math.round(r.top),
          }
        }),
      )
    console.log(`[utilities] count=${utilities.length}`)
    for (const u of utilities) {
      console.log(`  ${u.testid}: ${u.w}x${u.h} top=${u.top}`)
      if (u.h < 44 || u.w < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `utility ${u.testid} ${u.w}x${u.h} < 44x44 (tap target 不足)`,
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-workspace-nav-iter1014.png', fullPage: true })
  },
})
