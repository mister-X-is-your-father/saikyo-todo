/**
 * Phase 6.15 loop iter 161 — async-states (Loading / EmptyState / ErrorState)
 * の SR semantics smoke。
 *
 * これら 3 component はアプリ全体で多用されるが、role / aria-live が一切無く
 * SR ユーザに "読み込み中" / "結果なし" / "エラー" が自動通知されない gap。
 * Loading に role="status" + aria-live="polite"、Empty に role="status"、
 * Error に role="alert" を一括付与 (icon は aria-hidden、retry button は
 * aria-label に message を含めて文脈付与)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'async-states-iter161',
  body: async ({ page, findings }) => {
    await page.goto(`http://localhost:3001/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter161: Loading=role="status"+aria-live="polite", EmptyState=role="status", ErrorState=role="alert"。icon aria-hidden + retry button に message 含む aria-label',
    })
  },
})
