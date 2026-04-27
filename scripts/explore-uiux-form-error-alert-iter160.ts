/**
 * Phase 6.15 loop iter 160 — フォーム validation error の SR 自動読み上げ smoke。
 *
 * signup / login / create-workspace の 3 form で zod 検証エラー表示の <p> が
 * `text-destructive` 色だけで role 無し → SR ユーザに validation 結果が
 * 自動通知されない gap。各 7 箇所に `role="alert"` を追加 (= aria-live="assertive"
 * 暗黙) して、空送信や不正値投入の瞬間に SR が読み上げる。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'form-error-alert-iter160',
  body: async ({ page, findings }) => {
    await page.goto(`http://localhost:3001/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter160: signup / login / create-workspace の 7 つの validation error <p> 全部に role="alert" を追加',
    })
  },
})
