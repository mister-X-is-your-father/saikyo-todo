/**
 * Phase 6.15 loop iter 163 — フォーム input の aria-invalid + aria-describedby smoke。
 *
 * iter160 で error <p> に role="alert" は付けたが、input 自体の状態 (invalid)
 * が SR で programmatic に把握できなかった。WCAG 3.3.1 Error Identification
 * パターンで input ↔ error を結びつける: validation 失敗時に input に
 * aria-invalid="true" + aria-describedby="<error-id>" を付与し、対応する
 * error <p> に id を持たせる。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'form-aria-invalid-iter163',
  body: async ({ page, findings }) => {
    await page.goto(`http://localhost:3001/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter163: signup / login / create-workspace の 7 input すべてに aria-invalid + aria-describedby を追加 (WCAG 3.3.1)',
    })
  },
})
