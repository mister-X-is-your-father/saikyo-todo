/**
 * playwright-iter1326: dialog / popover を開いた状態の accessible-name audit。
 *
 * iter1325 の cross-route audit は idle page (dialog 閉) を 9 route 巡回し全 clean
 * だったが、open 状態で初めて render される dynamic element (ItemEditDialog の
 * tab / form / footer、通知 popover、assignee picker popover 内 option) は
 * 未 cover だった。本 script はそれら open 状態を順に開いて 2 軸検査する:
 *   (1) interactive (button / a[href] / [role=button|tab|menuitem|option]) の
 *       accessible name (textContent || aria-label || aria-labelledby || title)
 *   (2) form control (input / textarea / select、checkbox/radio 除く) の
 *       名前付け (label[for] || 包む label || aria-label || aria-labelledby ||
 *       title || placeholder)
 * WCAG 4.1.2 (Name, Role, Value)。
 *
 * 探索 script (経路 B)。bug を見つけたら個別 iter で fix し本 script を
 * regression guard 化する。
 */
import { type Finding, runExplore } from './lib/explore-uiux-runner'

async function auditOpenSurface(
  page: import('@playwright/test').Page,
  label: string,
  findings: Finding[],
) {
  const offenders = await page
    .evaluate(() => {
      const out: string[] = []
      const isel =
        'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="option"]'
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
          out.push(`interactive <${el.tagName.toLowerCase()}> testid="${testid}"`)
        }
      }
      for (const el of Array.from(
        document.querySelectorAll('input, textarea, select'),
      ) as HTMLElement[]) {
        const type = (el.getAttribute('type') ?? '').toLowerCase()
        if (type === 'hidden' || type === 'checkbox' || type === 'radio') continue
        const st = window.getComputedStyle(el)
        if (st.display === 'none' || st.visibility === 'hidden') continue
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        const id = el.getAttribute('id')
        const labelFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null
        const hasName = !!(
          el.getAttribute('aria-label')?.trim() ||
          el.getAttribute('aria-labelledby')?.trim() ||
          el.getAttribute('title')?.trim() ||
          labelFor ||
          el.closest('label') ||
          el.getAttribute('placeholder')?.trim()
        )
        if (!hasName) {
          const testid = el.getAttribute('data-testid') ?? ''
          out.push(`form-control(${type || el.tagName.toLowerCase()}) testid="${testid}"`)
        }
      }
      return out
    })
    .catch((e) => [`eval-failed: ${String(e).slice(0, 80)}`])
  console.log(`\n[surface ${label}] offenders (no accessible name): ${offenders.length}`)
  for (const o of offenders) console.log(`  - ${o}`)
  for (const o of offenders) {
    findings.push({ level: 'warning', source: 'a11y', message: `${label} no-name: ${o}` })
  }
}

void runExplore({
  name: 'dialog-state-accessible-name-iter1326',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const today = new Date().toISOString().slice(0, 10)
    const r = await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'dialog audit item',
      status: 'todo',
      is_must: false,
      due_date: today,
      scheduled_for: today,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (r.error) throw r.error
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    // 1. ItemEditDialog (item title click → ?item= で開く)
    await page.locator('[data-testid^="today-title-"]').first().click()
    await page.waitForTimeout(700)
    await auditOpenSurface(page, 'ItemEditDialog', findings)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    // 2. 通知 popover
    await page.locator('[data-testid="notification-bell"]').click()
    await page.waitForTimeout(500)
    await auditOpenSurface(page, 'NotificationPanel', findings)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  },
})
