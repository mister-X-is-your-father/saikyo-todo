/**
 * playwright-iter1325: accessible-name 横断 audit。
 *
 * 主要 route を巡回し、interactive element (button / a / [role=button] /
 * [role=tab] / input[type=checkbox]) が accessible name を持つかを検査する。
 * accessible name = textContent.trim() || aria-label || aria-labelledby参照 ||
 * title || (input なら associated <label>)。
 *
 * WCAG 4.1.2 (Name, Role, Value): icon-only button が aria-label を欠くと
 * SR / voice-control user が認識・操作できない。
 *
 * 探索 script (経路 B)。bug を見つけたら個別 iter で fix し本 script を
 * regression guard 化する。
 */
import { type Finding, runExplore } from './lib/explore-uiux-runner'

const SUBROUTES = [
  '',
  '/templates',
  '/sprints',
  '/goals',
  '/workflows',
  '/integrations',
  '/pdca',
  '/time-entries',
  '/archive',
]

async function auditRoute(
  page: import('@playwright/test').Page,
  route: string,
  findings: Finding[],
) {
  await page.goto(`http://localhost:3001${route}`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(600)
  const offenders = await page
    .evaluate(() => {
      const out: string[] = []
      // 1. interactive without accessible name
      const isel = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"]'
      for (const el of Array.from(document.querySelectorAll(isel)) as HTMLElement[]) {
        const st = window.getComputedStyle(el)
        if (st.display === 'none' || st.visibility === 'hidden') continue
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
        const hasName = !!(
          text ||
          el.getAttribute('aria-label')?.trim() ||
          el.getAttribute('aria-labelledby')?.trim() ||
          el.getAttribute('title')?.trim()
        )
        if (!hasName) {
          const testid = el.getAttribute('data-testid') ?? ''
          out.push(
            `interactive <${el.tagName.toLowerCase()}> testid="${testid}" rect=${Math.round(r.width)}x${Math.round(r.height)}`,
          )
        }
      }
      // 2. form controls without label / accessible name
      for (const el of Array.from(
        document.querySelectorAll('input, textarea, select'),
      ) as HTMLElement[]) {
        const type = (el.getAttribute('type') ?? '').toLowerCase()
        if (type === 'hidden') continue
        const st = window.getComputedStyle(el)
        if (st.display === 'none' || st.visibility === 'hidden') continue
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        const id = el.getAttribute('id')
        const labelFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null
        const wrappingLabel = el.closest('label')
        const hasName = !!(
          el.getAttribute('aria-label')?.trim() ||
          el.getAttribute('aria-labelledby')?.trim() ||
          el.getAttribute('title')?.trim() ||
          labelFor ||
          wrappingLabel ||
          el.getAttribute('placeholder')?.trim()
        )
        if (!hasName) {
          const testid = el.getAttribute('data-testid') ?? ''
          out.push(
            `form-control(${type || el.tagName.toLowerCase()}) testid="${testid}" rect=${Math.round(r.width)}x${Math.round(r.height)}`,
          )
        }
      }
      // 3. img without alt
      for (const el of Array.from(document.querySelectorAll('img')) as HTMLImageElement[]) {
        const st = window.getComputedStyle(el)
        if (st.display === 'none' || st.visibility === 'hidden') continue
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (el.getAttribute('alt') === null)
          out.push(`img-no-alt src=${(el.getAttribute('src') ?? '').slice(0, 40)}`)
      }
      return out
    })
    .catch((e) => [`eval-failed: ${String(e).slice(0, 80)}`])
  console.log(`\n[route ${route}] interactive offenders (no accessible name): ${offenders.length}`)
  for (const o of offenders) console.log(`  - ${o}`)
  for (const o of offenders) {
    findings.push({ level: 'warning', source: 'a11y', message: `${route} no-name: ${o}` })
  }
}

void runExplore({
  name: 'accessible-name-audit-iter1325',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  body: async ({ page, workspaceId, findings }) => {
    for (const sub of SUBROUTES) {
      await auditRoute(page, `/${workspaceId}${sub}`, findings)
    }
  },
})
